/**
The MIT License (MIT)

Copyright (c) 2013-2015 Daniel Goberitz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD.
        define([], factory);
    } else {
        // Browser globals
        root.isolatedRunner = factory();
    }
}(this, function () {/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../libs/almond/almond", function(){});

/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('route',[], function(){

	'use strict';

	function s(){
		return window.location.search.toString();
	}

	var route = {

		getCurrentSpecFile: function(){
			var m = s().match(/[?&]specFile=([^&]*)/);
			return (m !== null && !!m[1]) ? decodeURIComponent(m[1]) : false;
		},

		getURLForSpec: function(specFile){
			var l = window.location;
			return l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + l.pathname +
				'?specFile=' + encodeURIComponent(specFile)
			;
		},

		isWholeSuite: function(){
			return s().match(/[?&]whole/) !== null;
		},

		isAlone: function(){
			return s().match(/[?&]specFile=/) !== null;
		},

		isAutoStart: function(){
			return (undefined !== window.ISOLATED_AUTOSTART) ?
				window.ISOLATED_AUTOSTART :
				s().match(/[?&]autostart=false/) === null
			;
		}
	};

	return route;
});
/* jshint ignore:start */
define('jasmine-html-isolated',[], function() {

	var HtmlReporterHelpers = {};

	HtmlReporterHelpers.createDom = function(type, attrs, childrenVarArgs) {
		var el = document.createElement(type);

		for (var i = 2; i < arguments.length; i++) {
			var child = arguments[i];

			if (typeof child === 'string') {
				el.appendChild(document.createTextNode(child));
			} else {
				if (child) {
					el.appendChild(child);
				}
			}
		}

		for (var attr in attrs) {
			if (attr == "className") {
				el[attr] = attrs[attr];
			} else {
				el.setAttribute(attr, attrs[attr]);
			}
		}

		return el;
	};

	HtmlReporterHelpers.getSpecStatus = function(child) {
		var results = child.results();
		var status = results.passed() ? 'passed' : 'failed';
		if(results.totalCount === 0 &&
			results.passedCount === 0 &&
			results.failedCount === 0)
		{
			status = 'empty';
		}
		if (!!child.skipped) {
			status = 'skipped';
		}

		return status;
	};

	HtmlReporterHelpers.appendToSummary = function(child, childElement) {
		var parentDiv = this.dom.summary;
		var parentSuite = (typeof child.parentSuite == 'undefined') ? 'suite' : 'parentSuite';
		var parent = child[parentSuite];

		if (parent) {

			if (typeof this.views.suites[parent.id] == 'undefined') {
				this.views.suites[parent.id] = new HtmlReporter.SuiteView(parent, this.dom, this.views);
			}
			parentDiv = this.views.suites[parent.id].element;

		} else if(child.getSpecFile && !child.isFile) {

			var specFile = child.getSpecFile();
			if (typeof this.views.files[specFile] == 'undefined') {
				this.views.files[specFile] = new HtmlReporter.SuiteView(
					{
						isFile: true,
						description: specFile,
						getSpecFile: function(){ return specFile;},
						parentSuite: null
					},
					this.dom,
					this.views
				);
			}
			parentDiv = this.views.files[specFile].element;

		}

		parentDiv.appendChild(childElement);
	};


	HtmlReporterHelpers.addHelpers = function(ctor) {
		for (var fn in HtmlReporterHelpers) {
			ctor.prototype[fn] = HtmlReporterHelpers[fn];
		}
	};

	var HtmlReporter = function(_doc) {
		var self = this;
		var doc = _doc || window.document;

		var reporterView;

		var dom = {};

		// Jasmine Reporter Public Interface
		self.logRunningSpecs = false;

		self.reportRunnerStarting = function(runner, timeStart) {
			var o = document.getElementById('HTMLReporter');
			if(!!o){
				o.parentNode.removeChild(o);
			}
			var specs = runner.specs() || [];

			if (specs.length == 0) {
				return;
			}

			createReporterDom(runner.env.versionString());
			if(!this.toBody){
				document.getElementById('isolated-test-workarea').appendChild(dom.reporter);
			} else {
				doc.body.appendChild(dom.reporter);
			}
			setExceptionHandling();

			reporterView = new HtmlReporter.ReporterView(dom, timeStart);
			reporterView.addSpecs(specs, self.specFilter);
		};

		self.reportRunnerResults = function(runner) {
			reporterView && reporterView.complete();
		};

		self.reportSuiteResults = function(suite) {
			reporterView.suiteComplete(suite);
		};

		self.reportSpecStarting = function(spec) {
		};

		self.reportSpecResults = function(spec) {
			reporterView.specComplete(spec);
		};

		self.log = function() {
			var console = jasmine.getGlobal().console;
			if (console && console.log) {
				if (console.log.apply) {
					console.log.apply(console, arguments);
				} else {
					console.log(arguments); // ie fix: console.log.apply doesn't exist on ie
				}
			}
		};

		self.specFilter = function(spec) {
		/*	if (!focusedSpecName()) {
				return true;
			}

			return spec.getFullName().indexOf(focusedSpecName()) === 0;*/
			return false;
		};

		return self;

		function focusedSpecName() {
			var specName;

			(function memoizeFocusedSpec() {
				if (specName) {
					return;
				}

				var paramMap = [];
				var params = HtmlReporter.parameters(doc);

				for (var i = 0; i < params.length; i++) {
					var p = params[i].split('=');
					paramMap[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
				}

				specName = paramMap.spec;
			})();

			return specName;
		}

		function createReporterDom(version) {
			dom.reporter = self.createDom('div', {id: 'HTMLReporter', className: 'jasmine_reporter'},
			dom.banner = self.createDom('div', {className: 'banner'},
			self.createDom('span', {className: 'title'}, "Jasmine "),
					self.createDom('span', {className: 'version'}, version)),
					dom.symbolSummary = self.createDom('ul', {className: 'symbolSummary'}),
			dom.alert = self.createDom('div', {className: 'alert'},
			self.createDom('span', {className: 'exceptions'},
			self.createDom('label', {className: 'label', 'for': 'no_try_catch'}, 'No try/catch'),
					self.createDom('input', {id: 'no_try_catch', type: 'checkbox'}))),
					dom.results = self.createDom('div', {className: 'results'},
					dom.summary = self.createDom('div', {className: 'summary'}),
					dom.details = self.createDom('div', {id: 'details'}))
					);
		}

		function noTryCatch() {
			return window.location.search.match(/catch=false/);
		}

		function searchWithCatch() {
			var params = HtmlReporter.parameters(window.document);
			var removed = false;
			var i = 0;

			while (!removed && i < params.length) {
				if (params[i].match(/catch=/)) {
					params.splice(i, 1);
					removed = true;
				}
				i++;
			}
			if (jasmine.CATCH_EXCEPTIONS) {
				params.push("catch=false");
			}

			return params.join("&");
		}

		function setExceptionHandling() {
			var chxCatch = document.getElementById('no_try_catch');

			if (noTryCatch()) {
				chxCatch.setAttribute('checked', true);
				jasmine.CATCH_EXCEPTIONS = false;
			}
			chxCatch.onclick = function() {
				window.location.search = searchWithCatch();
			};
		}
	};
	HtmlReporter.parameters = function(doc) {
		var paramStr = doc.location.search.substring(1);
		var params = [];

		if (paramStr.length > 0) {
			params = paramStr.split('&');
		}
		return params;
	}
	HtmlReporter.sectionLink = function(sectionName) {
		var link = '?';
		var params = [];

		if (sectionName) {
			params.push('spec=' + encodeURIComponent(sectionName));
		}
		if (!jasmine.CATCH_EXCEPTIONS) {
			params.push("catch=false");
		}
		if (params.length > 0) {
			link += params.join("&");
		}

		return link;
	};
	HtmlReporter.specLink = function(spec) {
		var link = '?';
		var params = [];
		var sectionName = spec.getFullName();

		if(!!spec.getSpecFile){
			params.push('specFile=' + encodeURIComponent(spec.getSpecFile()));
		}

		if (!jasmine.CATCH_EXCEPTIONS) {
			params.push("catch=false");
		}
		if (params.length > 0) {
			link += params.join("&");
		}

		return link;
	};
	HtmlReporterHelpers.addHelpers(HtmlReporter);
	HtmlReporter.ReporterView = function(dom, timeStart) {
		this.startedAt = !!timeStart ? timeStart : new Date();
		this.runningSpecCount = 0;
		this.completeSpecCount = 0;
		this.passedCount = 0;
		this.failedCount = 0;
		this.skippedCount = 0;

		this.createResultsMenu = function() {
			this.resultsMenu = this.createDom('span', {className: 'resultsMenu bar'},
			this.summaryMenuItem = this.createDom('a', {className: 'summaryMenuItem', href: "#"}, '0 specs'),
					' | ',
					this.detailsMenuItem = this.createDom('span', {className: 'detailsMenuItem', href: "#"}, '0 failing'));

			this.summaryMenuItem.onclick = function() {
				dom.reporter.className = dom.reporter.className.replace(/ showDetails/g, '');
			};

			this.detailsMenuItem.onclick = function() {
				showDetails();
			};
		};

		this.addSpecs = function(specs, specFilter) {
			this.totalSpecCount = specs.length;

			this.views = {
				specs: {},
				suites: {},
				files: {}
			};

			for (var i = 0; i < specs.length; i++) {
				var spec = specs[i];
				if(!this.views.specs[spec.id]){
					this.views.specs[spec.id] = new HtmlReporter.SpecView(spec, dom, this.views);
				}
				if (specFilter(spec)) {
					// this.runningSpecCount++;
				}
			}
		};

		this.specComplete = function(spec) {
			this.completeSpecCount++;

			var specView;
			if (isUndefined(this.views.specs[spec.id])) {
				specView = this.views.specs[spec.id] = new HtmlReporter.SpecView(spec, dom);
			} else {
				specView = this.views.specs[spec.id];
				specView.setSpec(spec);
			}

			switch (specView.status()) {
				case 'passed':
					this.passedCount++;
					this.runningSpecCount++;
					break;

				case 'failed':
					this.failedCount++;
					this.runningSpecCount++;
					break;

				case 'empty':
				case 'skipped':
					this.skippedCount++;
					break;
			}

			specView.refresh();
			this.refresh();
		};

		this.suiteComplete = function(suite) {
			var suiteView = this.views.suites[suite.id];
			if (isUndefined(suiteView)) {
				return;
			}
			suiteView.refresh();
		};

		this.refresh = function() {

			if (isUndefined(this.resultsMenu)) {
				this.createResultsMenu();
			}

			// currently running UI
			if (isUndefined(this.runningAlert)) {
				this.runningAlert = this.createDom('a', {href: HtmlReporter.sectionLink(), className: "runningAlert bar"});
				dom.alert.appendChild(this.runningAlert);
			}
			this.runningAlert.innerHTML = "Running " + this.completeSpecCount + " of " + specPluralizedFor(this.totalSpecCount);

			// skipped specs UI
			if (isUndefined(this.skippedAlert)) {
				this.skippedAlert = this.createDom('span', {href: HtmlReporter.sectionLink(), className: "skippedAlert bar"});
			}

			this.skippedAlert.innerHTML = "Skipping " + this.skippedCount + " of " + specPluralizedFor(this.totalSpecCount) + " - run all";

			if (this.skippedCount === 1 && isDefined(dom.alert)) {
				dom.alert.appendChild(this.skippedAlert);
			}

			// passing specs UI
			if (isUndefined(this.passedAlert)) {
				this.passedAlert = this.createDom('span', {href: HtmlReporter.sectionLink(), className: "passingAlert bar"});
			}
			this.passedAlert.innerHTML = "Passing " + specPluralizedFor(this.passedCount);

			// failing specs UI
			if (isUndefined(this.failedAlert)) {
				this.failedAlert = this.createDom('span', {href: "?", className: "failingAlert bar"});
			}
			this.failedAlert.innerHTML = "Failing " + specPluralizedFor(this.failedCount);

			if (this.failedCount === 1 && isDefined(dom.alert)) {
				dom.alert.appendChild(this.failedAlert);
				dom.alert.appendChild(this.resultsMenu);
			}

			// summary info
			this.summaryMenuItem.innerHTML = "" + specPluralizedFor(this.runningSpecCount);
			this.detailsMenuItem.innerHTML = "" + this.failedCount + " failing";
		};

		this.complete = function() {
			dom.alert.removeChild(this.runningAlert);

			this.skippedAlert.innerHTML = "Skipped " + this.skippedCount + " of " + specPluralizedFor(this.totalSpecCount) + " - run all";

			if (this.failedCount === 0) {
				dom.alert.appendChild(this.createDom('span', {className: 'passingAlert bar'}, "Passing " + specPluralizedFor(this.passedCount)));
			} else {
				showDetails();
			}

			dom.banner.appendChild(this.createDom('span', {className: 'duration'}, "finished in " + ((new Date().getTime() - this.startedAt.getTime()) / 1000) + "s"));
		};

		return this;

		function showDetails() {
			if (dom.reporter.className.search(/showDetails/) === -1) {
				dom.reporter.className += " showDetails";
			}
		}

		function isUndefined(obj) {
			return typeof obj === 'undefined';
		}

		function isDefined(obj) {
			return !isUndefined(obj);
		}

		function specPluralizedFor(count) {
			var str = count + " spec";
			if (count > 1) {
				str += "s"
			}
			return str;
		}

	};

	HtmlReporterHelpers.addHelpers(HtmlReporter.ReporterView);


	HtmlReporter.SpecView = function(spec, dom, views) {
		this.setSpec(spec);
		this.dom = dom;
		this.views = views;

		this.symbol = this.createDom('li', {className: 'pending'});
		var a = this.createDom('a', {});
		this.symbol.appendChild(a);
		a.href = '#spec_' + spec.id;
		this.dom.symbolSummary.appendChild(this.symbol);

		this.summary = this.createDom('div', {className: 'specSummary'},
		this.createDom('a', {
			className: 'description',
			target: '_blank',
			href: HtmlReporter.specLink(this.spec),
			title: this.spec.getFullName()
		}, this.spec.description)
				);

		this.summary.id = 'spec_' + spec.id;

		this.detail = this.createDom('div', {className: 'specDetail'},
		this.createDom('a', {
			className: 'description',
			target: '_blank',
			href: (!!this.spec.getSpecFile ? '?specFile=' + encodeURIComponent(this.spec.getSpecFile()) : ''),
			title: this.spec.getFullName()
		}, this.spec.getFullName())
				);

		var me = this;
		a.onclick = function(){
			var c = me.summary.className;
			me.summary.className += ' highlighted';
			setTimeout(function(){
				me.summary.className = c;
			}, 4000);
		};

	};

	HtmlReporter.SpecView.prototype.setSpec = function(spec) {
		this.spec = spec;
	};

	HtmlReporter.SpecView.prototype.status = function() {
		return this.getSpecStatus(this.spec);
	};

	HtmlReporter.SpecView.prototype.refresh = function() {
		this.symbol.className = this.status();

		switch (this.status()) {
			case 'empty':
				this.appendSummaryToSuiteDiv();
			break;
			case 'skipped':
				this.appendSummaryToSuiteDiv();
				break;

			case 'passed':
				this.appendSummaryToSuiteDiv();
				break;

			case 'failed':
				this.appendSummaryToSuiteDiv();
				this.appendFailureDetail();
				break;
		}
	};

	HtmlReporter.SpecView.prototype.appendSummaryToSuiteDiv = function() {
		this.summary.className += ' ' + this.status();
		this.appendToSummary(this.spec, this.summary);
	};

	HtmlReporter.SpecView.prototype.appendFailureDetail = function() {
		this.detail.className += ' ' + this.status();

		var resultItems = this.spec.results().getItems();
		var messagesDiv = this.createDom('div', {className: 'messages'});

		for (var i = 0; i < resultItems.length; i++) {
			var result = resultItems[i];

			if (result.type == 'log') {
				messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage log'}, result.toString()));
			} else if (result.type == 'expect' && result.passed && !result.passed()) {
				messagesDiv.appendChild(this.createDom('div', {className: 'resultMessage fail'}, result.message));

				if (result.trace.stack) {
					messagesDiv.appendChild(this.createDom('div', {className: 'stackTrace'}, result.trace.stack));
				}
			}
		}

		if (messagesDiv.childNodes.length > 0) {
			this.detail.appendChild(messagesDiv);
			this.dom.details.appendChild(this.detail);
		}
	};

	HtmlReporterHelpers.addHelpers(HtmlReporter.SpecView);
	HtmlReporter.SuiteView = function(suite, dom, views) {
		this.suite = suite;
		this.dom = dom;
		this.views = views;

		this.element = this.createDom('div', {className: 'suite' + (!!suite.isFile ? ' fileContainer' : '')},
		this.createDom('a', {
			className: 'description',
			target: '_blank',
			href: (!!this.suite.getSpecFile ? '?specFile=' + encodeURIComponent(this.suite.getSpecFile()) : '#')
		}, this.suite.description)
				);

		this.appendToSummary(this.suite, this.element);
	};

	HtmlReporter.SuiteView.prototype.status = function() {
		return this.getSpecStatus(this.suite);
	};

	HtmlReporter.SuiteView.prototype.refresh = function() {
		this.element.className += " " + this.status();
	};

	HtmlReporterHelpers.addHelpers(HtmlReporter.SuiteView);

	return HtmlReporter;
});
/* jshint ignore:end */;
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('utils',[], function() {
	'use strict';

	function addClass(e, className){
		if(e.className.indexOf(className) === -1){
			e.className = e.className === '' ? className : e.className + ' ' + className;
		}
	}

	function removeClass(e, className){
		if(e.className.indexOf(className) !== -1){
			if(e.className === className){
				e.className = '';
			} else {
				var regx = new RegExp('[\\s]?' + className + '[\\s]?', 'g');
				e.className = e.className.replace(regx, '');
			}
		}
	}

	function isArray(o){
		// @todo TODO change this to be CrossBrowser and also accept OLD Browsers
		return Array.isArray(o);
	}


	function colorize(txt, baseColor){
		if(baseColor === undefined) {
			baseColor = '\u001b[0m';
		}

		return txt.replace(/PASSED/g, '\u001b[1;32mPASSED' + baseColor)
				.replace(/FAILED/g, '\u001b[1;31mFAILED' + baseColor)
				.replace(/SKIPPED/g, '\u001b[1;33mSKIPPED' + baseColor)
		;
	}

	function logError(msg){
		return (!!window.console && !!window.console.error ?
			window.console.error(msg) :
			window.alert(msg) // throw new error can breaks the execution
		);
	}

	function log(msg){
		function _log(msg) {
			return (!!window.console && !!window.console.log ?
				window.console.log(msg) :
				null
			);
		}
		if(!!window._phantom) {
			var eMsg = '';
				eMsg += '\n\n';
				eMsg += '\u001b[1;36m\n';
				eMsg += '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n';
				eMsg += '\u001b[37mINFO: ';
				eMsg += '\n';
				eMsg += colorize(msg, '\u001b[37m');
				eMsg += '\n';
				eMsg += '\u001b[1;36m>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n';
				eMsg += '\n\u001b[0m'
			;
			if(window.PARTIAL_OUTPUT === 'ERROR') {
				setTimeout(function () {
					throw new Error(eMsg);
				},1);
			} else {
				_log(eMsg);
			}
		} else {
			_log(msg);
		}


	}

	function getPath(filePath) {
		var tmp = filePath.split('/');
		tmp.pop();
		return tmp.join('/');
	}

	return {
		addClass: addClass,
		removeClass: removeClass,
		isArray: isArray,
		log: log,
		logError: logError,

		getPath: getPath
	};
});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('printer',[], function(){
	'use strict';

	function printReporter(reporter) {
		var txt = '';

		if (reporter === undefined) {
			reporter = window.reporter;
		}


		if (!!reporter) {
			var results = reporter.results();
			var suites = reporter.suites();
			var i;

			for (i in suites) {
				if (suites.hasOwnProperty(i)) {
					txt += printSuite(suites[i], results) + '\n';
				}
			}

			var passed = 0, failed = 0, total = 0;
			for (i in results) {
				if (results.hasOwnProperty(i)) {
					total++;
					if (results[i].result === 'passed') {
						passed++;
					} else {
						failed++;
					}
				}
			}
			txt += '\n\n TOTAL: ' + total + ' | Failed: ' + failed + ' | Passed: ' + passed;
		}
		return txt;
	}

	function printSuite(suite, results, tabs) {
		var tabChar = '    ';
		if (undefined === tabs) {
			tabs = tabChar;
		}

		var result = results[suite.id], m;
		if (!!result) {

			var txt = suite.name + ': ';
			var i;

			if (result.result !== 'passed') {
				txt += result.result.toUpperCase();

				for (i in result.messages) {
					if (result.messages.hasOwnProperty(i)) {
						m = result.messages[i];
						if(m.actual === undefined && m.matcherName  === undefined && m.expected === undefined){
							txt += '\n' + tabs + tabChar + m.message;
						}else{
							txt += '\n' + tabs + tabChar + m.type + ' ' + m.actual + ' ' + m.matcherName + ' ' + m.expected;
						}

						txt += ' ('+ (m.passed_ ? 'PASSED': m.skipped ? 'SKIPPED' : 'FAILED')+')';
					}
				}
			}

			if(result.messages.length === 0) {
				txt += 'SKIPPED';
			} else {
				txt += 'PASSED';
			}


			for (i in suite.children) {
				if (suite.children.hasOwnProperty(i)) {
					txt += '\n' + tabs + printSuite(suite.children[i], results, tabs + tabChar);
				}
			}

			return txt;
		} else {
			return suite.name + ': SKIPPED';

		}
	}

	return printReporter;
});

/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('JARunner',[
	'./route',
	'./jasmine-html-isolated',
	'./utils',
	'./printer'
], function(
	route,
	HtmlReporter,
	utils,
	printReporter
) {
	'use strict';

	function JARunner() {
		this._route = route;
		this._specs = null;
		this._beforeExecuteTests = null;

		this._timeForSpecFile = {};
		this._viewReporter = null;
	}

	JARunner.prototype.init = function() {
		if(!this._route.isWholeSuite()) {
			this._hackJasmine();
			this._prepare();
		}
	};

	/**
	 * Sets the specs list from outside if is necessary
	 *
	 * @param {Array.<String>} specsList
	 */
	JARunner.prototype.setSpecs = function(specsList){
		this._specs = specsList;
	};

	JARunner.prototype.addViewReporter = function() {
		this._viewReporter = new HtmlReporter();
		jasmine.getEnv().addReporter(this._viewReporter);
	};

	// *************************************************************************
	// PRIVATE Methods
	// *************************************************************************

	/**
	 * Prevents to jasmine be executed by the default Runner
	 */
	JARunner.prototype._hackJasmine = function() {
		this._executeJasmine = jasmine.getEnv().execute.bind(jasmine.getEnv());
		jasmine.getEnv().execute = function(){};

		this._onJasmineFinish = jasmine.getEnv().currentRunner().finishCallback;
		var me = this;
		jasmine.getEnv().currentRunner().finishCallback = function (){
			me._onFinish();
		};

		this._setReporter();
	};

	JARunner.prototype._setReporter = function() {
		this._internalReporter = new jasmine.JsApiReporter();
		jasmine.getEnv().addReporter(this._internalReporter);
	};

	JARunner.prototype.beforeExecuteTests = function(cbk) {
		if(undefined === this._beforeExecuteTests){
			this._beforeExecuteTests = [];
		}
		this._beforeExecuteTests.push(cbk);
	};

	JARunner.prototype.setBeforeExecuteListeners = function(listeners) {
		this._beforeExecuteTests = listeners;
	};

	JARunner.prototype._executeBeforeExecuteTests = function() {
		if(!!this._beforeExecuteTests && this._beforeExecuteTests.length > 0){
			var i, cbk;
			for(i = 0; i < this._beforeExecuteTests.length; i++){
				cbk = this._beforeExecuteTests[i];
				if(!!cbk && !!cbk.constructor && cbk.constructor.name.toLowerCase() === 'function'){
					try{
						cbk.call();
					}catch(e){
						utils.logError(e);
					}
				}
			}
		}
	};

	JARunner.prototype._printReporter = function(reporter, specFile){
		var extra = '';
		if(specFile) {
			extra += '\n ' + specFile;
			extra += '\n Tests executed in: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStop');
			extra += '\n Total time: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStart');
		}
		utils.log( printReporter(reporter) + extra);
	};

	JARunner.prototype._markTime = function (timeKey, specFile) {
		if(!this._timeForSpecFile.hasOwnProperty(specFile)){
			this._timeForSpecFile[specFile] = {};
		}
		this._timeForSpecFile[specFile][timeKey] = Date.now();
	};

	JARunner.prototype._getTimeDiff = function (specFile, timeKeyA, timeKeyB){
		if(!this._timeForSpecFile.hasOwnProperty(specFile)){
			return 0;
		}
		var timeA = this._timeForSpecFile[specFile][timeKeyA];
		var timeB = this._timeForSpecFile[specFile][timeKeyB];

		return (timeA - timeB).toString() + 'ms';
	};

	// *************************************************************************
	// HOOKS (to be overwrited)
	// *************************************************************************
	JARunner.prototype.run = function() {};
	JARunner.prototype.getExternalReporter = function() {};
	JARunner.prototype._onFinish = function() {};
	JARunner.prototype._prepare = function() {};
	JARunner.prototype.setDefaultReporter = function(/*reporter*/) {};

	JARunner.augment = function augment(ctor) {
		if (ctor === undefined || ctor === null) {
			throw new TypeError(
				'The constructor to `inherits` must not be null or undefined.'
			);
		}

		ctor._super = JARunner;
		ctor.prototype = Object.create(JARunner.prototype, {
			constructor : {
				value : ctor,
				enumerable : false,
				writable : true,
				configurable : true
			}
		});
	};

	return JARunner;
});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('Test',[
	'./route',
	'./utils'
], function(
	route,
	utils
){

	'use strict';

	var winNum = 0;

	function Test(specFile, handler){
		this._winNum = winNum++;

		this._handler = handler;
		this._specFile = specFile;

		this.id = this._handler.specToId(specFile);
		this.src = route.getURLForSpec(this._specFile);

		this._listElement = null;

		this._lastReporter = null;
		this._lastChildRunner = null;
		this._passed = undefined;


		this._watchdogTimer = null;
		this._watchdogDumbPreventerTimer = null;
	}

	Test.prototype.getId = function(){
		return this.id;
	};

	Test.prototype.getSpecFile = function(){
		return this._specFile;
	};

	Test.prototype.getSRC = function(){
		return this.src;
	};

	Test.prototype.getURL = function(){
		return this.src;
	};

	Test.prototype.run = function() {
		this._handler.getRunner().setCurrentTestObj(this);
		this._handler.getRunner().load();
	};

	Test.prototype.onRun = function(){
		this._timeOut = false;
		this._tS = Date.now();

		if(this.finished !== true){
			if(!route.isAlone()){
				this._runButton.setAttribute('disabled', 'disabled');
				this._listElement.className = 'running';
			}
		}
	};

	Test.prototype.getElement = function(){
		return this._listElement;
	};

	Test.prototype.markAsLoading = function(){
		if(!route.isAlone()){
			this._runButton.setAttribute('disabled', 'disabled');
			this._listElement.className += ' loading';
		}
	};

	Test.prototype.markAsTimeout = function(){
		this._timeOut = true;
		this._passed = undefined;
		if(!route.isAlone()){
			this.onFinish(false, true);
			this._listElement.className += ' timeout';
		}
	};

	Test.prototype.getElement = function(){
		return this._listElement;
	};

	Test.prototype.markAsLoading = function(){
		if(!route.isAlone()){
			this._runButton.setAttribute('disabled', 'disabled');
			this._listElement.className += ' loading';
		}
	};

	Test.prototype.onFinish = function(passedState, internal){
		this._tE = Date.now();
		this._runButton.removeAttribute('disabled');
		this._listElement.className = passedState ? ' passed' : ' failed';
		if(!internal){
			this._passed = passedState;
		}

		if(!this._tS){
			this._timeCounter.innerHTML = ' (Not Executed)';
		} else {
			this._timeCounter.innerHTML = ' (' + (this._tE - this._tS) + 'ms)';
		}
		this.finished = true;
	};

	Test.prototype.createListElement = function(){
		this._listElement = document.createElement('dd');
		this._listElement.title = this._specFile;

		var a = document.createElement('a');
		this._timeCounter = document.createElement('span');
		this._timeCounter.className = 'time-counter';
		this._runButton = document.createElement('button');

		this._runButton.innerHTML = 'Run';
		this._runButton.onclick = this.open.bind(this);

		a.href = route.getURLForSpec(this._specFile);

		var tmp = this._specFile.split('/');
		var baseName = tmp[tmp.length-1];
		baseName = baseName.replace('.js', '');
		baseName = baseName.replace('.spec', '');

		a.innerHTML = baseName;
		a.target = '_blank';

		this._listElement.appendChild(this._runButton);
		this._listElement.appendChild(a);
		this._listElement.appendChild(this._timeCounter);

		return this._listElement;
	};

	Test.prototype.getListElement = function(){
		return this._listElement;
	};

	Test.prototype.setReporter = function(reporter){
		this._lastReporter = reporter;
	};

	Test.prototype.getReporter = function(){
		return this._lastReporter;
	};

	Test.prototype.setChildRunner = function(childRunner){
		this._lastChildRunner = childRunner;
	};

	Test.prototype.getChildRunner = function(){
		return this._lastChildRunner;
	};

	Test.prototype.isPassed = function(){
		return this._passed;
	};

	Test.prototype.isTimeOut = function(){
		return this._timeOut;
	};

	//**************************************************************************
	// Self Running Methods
	//**************************************************************************

	Test.prototype.open = function(retry) {
		this.markAsLoading();

		if(!this._watchdogTimer) {
			this._setWatchdog();
		}
		this._setDumbPreventerWatchdog();

		utils.log('Loading: ' + this.getSpecFile() + (!!retry ? '[RETRY]' : ''));

		var workarea = document.getElementById('isolated-test-workarea');
		var left = window.screenX + workarea.offsetLeft;
		var top = window.screenY + workarea.offsetTop;
		var W = workarea.clientWidth;
		var H = workarea.clientHeight;

		this._testWindow = window.open(
			this.getSRC(),
			'test_win_' + this._winNum,
			'width=' + W + ', height=' + H + ', left=' + left + ', top=' + top + ', scrollbars=yes, resizable=yes'
		);
	};

	Test.prototype.close = function() {
		this._clearTimers();

		this._testWindow.close();
	};

	Test.prototype._clearTimers = function() {
		this._clearWatchDog();
		this._clearDumbPreventerWatchDog();
	};

	Test.prototype._watchDogTimeOut = function() {
		this._clearTimers();

		this._handler.getRunner().onChildTimeOut(this.getSpecFile());
	};

	Test.prototype._clearWatchDog = function() {
		clearTimeout(this._watchdogTimer);
		this._watchdogTimer = null;
	};

	Test.prototype._setWatchdog = function() {
		this._clearWatchDog();

		this._watchdogTimer = setTimeout(
			this._watchDogTimeOut.bind(this),
			window.TEST_EXECUTION_TIMEOUT
		);
	};

	Test.prototype._clearDumbPreventerWatchDog = function() {
		clearTimeout(this._watchdogDumbPreventerTimer);
		this._watchdogDumbPreventerTimer = null;
	};

	Test.prototype._setDumbPreventerWatchdog = function() {
		this._clearDumbPreventerWatchDog();

		this._watchdogDumbPreventerTimer = setTimeout(
			this.open.bind(this, true),
			window.TEST_LOAD_TIMEOUT
		);
	};

	return Test;
});

/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('tests',['./route', './Test'], function(route, Test){

	'use strict';

	var tests = {

		_testsById: null,
		_testsBySpec: null,
		_tests: null,
		_runner: null,

		createTestsObjects: function(specsLists){
			this._clean();

			var i;
			for(i = 0; i < specsLists.length; i++){
				this._add(new Test(specsLists[i], this));
			}
		},

		setRunner: function(runner){
			this._runner = runner;
		},

		getRunner: function(){
			return this._runner;
		},

		_clean: function(){
			this._testsById = {};
			this._testsBySpec = {};
			this._tests = [];
		},

		specToId: function(specFile){
			var id = specFile.toString().replace(/^[0-9]|[\s\W]/g, '');
			id = id.toString().replace(/^([0-9])/g, '_$1');

			return id;
		},

		addIframeToDOM: function(testObj){
			var parent = this._getParentDOMElement();
			this._log('Loading: ' + testObj.getSpecFile());
	 		parent.appendChild(testObj.getElement());
		},

		// IFRAMES INDEXES METHODS

		getLength: function(){
			return this._tests.length;
		},

		/**
		 *
		 * @param {Int} ix
		 * @returns {Test}
		 */
		getIndex: function(ix){
			return this._tests[ix];
		},

		getTests: function(){
			return this._tests;
		},

		getTestBySpec: function(specFile){
			return (!!this._testsBySpec[specFile]) ? this._testsBySpec[specFile] : false;
		},

		getTestById: function(id){
			return (!!this._testsBySpec[id]) ? this._testsBySpec[id] : false;
		},


		// Private Methods


		_add: function(testObj){
			this._testsById[testObj.getId()] = testObj;
			this._testsBySpec[testObj.getSpecFile()] = testObj;
			this._tests.push(testObj);
		},

		_getParentDOMElement: function(){
			var b = document.getElementById('Specs');
			if(!b){
				b = document.body;
			}

			return b;
		},

		_log: function(){
			// @todo TODO console safe null
			window.console.log(Array.prototype.join.call(arguments, ' '));
		},

		isTimeOut: function(){
			var timeOut = false;
			for(var i = 0; i < this._tests.length; i++){
				if(this._tests[i].isTimeOut()){
					timeOut = true;
					break;
				}
			}
			return timeOut;
		},

		isFailed: function(){
			var failed = false;
			for(var i = 0; i < this._tests.length; i++){
				if(this._tests[i].isPassed() !== true && this._tests[i].isPassed() !== undefined){
					failed = true;
					break;
				}
			}
			return failed;
		}
	};

	return tests;
});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('fixReporter',[], function(){

	'use strict';

	function fixReporter(reporter){
		var parentRunner = jasmine.getEnv().currentRunner()//,
//			reporter = getReporter()
		;

		if(reporter.__FIXED__ === true) {
			return;
		}

		reporter.__FIXED__ = true;

		var startedAt = new Date(),
			childSpecs = [],
			childTopLevelSuites = [],
			oMethods = {},
			functionNames = [ // THE ORDER IS IMPORTANT!!! DON'T CHANGE
				'reportRunnerResults',
				'reportRunnerStarting',
				'reportSpecStarting',
				'reportSpecResults',
				'reportSuiteResults',

				'log'
			],

			queueBySpecFile = {},
			specFilesOrder = [],
			queue = []
		;

		function proxyMethod(method){
			try{

				if(!!reporter[method]){
					oMethods[method] = reporter[method];
					reporter[method] = function(){
						var specFile = !!this.specFile ? this.specFile : window.isolatedRunner.getRunningSpec();
						queueBySpecFile[specFile].push([method, arguments]);
					};
				}
			}catch(e){
			}
		}

		/**
		 * The queue is recreated, because the spec files can be executed many times.
		 * @return {[type]} [description]
		 */
		function buildQueue(){
			var sF, i, j;
			queue = [];

			for(j=0; j < specFilesOrder.length; j++){
				sF = specFilesOrder[j];
				for(i = 0; i < queueBySpecFile[sF].length; i++){
					queue.push( queueBySpecFile[sF][i] );
				}
			}
		}

		parentRunner.specs = function(){
			return childSpecs;
		};
		parentRunner.topLevelSuites = function(){
			return childTopLevelSuites;
		};

		for(var i = 0; i < functionNames.length; i++){
			proxyMethod(functionNames[i]);
		}


		reporter.__getQueue = function(){
			return queueBySpecFile;
		};
		reporter._ExecutingSpecFile = function(specFile){
			if(specFilesOrder.indexOf(specFile) === -1){
				specFilesOrder.push(specFile);
			}
			queueBySpecFile[specFile] = [];
		};

		reporter.reportRunnerStarting = function(runner){
			var specs = runner.specs(),
				topSuites = runner.topLevelSuites(),
				i
			;
			for(i = 0; i < specs.length; i++){
				childSpecs.push(specs[i]);
			}
			for(i = 0; i < topSuites.length; i++){
				childTopLevelSuites.push(topSuites[i]);
			}
		};
		reporter.reportRunnerResults = function(){};

		if(!!reporter.summarize_){
			reporter.summarize_ = function(suiteOrSpec) {
				var isSuite = !!suiteOrSpec.before_ && suiteOrSpec.after_;
				var summary = {
					id : suiteOrSpec.id,
					name : suiteOrSpec.description,
					type : isSuite ? 'suite' : 'spec',
					skipped : !!suiteOrSpec.skipped,
					children : []
				};

				if (isSuite) {
					var children = suiteOrSpec.children();
					for ( var i = 0; i < children.length; i++) {
						summary.children.push(this.summarize_(children[i]));
					}
				}
				return summary;
			};
		}

		reporter.onFinishSuite = function(){
			if(!!oMethods.reportRunnerStarting){
				oMethods.reportRunnerStarting.call(reporter, parentRunner, startedAt);
			}
			// clean reporter
			// build queue
			buildQueue();

			var method,args,a;

			for(var i = 0; i < queue.length; i++) {
				try{
					a = queue[i];
					method = a[0];
					args = a[1];
					if(!!oMethods[ method ]){
						oMethods[ method ].apply(reporter, args);
					}
				}catch(e){}
			}

			if(!!oMethods.reportRunnerResults){
				oMethods.reportRunnerResults.call(reporter, parentRunner);
			}else{
				parentRunner.finished = true;
			}
		};

		/**
		 * Wrap the Wrapper!
		 */
		function getProxyFunctionForSpecAloneRunner(functionName, specFile) {
			var wrapedMethod = reporter[functionName];
			return function() {
				this.specFile = specFile;
				return wrapedMethod.apply(this, arguments);
			};
		}

		reporter.getSpecAloneRunnerProxy = function(specFile) {
			var keys = Object.keys(this),
				prop,
				proxyObject = {}
			;

			for(var i = 0; i < keys.length; i++) {
				prop = keys[i];
				if(typeof this[prop] === 'function') {
					if(functionNames.indexOf(prop) !== -1) {
						proxyObject[prop] = getProxyFunctionForSpecAloneRunner(prop, specFile);
					} else {
						proxyObject[prop] = this[prop].bind(this);
					}
				}
			}

			return proxyObject;
		};
	}

	return fixReporter;

});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('main-runner',[
	'./JARunner',
	'./utils',
	'./tests',
	'./fixReporter'
], function(
	JARunner,
	utils,
	tests,
	fixReporter
) {
	'use strict';

	function MainRunner(){
		JARunner.apply(this, arguments);

		this._specs = null;
		this._runningTests = [];

		this._childSpecsObjectsBySpecFile = {};
		this._reportersByChild = {};
	}
	JARunner.augment(MainRunner);

	MainRunner.prototype.run = function() {
		if(this._route.isAutoStart()){
			this.runAll();
		}
	};

	JARunner.prototype.setDefaultReporter = function(reporter) {
		this._defaultReporter = reporter;
		fixReporter(this._defaultReporter);
	};

	MainRunner.prototype.runAll = function() {
		this._finished = false;

		this._runAllBtn.setAttribute('disabled', 'disabled');

		var me = this;
		clearInterval(this._runAllInterval);
		this._runAllInterval = setInterval(function() {
			me._tick();
		}, 10);

		this._ix = -1;
	};

	MainRunner.prototype.onChildStart = function(specFile) {
		var reporters = this.getChildReporters(specFile);
		for(var i = 0; i < reporters.length; i++) {
			if(!!reporters[i]._ExecutingSpecFile) {
				reporters[i]._ExecutingSpecFile(specFile);
			}
		}

		var testObj = tests.getTestBySpec(specFile);
		this._markTime('loadingStop', specFile);
		testObj.onRun();
	};

	MainRunner.prototype.onChildFinish = function(specFile, reporter, childRunner) {
		var testObj = tests.getTestBySpec(specFile);
		this._markTime('testEnd', testObj.getSpecFile());

		testObj.setReporter(reporter);
		testObj.setChildRunner(childRunner);

		if(!!reporter){
			this._printReporter(reporter, specFile);
			this._checkIsPassed(reporter, testObj);
		} else {
			this._failed = true;
			testObj.onFinish(false);
		}

		if(!!childRunner){
			this._addChildSpecs(specFile, childRunner);
		}

		// ENDING SCRIPT NO FURTHER JS EXECUTION BEYOND THIS POINT
		this._removeRuningTest(testObj);
	};

	MainRunner.prototype.onChildTimeOut = function(specFile) {
		var testObj = tests.getTestBySpec(specFile);
		testObj.markAsTimeout();

		// ENDING SCRIPT NO FURTHER JS EXECUTION BEYOND THIS POINT
		this._removeRuningTest(testObj);
	};

	// *************************************************************************
	// PRIVATE METHODS
	// *************************************************************************

	MainRunner.prototype._hackJasmine = function() {
		JARunner.prototype._hackJasmine.apply(this, arguments);
		var reporters = jasmine.getEnv().reporter.subReporters_;
		for(var i = 0; i < reporters.length; i++) {
			fixReporter(reporters[i]);
		}
	};

	MainRunner.prototype._checkIsPassed = function(reporter, testObj){
		var passedState = false,
			results = reporter.results(),
			result,
			id
		;

		for (id in results) {
			result = results[id];
			passedState = result.result === 'passed';
			if (!passedState) {
				break;
			}
		}

		testObj.onFinish(passedState);
	};

	MainRunner.prototype._addChildSpecs = function(specFile, runner){
		this._childSpecsObjectsBySpecFile[specFile] = runner.specs();
		this._processSpecsByFile(this._childSpecsObjectsBySpecFile[specFile], specFile, []);
	};

	MainRunner.prototype._processSpecsByFile = function(specsByFile, specFile, specs){
		var i;

		for(i = 0; i < specsByFile.length; i++){

			specsByFile[i].id = this._getSpecId(specsByFile[i], specFile);

			this._fixSpecNSuite(specsByFile[i], specFile);
			specs.push(specsByFile[i]);
		}
	};


	MainRunner.prototype._fixSpecNSuite = function(spec, specFile) {
		var f = function(){
			return specFile;
		};
		spec.getSpecFile = f;
		this._setSuiteRelWithSpecFile(spec.suite, specFile);
		spec.suite.getSpecFile = f;
	};

	MainRunner.prototype._setSuiteRelWithSpecFile = function(suite, specFile) {
		var f = function(){
			return specFile;
		};
		suite.getSpecFile = f;
		suite.id = this._getSuiteId(suite, specFile);

		while (suite.parentSuite !== null) {
			suite = suite.parentSuite;
			suite.getSpecFile = f;
			suite.id = this._getSuiteId(suite, specFile);
		}
	};

	MainRunner.prototype._getSpecId = function(spec, specFile) {
		if(!spec.hasOwnProperty('______id')){
			spec.______id = spec.id;
		}
		return this._getUID('Spec', specFile, spec.______id);
	};

	MainRunner.prototype._getSuiteId = function(suite, specFile){
		if(!suite.hasOwnProperty('______id')){
			suite.______id = suite.id;
		}

		var suiteNameID = suite.getFullName();

		return this._getUID('Suite', specFile + '_' + suiteNameID, suite.______id);
	};

	MainRunner.prototype._getUID = function(type, specFile, id){
		var internalID = type + '_' + specFile + '_' + id;
		// var id = this._idsForSpecNSuites.indexOf(internalID);
		// if(id === -1){
		// 	id = this._idsForSpecNSuites.push(internalID) - 1;
		// }
		return internalID.replace(/[\s\W]/g, '_').toLowerCase();
	};

	MainRunner.prototype._removeRuningTest = function(testObj) {
		this._checkOnFinishSuite();

		var pos = this._runningTests.indexOf(testObj);
		this._runningTests.splice(pos, 1);
		testObj.close();
	};

	MainRunner.prototype._checkOnFinishSuite = function() {
		setTimeout(this.__checkOnFinishSuite.bind(this),1);
	};

	MainRunner.prototype.__checkOnFinishSuite = function() {
		if(!this._route.isAutoStart()) {
			this._onFinish();
			return;
		}

		if(this._ix >= tests.getLength()) {
			if(this._runningTests.length === 0) {
				this._onFinish();
			}
		}
	};

	MainRunner.prototype._tick = function() {
		if(this._runningTests.length < window.MAX_THREADS) {
			this._ix++;

			this.__checkOnFinishSuite();
			if(this._ix < tests.getLength()) {
				var testObj = tests.getIndex(this._ix);
				this._runningTests.push(testObj);

				testObj.markAsLoading();
				this._markTime('loadingStart', testObj.getSpecFile());

				this._defaultReporter._ExecutingSpecFile(testObj.getSpecFile());

				testObj.open();
			}
		}
	};

	MainRunner.prototype._createDOMContext = function() {
		this._containerElement = document.createElement('div');
		this._containerElement.id = 'isolatedTests';

		this._specList = document.createElement('dl');
		this._specList.className = 'isolated-test-list';

		var title = document.createElement('dt');
		this._runAllBtn = document.createElement('button');
		this._runAllBtn.id = 'isolated-controls-run';
		this._runAllBtn.innerHTML = 'Run All';
		this._runAllBtn.onclick = this.runAll.bind(this);

		var titleH = document.createElement('h1');
		titleH.innerHTML = 'Tests';
		title.appendChild(this._runAllBtn);
		title.appendChild(titleH);
		this._specList.appendChild(title);

		this.workarea = document.createElement('div');
		this.workarea.className = 'isolated-test-workarea';
		this.workarea.id = 'isolated-test-workarea';

		this._containerElement.appendChild(this._specList);
		this._containerElement.appendChild(this.workarea);

		document.body.appendChild(this._containerElement);

		this._fillTestsList();
	};

	MainRunner.prototype._fillTestsList = function() {
		var i, testObj, specFile, path, tmp;

		this._specs.sort();

		for(i = 0; i < this._specs.length; i++){
			specFile = this._specs[i];
			tmp = utils.getPath(specFile);
			if(tmp !== path){
				this._createPathHeader(tmp);
			}
			path = tmp;

			testObj = tests.getTestBySpec(specFile);
			this._specList.appendChild(
				testObj.createListElement()
			);
		}
	};

	MainRunner.prototype._createPathHeader = function(path){
		var title = document.createElement('dt');
		title.className = 'path';
		title.innerHTML = path;
		this._specList.appendChild(title);
	};

	/**
	 * @Override
	 */
	MainRunner.prototype._setReporter = function() {
		JARunner.prototype._setReporter.apply(this, arguments);
		fixReporter(this._internalReporter);
	};

	/**
	 * @Override
	 */
	MainRunner.prototype.addViewReporter = function() {
		JARunner.prototype.addViewReporter.apply(this, arguments);
		fixReporter(this._viewReporter);
	};

	// *************************************************************************
	// HOOKS (overwrites)
	// *************************************************************************

	MainRunner.prototype.getChildReporters = function(specFile) {
		if(this._reportersByChild.hasOwnProperty(specFile)) {
			return this._reportersByChild[specFile];
		} else {
			var jasmineReporters = jasmine.getEnv().reporter.subReporters_,
				reporters = []
			;

			for(var i = 0; i < jasmineReporters.length; i++) {
				if( jasmineReporters[i].getSpecAloneRunnerProxy ) {
					reporters.push( jasmineReporters[i].getSpecAloneRunnerProxy(specFile) );
				}
			}

			this._reportersByChild[specFile] = reporters;

			return reporters;
		}
	};

	MainRunner.prototype._prepare = function() {
		utils.addClass(document.body, 'jasmine-alone-whole');
		this.ISOLATED = true;

		tests.setRunner(this);
		tests.createTestsObjects(this._specs);

		this._createDOMContext();
	};

	MainRunner.prototype._onFinish = function() {
		clearInterval(this._runAllInterval);
		this._runAllBtn.removeAttribute('disabled');

		var reporters = jasmine.getEnv().reporter.subReporters_,
			reporter
		;
		for(var i = 0; i < reporters.length; i++) {
			reporter = reporters[i];
			if(!!reporter.onFinishSuite) {
				reporter.onFinishSuite();
				reporter.finished = true;
			}
		}

		this._onJasmineFinish.apply(jasmine.getEnv().currentRunner(), arguments);

		this._printReporter(this._internalReporter);

		utils.removeClass(this._specList, 'failed');
		utils.removeClass(this._specList, 'timeout');
		utils.removeClass(this._specList, 'passed');

		if(tests.isFailed()) {
			utils.addClass(this._specList, 'failed');
		} else if(tests.isTimeOut()) {
			utils.addClass(this._specList, 'timeout');
		} else {
			utils.addClass(this._specList, 'passed');
		}

		this._finished = true;
	};

	return new MainRunner();
});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('spec-alone-runner.js',[
	'./JARunner',
	'./utils'
], function(
	JARunner,
	utils
) {
	'use strict';

	function SpecAloneRunner() {
		JARunner.apply(this, arguments);
	}

	JARunner.augment(SpecAloneRunner);

	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype.run = function() {
		this._markTime('loadingStart', this._route.getCurrentSpecFile());
		window.require(
			this._specs,
			this._onSpecLoaded.bind(this),
			this._requireErrorHandler.bind(this)
		);
	};

	SpecAloneRunner.prototype.setDefaultReporter = function() {
		jasmine.getEnv().reporter.subReporters_.splice(
			0,
			jasmine.getEnv().reporter.subReporters_.length
		);
		this._setReporter();
	};

	SpecAloneRunner.prototype._onSpecLoaded = function() {
		this._markTime('loadingStop', this._route.getCurrentSpecFile());

		this._removeLoading();

		if(!!this._parentRunner){
			this._parentRunner.onChildStart(this._route.getCurrentSpecFile());
		}
		this._executeBeforeExecuteTests();

		if(!!this._parentRunner) {
			var reporters = this.getParentReporters();
			for(var i = 0; i < reporters.length; i++) {
				jasmine.getEnv().addReporter(reporters[i]);
			}
		}

		this._executeJasmine();
	};

	SpecAloneRunner.prototype.getParentReporters = function() {
		if(!!this._parentRunner) {
			return this._parentRunner.getChildReporters(this._route.getCurrentSpecFile());
		}
		return false;
	};

	// *************************************************************************
	// PRIVATE METHODS
	// *************************************************************************

	SpecAloneRunner.prototype._renderLoading = function() {
		this._loadingC = document.createElement('div');
		utils.addClass(this._loadingC, 'JA-spinner-loader');
		document.body.appendChild(this._loadingC);
	};

	SpecAloneRunner.prototype._removeLoading = function() {
		this._loadingC.parentNode.removeChild(this._loadingC);
		utils.removeClass(document.body, 'jasmine-alone-loading');
		utils.addClass(document.body, 'jasmine-alone-whole');
	};
	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype._prepare = function() {
		utils.addClass(document.body, 'jasmine-alone-loading');
		this._renderLoading();

		this._parentRunner = null;
		if (!!window.opener) {
			this._parentRunner = window.opener.isolatedRunner.mainRunner;
		}
	};

	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype._onFinish = function() {
		this._markTime('testEnd', this._route.getCurrentSpecFile());

		if(!this._parentRunner){
			this._printReporter(this._internalReporter, this._route.getCurrentSpecFile());
		} else {
			this._parentRunner.onChildFinish(
				this._route.getCurrentSpecFile(),
				this._internalReporter,
				jasmine.getEnv().currentRunner()
			);
		}

		return this._onJasmineFinish.apply(jasmine.getEnv().currentRunner(), arguments);
	};

	SpecAloneRunner.prototype._requireErrorHandler = function(err) {
		var failedId = err.requireModules && err.requireModules[0],
			currentSpecFile = 'MAIN PROCESS';

		if(this._route.isAlone()) {
			currentSpecFile = this._route.getCurrentSpecFile();
		}

		throw new Error('Error Loading Dependencies in [' + currentSpecFile + '], dependencie not found: [' + failedId + ']');
	};

	/**
	 * @Override
	 */
	SpecAloneRunner.prototype.addViewReporter = function() {
		JARunner.prototype.addViewReporter.apply(this, arguments);
		this._viewReporter.toBody = true;
	};

	return new SpecAloneRunner();
});
/*
 * css.normalize.js
 *
 * CSS Normalization
 *
 * CSS paths are normalized based on an optional basePath and the RequireJS config
 *
 * Usage:
 *   normalize(css, fromBasePath, toBasePath);
 *
 * css: the stylesheet content to normalize
 * fromBasePath: the absolute base path of the css relative to any root (but without ../ backtracking)
 * toBasePath: the absolute new base path of the css relative to the same root
 * 
 * Absolute dependencies are left untouched.
 *
 * Urls in the CSS are picked up by regular expressions.
 * These will catch all statements of the form:
 *
 * url(*)
 * url('*')
 * url("*")
 * 
 * @import '*'
 * @import "*"
 *
 * (and so also @import url(*) variations)
 *
 * For urls needing normalization
 *
 */

define('normalize',[],function() {
  
  // regular expression for removing double slashes
  // eg http://www.example.com//my///url/here -> http://www.example.com/my/url/here
  var slashes = /([^:])\/+/g
  var removeDoubleSlashes = function(uri) {
    return uri.replace(slashes, '$1/');
  }

  // given a relative URI, and two absolute base URIs, convert it from one base to another
  var protocolRegEx = /[^\:\/]*:\/\/([^\/])*/;
  var absUrlRegEx = /^(\/|data:)/;
  function convertURIBase(uri, fromBase, toBase) {
    if (uri.match(absUrlRegEx) || uri.match(protocolRegEx))
      return uri;
    uri = removeDoubleSlashes(uri);
    // if toBase specifies a protocol path, ensure this is the same protocol as fromBase, if not
    // use absolute path at fromBase
    var toBaseProtocol = toBase.match(protocolRegEx);
    var fromBaseProtocol = fromBase.match(protocolRegEx);
    if (fromBaseProtocol && (!toBaseProtocol || toBaseProtocol[1] != fromBaseProtocol[1] || toBaseProtocol[2] != fromBaseProtocol[2]))
      return absoluteURI(uri, fromBase);
    
    else {
      return relativeURI(absoluteURI(uri, fromBase), toBase);
    }
  };
  
  // given a relative URI, calculate the absolute URI
  function absoluteURI(uri, base) {
    if (uri.substr(0, 2) == './')
      uri = uri.substr(2);

    // absolute urls are left in tact
    if (uri.match(absUrlRegEx) || uri.match(protocolRegEx))
      return uri;
    
    var baseParts = base.split('/');
    var uriParts = uri.split('/');
    
    baseParts.pop();
    
    while (curPart = uriParts.shift())
      if (curPart == '..')
        baseParts.pop();
      else
        baseParts.push(curPart);
    
    return baseParts.join('/');
  };


  // given an absolute URI, calculate the relative URI
  function relativeURI(uri, base) {
    
    // reduce base and uri strings to just their difference string
    var baseParts = base.split('/');
    baseParts.pop();
    base = baseParts.join('/') + '/';
    i = 0;
    while (base.substr(i, 1) == uri.substr(i, 1))
      i++;
    while (base.substr(i, 1) != '/')
      i--;
    base = base.substr(i + 1);
    uri = uri.substr(i + 1);

    // each base folder difference is thus a backtrack
    baseParts = base.split('/');
    var uriParts = uri.split('/');
    out = '';
    while (baseParts.shift())
      out += '../';
    
    // finally add uri parts
    while (curPart = uriParts.shift())
      out += curPart + '/';
    
    return out.substr(0, out.length - 1);
  };
  
  var normalizeCSS = function(source, fromBase, toBase) {

    fromBase = removeDoubleSlashes(fromBase);
    toBase = removeDoubleSlashes(toBase);

    var urlRegEx = /@import\s*("([^"]*)"|'([^']*)')|url\s*\((?!#)\s*(\s*"([^"]*)"|'([^']*)'|[^\)]*\s*)\s*\)/ig;
    var result, url, source;

    while (result = urlRegEx.exec(source)) {
      url = result[3] || result[2] || result[5] || result[6] || result[4];
      var newUrl;
      newUrl = convertURIBase(url, fromBase, toBase);
      var quoteLen = result[5] || result[6] ? 1 : 0;
      source = source.substr(0, urlRegEx.lastIndex - url.length - quoteLen - 1) + newUrl + source.substr(urlRegEx.lastIndex - quoteLen - 1);
      urlRegEx.lastIndex = urlRegEx.lastIndex + (newUrl.length - url.length);
    }
    
    return source;
  };
  
  normalizeCSS.convertURIBase = convertURIBase;
  normalizeCSS.absoluteURI = absoluteURI;
  normalizeCSS.relativeURI = relativeURI;
  
  return normalizeCSS;
});
;
/*
 * Require-CSS RequireJS css! loader plugin
 * 0.1.2
 * Guy Bedford 2013
 * MIT
 */

/*
 *
 * Usage:
 *  require(['css!./mycssFile']);
 *
 * Tested and working in (up to latest versions as of March 2013):
 * Android
 * iOS 6
 * IE 6 - 10
 * Chome 3 - 26
 * Firefox 3.5 - 19
 * Opera 10 - 12
 * 
 * browserling.com used for virtual testing environment
 *
 * Credit to B Cavalier & J Hann for the IE 6 - 9 method,
 * refined with help from Martin Cermak
 * 
 * Sources that helped along the way:
 * - https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
 * - http://www.phpied.com/when-is-a-stylesheet-really-loaded/
 * - https://github.com/cujojs/curl/blob/master/src/curl/plugin/css.js
 *
 */

define('css',[],function() {
  if (typeof window == 'undefined')
    return { load: function(n, r, load){ load() } };

  var head = document.getElementsByTagName('head')[0];

  var engine = window.navigator.userAgent.match(/Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/) || 0;

  // use <style> @import load method (IE < 9, Firefox < 18)
  var useImportLoad = false;
  
  // set to false for explicit <link> load checking when onload doesn't work perfectly (webkit)
  var useOnload = true;

  // trident / msie
  if (engine[1] || engine[7])
    useImportLoad = parseInt(engine[1]) < 6 || parseInt(engine[7]) <= 9;
  // webkit
  else if (engine[2] || engine[8])
    useOnload = false;
  // gecko
  else if (engine[4])
    useImportLoad = parseInt(engine[4]) < 18;

  //main api object
  var cssAPI = {};

  cssAPI.pluginBuilder = './css-builder';

  // <style> @import load method
  var curStyle, curSheet;
  var createStyle = function () {
    curStyle = document.createElement('style');
    head.appendChild(curStyle);
    curSheet = curStyle.styleSheet || curStyle.sheet;
  }
  var ieCnt = 0;
  var ieLoads = [];
  var ieCurCallback;
  
  var createIeLoad = function(url) {
    ieCnt++;
    if (ieCnt == 32) {
      createStyle();
      ieCnt = 0;
    }
    curSheet.addImport(url);
    curStyle.onload = function(){ processIeLoad() };
  }
  var processIeLoad = function() {
    ieCurCallback();
 
    var nextLoad = ieLoads.shift();
 
    if (!nextLoad) {
      ieCurCallback = null;
      return;
    }
 
    ieCurCallback = nextLoad[1];
    createIeLoad(nextLoad[0]);
  }
  var importLoad = function(url, callback) {
    if (!curSheet || !curSheet.addImport)
      createStyle();

    if (curSheet && curSheet.addImport) {
      // old IE
      if (ieCurCallback) {
        ieLoads.push([url, callback]);
      }
      else {
        createIeLoad(url);
        ieCurCallback = callback;
      }
    }
    else {
      // old Firefox
      curStyle.textContent = '@import "' + url + '";';

      var loadInterval = setInterval(function() {
        try {
          curStyle.sheet.cssRules;
          clearInterval(loadInterval);
          callback();
        } catch(e) {}
      }, 10);
    }
  }

  // <link> load method
  var linkLoad = function(url, callback) {
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    if (useOnload)
      link.onload = function() {
        link.onload = function() {};
        // for style dimensions queries, a short delay can still be necessary
        setTimeout(callback, 7);
      }
    else
      var loadInterval = setInterval(function() {
        for (var i = 0; i < document.styleSheets.length; i++) {
          var sheet = document.styleSheets[i];
          if (sheet.href == link.href) {
            clearInterval(loadInterval);
            return callback();
          }
        }
      }, 10);
    link.href = url;
    head.appendChild(link);
  }

  cssAPI.normalize = function(name, normalize) {
    if (name.substr(name.length - 4, 4) == '.css')
      name = name.substr(0, name.length - 4);

    return normalize(name);
  }

  cssAPI.load = function(cssId, req, load, config) {

    (useImportLoad ? importLoad : linkLoad)(req.toUrl(cssId + '.css'), load);

  }

  return cssAPI;
});


define('css!jasmine-alone',[],function(){});
/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define('new-jasmine-alone',[
	'./main-runner',
	'./spec-alone-runner.js',
	'./route',
	'./utils',

	'css!jasmine-alone'
], function (
	mainRunner,
	specAloneRunner,
	route,
	utils
) {
	'use strict';

	var defaults = {
		TEST_EXECUTION_TIMEOUT: 60000,
		TEST_LOAD_TIMEOUT: 3000,
		MAX_THREADS: 5
	};

	var isolatedRunner = {
		run: function() {
			var runner;

			this.mainRunner = mainRunner;
			this.specAloneRunner = specAloneRunner;

			if(route.isAlone()) {
				runner = this.specAloneRunner;
				this.specAloneRunner.setSpecs([route.getCurrentSpecFile()]);
				this.specAloneRunner.setBeforeExecuteListeners(this._beforeExecuteTests);
			} else {
				runner = this.mainRunner;
				this.mainRunner.setBeforeExecuteListeners(this._beforeExecuteTests);
				this.mainRunner.setSpecs(this._getSpecs());
			}
			runner.init();

			runner.setDefaultReporter (
				!!window.runner ?
					window.runner :
					jasmine.getEnv().reporter.subReporters_[0]
			);

			if(!window._phantom) {
				runner.addViewReporter();
			}
			runner.run();
		},

		setSpecs: function(specsList) {
			this._specs = specsList;
		},

		_getSpecs: function(){
			if(!this._specs){
				var specs;
				if(!!window.specs && utils.isArray(window.specs)){
					specs = window.specs;
				}
				if(!!window.specFiles && utils.isArray(window.specFiles)){
					specs = window.specFiles;
				}

				// @todo TODO Improve this search to be more compatible with
				// diferents types of templates

				return specs;
			}else{
				return this._specs;
			}
		},

		beforeExecuteTests: function(cbk){
			if(undefined === this._beforeExecuteTests){
				this._beforeExecuteTests = [];
			}
			this._beforeExecuteTests.push(cbk);
		},

		defineDefault: function(propertyName) {
			if(undefined === window[propertyName]){
				window[propertyName] = defaults[propertyName];
			}else if(!isFinite(window[propertyName])){
				window[propertyName] = defaults[propertyName];
				utils.logError('JasmineAlone: ' + propertyName + ' is not a number. Defined an default value: ' + defaults[propertyName]);
			}
		}
	};


	isolatedRunner.defineDefault('TEST_EXECUTION_TIMEOUT');
	isolatedRunner.defineDefault('TEST_LOAD_TIMEOUT');
	isolatedRunner.defineDefault('MAX_THREADS');

	window.isolatedRunner = isolatedRunner;

	return isolatedRunner;
});
define('../libs/require-css/css.min',[],function(){if("undefined"==typeof window)return{load:function(e,t,n){n()}};var e=document.getElementsByTagName("head")[0],t=window.navigator.userAgent.match(/Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/)||0,n=!1,r=!0;t[1]||t[7]?n=parseInt(t[1])<6||parseInt(t[7])<=9:t[2]||t[8]?r=!1:t[4]&&(n=parseInt(t[4])<18);var o={};o.pluginBuilder="./css-builder";var a,i,s,l=function(){a=document.createElement("style"),e.appendChild(a),i=a.styleSheet||a.sheet},u=0,d=[],c=function(e){u++,32==u&&(l(),u=0),i.addImport(e),a.onload=function(){f()}},f=function(){s();var e=d.shift();return e?(s=e[1],void c(e[0])):void(s=null)},h=function(e,t){if(i&&i.addImport||l(),i&&i.addImport)s?d.push([e,t]):(c(e),s=t);else{a.textContent='@import "'+e+'";';var n=setInterval(function(){try{a.sheet.cssRules,clearInterval(n),t()}catch(e){}},10)}},p=function(t,n){var o=document.createElement("link");if(o.type="text/css",o.rel="stylesheet",r)o.onload=function(){o.onload=function(){},setTimeout(n,7)};else var a=setInterval(function(){for(var e=0;e<document.styleSheets.length;e++){var t=document.styleSheets[e];if(t.href==o.href)return clearInterval(a),n()}},10);o.href=t,e.appendChild(o)};return o.normalize=function(e,t){return".css"==e.substr(e.length-4,4)&&(e=e.substr(0,e.length-4)),t(e)},o.load=function(e,t,r){(n?h:p)(t.toUrl(e+".css"),r)},o});

(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
('html, body, #isolatedTests{\n\twidth: 100%;\n\theight: 100%;\n\tmargin: 0;\n\tpadding: 0;\n\toverflow: hidden;\n}\n\nbody.jasmine-alone-whole,\nbody.jasmine-alone-whole #isolatedTests{\n\toverflow: auto;\n}\n\n.isolated-test-list{\n\twidth: 30%;\n\tfloat: left;\n\theight: 100%;\n\toverflow: auto;\n\tbackground-color: #222;\n\tmargin: 0;\n\tpadding: 0;\n\tposition: relative;\n\tz-index: 2;\n}\n\n.isolated-test-list.passed{\n\tbox-shadow: 0px 0px 40px 5px #1bb41b\n}\n\n.isolated-test-list.failed{\n\tbox-shadow: 0px 0px 40px 5px #b41b1b\n}\n\n.isolated-test-list.timeout{\n\tbox-shadow: 0px 0px 40px 5px #E88809\n}\n\n.isolated-test-list dd{\n\tborder-top: solid 1px #777;\n\t-webkit-transition: background 500ms;\n\t-moz-transition: background 500ms;\n\t-ms-transition: background 500ms;\n\t-o-transition: background 500ms;\n\ttransition: background 500ms;\n}\n\n.isolated-test-list dd,\n.isolated-test-list dt{\n\tpadding: 0px 10px;\n\tmargin: 0;\n\tbackground-color: #444;\n\tcolor: #f1f1f1;\n\tline-height: 30px;\n\tclear: both;\n\tborder-bottom: solid 1px #222;\n}\n\n.isolated-test-list dt.path{\n\tbackground: #222;\n}\n\n.isolated-test-list dd:hover{\n\tbackground-color: #666;\n}\n\n.isolated-test-list button{\n\tfloat: right;\n\ttop: 1px;\n\tposition: relative;\n}\n\n.isolated-test-list button,\n.isolated-test-list a{\n\tcursor: pointer;\n}\n.isolated-test-list button[disabled]{\n\topacity: .6;\n\tcursor: default;\n}\n.isolated-test-list dd.running button[disabled]{\n\tcursor: inherit;\n}\n\n.isolated-test-list button,\n.isolated-test-list a,\n.isolated-test-list dd a:visited{\n\tcolor: #f1f1f1;\n\tline-height: 26px;\n\n\ttext-decoration: none;\n}\n\nbutton#isolated-controls-run,\n.isolated-test-list dd button{\n\tborder: none;\n\tpadding: 0px 10px 0px 26px;\n\tline-height: 25px;\n\tbackground:\n\t\t#222\n\t\turl(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUZFMDRCRjFEM0M2MTFFMzhBRDBCOEVDREY4NjQxRDMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUZFMDRCRjJEM0M2MTFFMzhBRDBCOEVDREY4NjQxRDMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRkUwNEJFRkQzQzYxMUUzOEFEMEI4RUNERjg2NDFEMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRkUwNEJGMEQzQzYxMUUzOEFEMEI4RUNERjg2NDFEMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvrXN1sAAABlSURBVHjaYlS+L8lACmBiIBFg0VAgXUqCBqDqHNZCPHqwOwmPHpx+wKUHn6ex6iEQSph6qBGsyGDK7/4JT7uJ1YCpGp8GrKpxasClGgiYhQp4kfknPh9j4mbCpRoIGGmeWgECDADlViNXk8co7wAAAABJRU5ErkJggg==)\n\t\tno-repeat\n\t\t5px 5px\n\t\t;\n}\n\n.isolated-test-list dt h1{\n\tfont-size: 22px;\n}\n.isolated-test-list dt{\n\tpadding-left: 20px;\n}\n.isolated-test-list dt button,\n.isolated-test-list dt h1{\n\tdisplay: inline;\n\tline-height: 45px;\n}\n\n.isolated-test-list dd{\n\n\tborder-left: solid 10px #222;\n\n\t-webkit-transition: border-left-color 500ms;\n\t-moz-transition: border-left-color 500ms;\n\t-ms-transition: border-left-color 500ms;\n\t-o-transition: border-left-color 500ms;\n\ttransition: border-left-color 500ms;\n}\n\n.isolated-test-list dd.failed{\n\tborder-left-color: #b41b1b;\n}\n.isolated-test-list dd.failed.timeout{\n\tborder-left-color: #E88809;\n\tbackground: #7B664B;\n}\n\n.isolated-test-list dd.passed{\n\tborder-left-color: #1bb41b;\n}\n\n.isolated-test-list dd.loading{\n\tborder-left-color: orange;\n\tcursor: progress;\n\n\t-webkit-animation-name: loading;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: loading;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n.isolated-test-list dd.running{\n\tborder-left-color: #1bb4af;\n\tcursor: progress;\n\n\t-webkit-animation-name: running;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: running;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n.isolated-test-workarea{\n\twidth: 69%;\n\theight: 100%;\n\toverflow: auto;\n\tfloat: right;\n\tposition: relative;\n}\n\n.isolated-test-workarea iframe{\n\twidth: 100%;\n\tborder: 0;\n}\n.isolated-test-workarea iframe.running{\n\tcursor: wait;\n}\n\niframe#isolated-tests-iframe{\n\tmin-height: 90%;\n}\n\n/* Chrome, Safari, Opera */\n@-webkit-keyframes running\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: #1bb4af;}\n\t75% {border-left-color: #1bb4af;}\n\t100% {border-left-color: #444444;}\n\t/*25%   {border-left-color: #366968;}*/\n}\n\n/* Standard syntax */\n@keyframes running\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: #1bb4af;}\n\t75% {border-left-color: #1bb4af;}\n\t100% {border-left-color: #444444;}\n}\n\n/* Chrome, Safari, Opera */\n@-webkit-keyframes loading\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: orange;}\n\t75% {border-left-color: orange;}\n\t100% {border-left-color: #444444;}\n\t/*25%   {border-left-color: #366968;}*/\n}\n\n/* Standard syntax */\n@keyframes loading\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: orange;}\n\t75% {border-left-color: orange;}\n\t100% {border-left-color: #444444;}\n}\n\n@keyframes highlight\n{\n\t0%  {background: rgba(241, 218, 54, .5); color: initial;}\n\t50% {background: rgba(0, 0, 0, .5); color: #ffffff;}\n\t100%  {background: rgba(241, 218, 54, .5); color: initial;}\n}\n@-webkit-keyframes highlight\n{\n\t0%  {background: rgba(241, 218, 54, .5); color: initial;}\n\t50% {background: rgba(0, 0, 0, .5); color: #ffffff;}\n\t100%  {background: rgba(241, 218, 54, .5); color: initial;}\n}\n.time-counter{color: #888;}\n\nbody.timeout, body.timeout #HTMLReporter{\n\tbackground: #fff0cc !important;\n}\n\n#HTMLReporter .summary .suite.skipped,\n\n#HTMLReporter .summary .suite.empty{\n\tbackground: rgba(232, 136, 9, .5);\n}\n\n#HTMLReporter .summary .specSummary.highlighted{\n\t-webkit-animation-name: highlight;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: highlight;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n#HTMLReporter .summary .specSummary.skipped,\n#HTMLReporter .summary .specSummary.empty{\n\tbackground: rgba(232, 136, 9, .5);\n}\n#HTMLReporter .skippedAlert.bar{\n\tbackground: rgba(232, 136, 9, 1);\n}\n#HTMLReporter .skippedAlert.bar:hover{\n\ttext-decoration: none;\n}\n\n#HTMLReporter .symbolSummary li.empty:before{\n\tcolor: blueviolet;\n\tcontent: \"\\02717\";\n}\n#HTMLReporter .symbolSummary li.skipped:before{\n\tcolor: #E88809;\n\tcontent: \"\\02717\";\n}\ndiv#isolatedTests div#HTMLReporter .symbolSummary li.failed{\n\tline-height: inherit;\n}\n#HTMLReporter .symbolSummary li.failed:before{\n\tcontent: \"\\02717\";\n}\n\n#HTMLReporter .symbolSummary li.passed:before{\n\tcontent: \"\\02713\";\n\n}\n\n#HTMLReporter .symbolSummary li{\n\theight: 14px;\n\twidth: 18px;\n\tfont-size: 20px !important;\n\tposition: relative;\n}\n\n#HTMLReporter .symbolSummary li a{\n\tposition: absolute;\n\twidth: 100%;\n\theight: 100%;\n\tdisplay: block;\n\ttop: 0;\n\tleft: 0;\n}\n\n#HTMLReporter .summary{\n\tpadding: 0;\n}\n\n#HTMLReporter .summary .suite.fileContainer{\n\tpadding: 0px 0px 8px 0px;\n\tmargin: 5px 0px 10px 0px;\n\tborder: solid 1px #bababa;\n\tborder-radius: 5px;\n\tbox-shadow: 2px 2px 5px #bababa;\n}\n\n#HTMLReporter .summary .suite.fileContainer >a.description{\n\tfont-size: 1.2em;\n\tline-height: 2.2em;\n\tdisplay: block;\n\tbackground: #bababa;\n\tmargin-bottom: 8px;\n\tpadding-left: 8px;\n}\n\n@-moz-keyframes three-quarters-loader {\n  0% {\n    -moz-transform: rotate(0deg);\n    transform: rotate(0deg);\n  }\n  100% {\n    -moz-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n@-webkit-keyframes three-quarters-loader {\n  0% {\n    -webkit-transform: rotate(0deg);\n    transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n@keyframes three-quarters-loader {\n  0% {\n    -moz-transform: rotate(0deg);\n    -ms-transform: rotate(0deg);\n    -webkit-transform: rotate(0deg);\n    transform: rotate(0deg);\n  }\n  100% {\n    -moz-transform: rotate(360deg);\n    -ms-transform: rotate(360deg);\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n/* :not(:required) hides this rule from IE9 and below */\n.JA-spinner-loader:not(:required) {\n  -moz-animation: three-quarters-loader 1250ms infinite linear;\n  -webkit-animation: three-quarters-loader 1250ms infinite linear;\n  animation: three-quarters-loader 1250ms infinite linear;\n  border: 8px solid #a6b779;\n  border-right-color: transparent;\n  border-radius: 50px;\n  box-sizing: border-box;\n  display: inline-block;\n  position: relative;\n  overflow: hidden;\n  text-indent: -9999px;\n  width: 100px;\n  height: 100px;\n\n  position: fixed;\n  top: 50%;\n  left: 50%;\n  margin-left: -50px;\n  margin-top: -50px;\n}\n\nbody.jasmine-alone-loading {\n\tbackground: #444;\n}');
    //Register in the values from the outer closure for common dependencies
    //as local almond modules
    define('jasmine', function () {
        return jasmine;
    });

    //Use almond's special top-level, synchronous require to trigger factory
    //functions, get the final module value, and export it as the public
    //value.
    return require('new-jasmine-alone');
}));