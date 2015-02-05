/*
The MIT License (MIT)

Copyright (c) 2013-2014 Daniel Goberitz

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

(function() {

	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\Test.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	
	define('/__jasmine-alone__/Test', ['/__jasmine-alone__/route'], function(route){
	
		'use strict';
	
		function Test(specFile, handler){
			this._handler = handler;
			this._specFile = specFile;
	
			this.id = this._handler.specToId(specFile);
			this.src = route.getURLForSpec(this._specFile);
	
			this._listElement = null;
	
			this._lastReporter = null;
			this._lastChildRunner = null;
			this._passed = undefined;
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
	
		Test.prototype.run = function(){
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
	
		Test.prototype.markAsTimeout = function(){
			if(!route.isAlone()){
				this.onFinish(false);
				this._listElement.className += ' timeout';
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
			this._runButton = document.createElement('button'),
	
			this._runButton.innerHTML = 'Run';
			this._runButton.onclick = this.run.bind(this);
	
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
	
		return Test;
	});
	
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\fixJasmineXit.js
	define('/__jasmine-alone__/fixJasmineXit', [], function(){
		'use strict';
	
		var oldIt = jasmine.Env.prototype.it;
		var oldDescribe = jasmine.Env.prototype.describe;
		var oldBeforeEach = jasmine.Env.prototype.beforeEach;
		var oldAfterEach = jasmine.Env.prototype.afterEach;
	
		jasmine.Env.prototype.it = function (description, fnc) {
			if(!!this.currentSuite && this.currentSuite.skipped){
				return this.xit(description, fnc);
			} else {
				return oldIt.apply(this, arguments);
			}
		};
	
		jasmine.Env.prototype.beforeEach = function(){
			if(!!this.currentSuite && this.currentSuite.skipped){
				return;
			} else {
				return oldBeforeEach.apply(this, arguments);
			}
		};
	
		jasmine.Env.prototype.afterEach = function(){
			if(!!this.currentSuite && this.currentSuite.skipped){
				return;
			} else {
				return oldAfterEach.apply(this, arguments);
			}
		};
	
		jasmine.Env.prototype.xit = function (description) {
			var spec = new jasmine.Spec(this, this.currentSuite, description);
			this.currentSuite.add(spec);
			this.currentSpec = spec;
	
			spec.runs(function(){
				spec.skipped = true;
			});
	
			return spec;
		};
	
		jasmine.Env.prototype.describe = function(description, specDefinitions){
			if(!!this.currentSuite && this.currentSuite.skipped){
				return this.xdescribe(description, specDefinitions);
			} else {
				return oldDescribe.apply(this, arguments);
			}
		};
	
		jasmine.Env.prototype.xdescribe = function(description, specDefinitions){
		  var suite = new jasmine.Suite(this, description, specDefinitions, this.currentSuite);
		  suite.skipped = true;
	
		  var parentSuite = this.currentSuite;
		  if (parentSuite) {
		    parentSuite.add(suite);
		  } else {
		    this.currentRunner_.add(suite);
		  }
	
		  this.currentSuite = suite;
	
		  var declarationError = null;
		  try {
		    specDefinitions.call(suite);
		  } catch(e) {
		    declarationError = e;
		  }
	
		  if (declarationError) {
		    this.it("encountered a declaration exception", function() {
		      throw declarationError;
		    });
		  }
	
		  this.currentSuite = parentSuite;
	
		  return suite;
		};
	
	});
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\fixReporter.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	
	define('/__jasmine-alone__/fixReporter', [], function(){
	
		function fixReporter(reporter){
			var parentRunner = jasmine.getEnv().currentRunner()//,
	//			reporter = getReporter()
			;
	
			var startedAt = new Date,
				childSpecs = [],
				childSuites = {},
				childTopLevelSuites = [],
				suites = 0;
				oMethods = {},
				functionNames = [
					 "reportRunnerStarting",
					 "reportRunnerResults",
					 "reportSuiteResults",
					 "reportSpecStarting",
					 "reportSpecResults",
					 "log"
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
							var specFile = window.isolatedRunner.getRunningSpec();
							queueBySpecFile[specFile].push([method, arguments]);
						};
					}
				}catch(e){
	
				}
			}
	
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
	
			reporter._ExecutingSpecFile = function(specFile){
				if(specFilesOrder.indexOf(specFile) === -1){
					specFilesOrder.push(specFile);
				}
				queueBySpecFile[specFile] = [];
			};
	
			reporter.reportRunnerStarting = function(runner){
				var specs = runner.specs(),
					topSuites = runner.topLevelSuites()
				;
				for(var i = 0; i < specs.length; i++){
					childSpecs.push(specs[i]);
				}
				for(var i = 0; i < topSuites.length; i++){
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
				var specs = window.isolatedRunner.getSpecs(), spec;
				// FIX SUITES IDS
				for(var i = 0; i < specs.length; i++){
					spec = specs[i];
					if(!childSuites.hasOwnProperty(spec.suite.getFullName()) ){
						childSuites[ spec.suite.getFullName() ] = spec.suite;
					}
				}
				childSpecs = specs; // parentRunner will return this array
	
				if(!!oMethods.reportRunnerStarting){
					oMethods.reportRunnerStarting.call(reporter, parentRunner, startedAt);
				}
				var a;
				// clean reporter
				// build queue
				buildQueue();
	
				for(var i = 0; i < queue.length; i++){
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
					oMethods.reportRunnerResults(reporter, parentRunner);
				}else{
					runner.finished = true;
				}
			};
	
		}
	
		return fixReporter;
	
	});
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\jasmine-html-isolated.js
	/* jshint ignore:start */
	define('/__jasmine-alone__/jasmine-html-isolated', [], function() {
	
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
	
			if (sectionName) {
				params.push('spec=' + encodeURIComponent(sectionName));
			}
	
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
					suites: {}
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
	
				if (isUndefined(this.views.specs[spec.id])) {
					this.views.specs[spec.id] = new HtmlReporter.SpecView(spec, dom);
				}
	
				var specView = this.views.specs[spec.id];
	
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
			this.spec = spec;
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
				href: '?spec=' + encodeURIComponent(this.spec.getFullName()) + (!!this.spec.getSpecFile ? '&specFile=' + encodeURIComponent(this.spec.getSpecFile()) : ''),
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
	
			this.element = this.createDom('div', {className: 'suite'},
			this.createDom('a', {
				className: 'description',
				target: '_blank',
				href: HtmlReporter.sectionLink(this.suite.getFullName()) + (!!this.suite.getSpecFile ? '&specFile=' + encodeURIComponent(this.suite.getSpecFile()) : '')
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
	/* jshint ignore:end */
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\printer.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	
	define('/__jasmine-alone__/printer', [], function(){
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
			if (undefined === tabs) {
				tabs = '\t';
			}
	
			var result = results[suite.id], m;
			if (!!result) {
	
				var txt = suite.name + ': ' + result.result.toUpperCase();
				var i;
	
				if (result.result !== 'passed') {
					for (i in result.messages) {
						if (result.messages.hasOwnProperty(i)) {
							m = result.messages[i];
							if(m.actual === undefined && m.matcherName  === undefined && m.expected === undefined){
								txt += '\n' + tabs + '\t' + m.message + ' ('+ (m.passed_ ? 'PASSED': 'FAILED')+')';
							}else{
								txt += '\n' + tabs + '\t' + m.type + ' ' + m.actual + ' ' + m.matcherName + ' ' + m.expected + ' ('+ (m.passed_ ? 'PASSED': 'FAILED')+')';
							}
						}
					}
				}
	
	
				for (i in suite.children) {
					if (suite.children.hasOwnProperty(i)) {
						txt += '\n' + tabs + printSuite(suite.children[i], results, tabs + '\t');
					}
				}
	
				return txt;
			} else {
				return suite.name + ': unknow';
	
			}
		}
	
		return printReporter;
	});
	
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\route.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	
	define('/__jasmine-alone__/route', [], function(){
	
		'use strict';
	
		function s(){
			return window.location.search.toString();
		};
	
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
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\tests.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	
	define('/__jasmine-alone__/tests', ['/__jasmine-alone__/route', '/__jasmine-alone__/Test'], function(route, Test){
	
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
	
			createIframeForSpec: function(specFile){
				var testObj = new Iframe(specFile, this);
				this._add(testObj);
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
	
			_getParentDOMElement: function(testObj){
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
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\jasmine-alone.css
	!(function() {
		var s = document.createElement('style');
		s.setAttribute('type', 'text/css');
		s.innerHTML = "html, body, #isolatedTests{\n\twidth: 100%;\n\theight: 100%;\n\tmargin: 0;\n\tpadding: 0;\n\toverflow: hidden;\n}\n\nbody.jasmine-alone-whole,\nbody.jasmine-alone-whole #isolatedTests{\n\toverflow: auto;\n}\n\n.isolated-test-list{\n\twidth: 30%;\n\tfloat: left;\n\theight: 100%;\n\toverflow: auto;\n\tbackground-color: #222;\n\tmargin: 0;\n\tpadding: 0;\n\tposition: relative;\n\tz-index: 2;\n}\n\n.isolated-test-list.passed{\n\tbox-shadow: 0px 0px 40px 5px #1bb41b\n}\n\n.isolated-test-list.failed{\n\tbox-shadow: 0px 0px 40px 5px #b41b1b\n}\n\n.isolated-test-list.timeout{\n\tbox-shadow: 0px 0px 40px 5px #E88809\n}\n\n.isolated-test-list dd{\n\tborder-top: solid 1px #777;\n\t-webkit-transition: background 500ms;\n\t-moz-transition: background 500ms;\n\t-ms-transition: background 500ms;\n\t-o-transition: background 500ms;\n\ttransition: background 500ms;\n}\n\n.isolated-test-list dd,\n.isolated-test-list dt{\n\tpadding: 0px 10px;\n\tmargin: 0;\n\tbackground-color: #444;\n\tcolor: #f1f1f1;\n\tline-height: 30px;\n\tclear: both;\n\tborder-bottom: solid 1px #222;\n}\n\n.isolated-test-list dt.path{\n\tbackground: #222;\n}\n\n.isolated-test-list dd:hover{\n\tbackground-color: #666;\n}\n\n.isolated-test-list button{\n\tfloat: right;\n\ttop: 1px;\n\tposition: relative;\n}\n\n.isolated-test-list button,\n.isolated-test-list a{\n\tcursor: pointer;\n}\n.isolated-test-list button[disabled]{\n\topacity: .6;\n\tcursor: default;\n}\n.isolated-test-list dd.running button[disabled]{\n\tcursor: inherit;\n}\n\n.isolated-test-list button,\n.isolated-test-list a,\n.isolated-test-list dd a:visited{\n\tcolor: #f1f1f1;\n\tline-height: 26px;\n\n\ttext-decoration: none;\n}\n\nbutton#isolated-controls-run,\n.isolated-test-list dd button{\n\tborder: none;\n\tpadding: 0px 10px 0px 26px;\n\tline-height: 25px;\n\tbackground:\n\t\t#222\n\t\turl(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUZFMDRCRjFEM0M2MTFFMzhBRDBCOEVDREY4NjQxRDMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUZFMDRCRjJEM0M2MTFFMzhBRDBCOEVDREY4NjQxRDMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRkUwNEJFRkQzQzYxMUUzOEFEMEI4RUNERjg2NDFEMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRkUwNEJGMEQzQzYxMUUzOEFEMEI4RUNERjg2NDFEMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvrXN1sAAABlSURBVHjaYlS+L8lACmBiIBFg0VAgXUqCBqDqHNZCPHqwOwmPHpx+wKUHn6ex6iEQSph6qBGsyGDK7/4JT7uJ1YCpGp8GrKpxasClGgiYhQp4kfknPh9j4mbCpRoIGGmeWgECDADlViNXk8co7wAAAABJRU5ErkJggg==)\n\t\tno-repeat\n\t\t5px 5px\n\t\t;\n}\n\n.isolated-test-list dt h1{\n\tfont-size: 22px;\n}\n.isolated-test-list dt{\n\tpadding-left: 20px;\n}\n.isolated-test-list dt button,\n.isolated-test-list dt h1{\n\tdisplay: inline;\n\tline-height: 45px;\n}\n\n.isolated-test-list dd{\n\n\tborder-left: solid 10px #222;\n\n\t-webkit-transition: border-left-color 500ms;\n\t-moz-transition: border-left-color 500ms;\n\t-ms-transition: border-left-color 500ms;\n\t-o-transition: border-left-color 500ms;\n\ttransition: border-left-color 500ms;\n}\n\n.isolated-test-list dd.failed{\n\tborder-left-color: #b41b1b;\n}\n.isolated-test-list dd.failed.timeout{\n\tborder-left-color: #E88809;\n\tbackground: #7B664B;\n}\n\n.isolated-test-list dd.passed{\n\tborder-left-color: #1bb41b;\n}\n\n.isolated-test-list dd.loading{\n\tborder-left-color: orange;\n\tcursor: progress;\n\n\t-webkit-animation-name: loading;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: loading;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n.isolated-test-list dd.running{\n\tborder-left-color: #1bb4af;\n\tcursor: progress;\n\n\t-webkit-animation-name: running;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: running;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n.isolated-test-workarea{\n\twidth: 69%;\n\theight: 100%;\n\toverflow: auto;\n\tfloat: right;\n\tposition: relative;\n}\n\n.isolated-test-workarea iframe{\n\twidth: 100%;\n\tborder: 0;\n}\n.isolated-test-workarea iframe.running{\n\tcursor: wait;\n}\n\niframe#isolated-tests-iframe{\n\tmin-height: 90%;\n}\n\n/* Chrome, Safari, Opera */\n@-webkit-keyframes running\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: #1bb4af;}\n\t75% {border-left-color: #1bb4af;}\n\t100% {border-left-color: #444444;}\n\t/*25%   {border-left-color: #366968;}*/\n}\n\n/* Standard syntax */\n@keyframes running\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: #1bb4af;}\n\t75% {border-left-color: #1bb4af;}\n\t100% {border-left-color: #444444;}\n}\n\n/* Chrome, Safari, Opera */\n@-webkit-keyframes loading\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: orange;}\n\t75% {border-left-color: orange;}\n\t100% {border-left-color: #444444;}\n\t/*25%   {border-left-color: #366968;}*/\n}\n\n/* Standard syntax */\n@keyframes loading\n{\n\t0%  {border-left-color: #444444;}\n\t25% {border-left-color: orange;}\n\t75% {border-left-color: orange;}\n\t100% {border-left-color: #444444;}\n}\n\n@keyframes highlight\n{\n\t0%  {background: rgba(241, 218, 54, .5); color: initial;}\n\t50% {background: rgba(0, 0, 0, .5); color: #ffffff;}\n\t100%  {background: rgba(241, 218, 54, .5); color: initial;}\n}\n@-webkit-keyframes highlight\n{\n\t0%  {background: rgba(241, 218, 54, .5); color: initial;}\n\t50% {background: rgba(0, 0, 0, .5); color: #ffffff;}\n\t100%  {background: rgba(241, 218, 54, .5); color: initial;}\n}\n.time-counter{color: #888;}\n\nbody.timeout, body.timeout #HTMLReporter{\n\tbackground: #fff0cc !important;\n}\n\n#HTMLReporter .summary .suite.skipped,\n\n#HTMLReporter .summary .suite.empty{\n\tbackground: rgba(232, 136, 9, .5);\n}\n\n#HTMLReporter .summary .specSummary.highlighted{\n\t-webkit-animation-name: highlight;\n\t-webkit-animation-iteration-count: infinite;\n\t-webkit-animation-duration: 1s;\n\tanimation-name: highlight;\n\tanimation-iteration-count: infinite;\n\tanimation-duration: 1s;\n}\n\n#HTMLReporter .summary .specSummary.skipped,\n#HTMLReporter .summary .specSummary.empty{\n\tbackground: rgba(232, 136, 9, .5);\n}\n#HTMLReporter .skippedAlert.bar{\n\tbackground: rgba(232, 136, 9, 1);\n}\n#HTMLReporter .skippedAlert.bar:hover{\n\ttext-decoration: none;\n}\n\n#HTMLReporter .symbolSummary li.empty:before{\n\tcolor: #bababa;\n\tcontent: \"\\02717\";\n}\n#HTMLReporter .symbolSummary li.skipped:before{\n\tcolor: #E88809;\n\tcontent: \"\\02717\";\n}\ndiv#isolatedTests div#HTMLReporter .symbolSummary li.failed{\n\tline-height: inherit;\n}\n#HTMLReporter .symbolSummary li.failed:before{\n\tcontent: \"\\02717\";\n}\n\n#HTMLReporter .symbolSummary li.passed:before{\n\tcontent: \"\\02713\";\n\n}\n\n#HTMLReporter .symbolSummary li{\n\theight: 14px;\n\twidth: 18px;\n\tfont-size: 20px !important;\n\tposition: relative;\n}\n\n#HTMLReporter .symbolSummary li a{\n\tposition: absolute;\n\twidth: 100%;\n\theight: 100%;\n\tdisplay: block;\n\ttop: 0;\n\tleft: 0;\n}";
		document.head.appendChild(s);
	}());
	
	
	// ** @file E:\Dropbox\DEVEL\JasmineAlone\sources\src\jasmine-alone.js
	/*
	 *
	 *  @overview
	 *  @author Daniel Goberitz <dalgo86@gmail.com>
	 *
	 */
	/* global jasmine: true, document: true, window: true, define: true */
	define([
		'/__jasmine-alone__/route',
		'/__jasmine-alone__/tests',
		'/__jasmine-alone__/printer',
		'/__jasmine-alone__/fixReporter',
		'/__jasmine-alone__/jasmine-html-isolated',
		'/__jasmine-alone__/fixJasmineXit'
	], function(
		route,
		tests,
		printReporter,
		fixReporter,
		HtmlReporter
	){
	
		'use strict';
	
		var DEFAULT_WATCHDOG = 60000,
			DEFAULT_DUMB_PREVENTER_WATCHDOG = 3000
		;
	
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
					var regx = new RegExp('[\s]?' + className + '[\s]?', 'g');
					e.className = e.className.replace(regx, '');
				}
			}
		}
	
		function defineIsolatedRunner(){ // because lint
			var isolatedRunner = {
				ISOLATED: false,
	
				_ix: null,
				_specs: null,
				_watchdogTimer: null,
				_reporter: null,
	
				// DOM PROPERTIES
				_testWindow: null,
				_specList: null,
				_runAllBtn: null,
				_isRunningInIframe: null,
	
				_setUp: function(){
	//				this._parentWindow = window.parent;
					this._parentWindow = window.opener;
					if(!!this._parentWindow && this._parentWindow !== window){
						if(!!this._parentWindow.isolatedRunner){
							this._isRunningInIframe = true;
						}
					}
	
					this._childSpecsObjectsBySpecFile = {};
					this._idsForSpecNSuites = [];
				},
	
				init: function(){
					if(!route.isWholeSuite()){
						this._hackJasmine();
	
						if(route.isAlone()){ // iframe mode
							document.body.className += ' jasmine-alone-whole';
							this._prepareAlone();
						}else{
							this._prepareIsolated();
						}
	
						return true;
					}else{
						this.WHOLE = true;
						document.body.className += ' jasmine-alone-whole';
						return false;
					}
				},
	
				/**
				 * Executes all the specs when is in IsolatedAllMode
				 * @returns {undefined}
				 */
				runAll: function(){
					if(!route.isAlone()){
						this._finished = false;
	
						this._runAllBtn.setAttribute('disabled', 'disabled');
						this._onFinish = this._onFinishIsolatedMode;
	
						var me = this;
						clearInterval(this._runAllInterval);
						this._runAllInterval = setInterval(function(){
							me._tick();
						}, 10);
	
						this._nextReadyToBeExecuted = true;
						this._ix = -1;
					} else {
						throw new Error('Trying to execute all specs in alone mode! Avoiding inifite recursion');
					}
				},
	
				_tick: function(){
					if(this._nextReadyToBeExecuted){
						this._next();
					}
				},
	
				_processLastExecutedSpec: function(){
					var test = this.getCurrentTestObj(),
						reporter,
						childRunner,
						specFile
					;
					if(!!test){ // first execution there is no test!
						reporter = test.getReporter();
						childRunner = test.getChildRunner();
						specFile = test.getSpecFile();
	
						if(!!reporter){
							this._printReporter(reporter);
							this._checkIsPassed(reporter, specFile);
						} else {
							this._failed = true;
							test.onFinish(false);
						}
	
						if(!!childRunner){
							this._addChildSpecs(specFile, childRunner);
						}
					}
				},
	
				/**
				 * Execute the suite when is in Alone mode, that is execute just one spec
				 * must be called from the html runner
				 */
				run: function(){
					var me = this;
					if(!this.init()){
						// do nothing?
						require(this._specs, function(){
							me._executeBeforeExecuteTests();
							jasmine.getEnv().execute();
						});
	
						return;
					}else{
						if(route.isAlone()){
							this._onFinish = this._onFinishAloneMode;
	
							require(this._specs, function(){
								me._executeBeforeExecuteTests();
	
								jasmine.getEnv().addReporter(me._reporter);
								if(!!me.getExternalReporter()){
									jasmine.getEnv().addReporter(me.getExternalReporter());
								}
								me._executeJasmine();
	
								me._parentWindow.isolatedRunner.onChildStart(route.getCurrentSpecFile());
							});
						}else{
							this._onFinish = this._onFinishIsolatedMode;
							if(route.isAutoStart()){
								this.runAll();
							}
						}
					}
				},
	
	
				/**
				 * Sets the specs list from outside if is necessary
				 *
				 * @param {Array.<String>} specsList
				 */
				setSpecs: function(specsList){
					this._specs = specsList;
				},
	
				beforeExecuteTests: function(cbk){
					if(undefined === this._beforeExecuteTests){
						this._beforeExecuteTests = [];
					}
					this._beforeExecuteTests.push(cbk);
				},
	
				_executeBeforeExecuteTests: function(){
					if(!!this._beforeExecuteTests && this._beforeExecuteTests.length > 0){
						var i, cbk;
						for(i = 0; i < this._beforeExecuteTests.length; i++){
							cbk = this._beforeExecuteTests[i];
							if(!!cbk && !!cbk.constructor && cbk.constructor.name.toLowerCase() === 'function'){
								try{
									cbk.call();
								}catch(e){
									logError(e);
								}
							}
						}
					}
				},
	
				//**********************************************************************
				// CHILDS API
				//**********************************************************************
	
				setHeight: function(specFile, win){
					return;
	
					if(route.isAlone()){
						if(this._isRunningInIframe){
							this._parentWindow.isolatedRunner.setHeight(specFile, win);
						}
						// else in case that is executed alone but outside of the iframe
						// we won't need to call the parentWindow
					} else {
						// executed on PARENT
	
						var height = win.getComputedStyle(win.document.body).height;
						height = parseInt(height.replace('px', ''), 10) + 20;
	
	//					this._iframe.style.height = height + 'px';
	
						// @todo TODO the specFile is not for the log, this is only for lint
						// the specFile could be used to set the height of the specified iframe
						// if in some moment we return to use a iframe for every spec
						// instead to use the same for every one
						log(specFile + ' setHeight: ' + height);
					}
				},
	
				onChildStart: function(specFile) {
					this.setCurrentTestObj(tests.getTestBySpec(specFile));
					var testObj = this.getCurrentTestObj();
					this._clearDumbPreventerWatchDog();
					testObj.onRun();
					log('Loaded!');
	
					var pos = findPos(testObj.getElement()) - (getHeight(this._specList) / 2);
					if(pos <= 0){
						pos = 0;
					}
					this._specList.scrollTop = pos;
				},
	
				childFinish: function(specFile, reporter, childRunner){
					if(route.isAlone()){
						if(this._isRunningInIframe){
							this._parentWindow.isolatedRunner.childFinish(specFile, reporter, jasmine.getEnv().currentRunner());
						}
						// else in case that is executed alone but outside of the iframe
						// we won't need to call the parentWindow
					} else {
						// executed on CHILD context with PARENNT MEMORY ACCESS!!!
						this._clearWatchDog();
						this._setDumbPreventerWatchdog();
						var test = tests.getTestBySpec(specFile);
						test.setReporter(reporter);
						test.setChildRunner(childRunner);
	
						this._nextReadyToBeExecuted = true;
						if(!route.isAutoStart()){
							this._next();
						}
	
					}
				},
	
				getInternalReporter: function(){
					return this._reporter;
				},
	
				getExternalReporter: function(){
					if(route.isAlone()){
						if(this._isRunningInIframe){
							return this._parentWindow.isolatedRunner.getExternalReporter();
						}else{
							return false;
						}
					}else{
						return this._defaultReporter;
					}
				},
	
				//**********************************************************************
				// ON FINISH Methods
				//**********************************************************************
	
				_onFinishAloneMode: function(){
					clearInterval(this._setHeightInterval);
					this.setHeight(route.getCurrentSpecFile(), window);
					this.childFinish(route.getCurrentSpecFile(), this._reporter);
	
					return this._onJasmineFinish.apply(jasmine.getEnv().currentRunner(), arguments);
				},
	
				_onFinishIsolatedMode: function(){
					this._runAllBtn.removeAttribute('disabled');
	
					this._defaultReporter.onFinishSuite();
					this._defaultReporter.finished = true;
	
					this._printReporter(this._reporter);
	
					removeClass(this._specList, 'failed');
					removeClass(this._specList, 'timeout');
					removeClass(this._specList, 'passed');
	
					if(tests.isFailed()){
						addClass(this._specList, 'failed');
					} else if(tests.isTimeOut()) {
						addClass(this._specList, 'timeout');
					} else {
						addClass(this._specList, 'passed');
					}
	
					this._finished = true;
					this._closeTestWindow();
				},
	
				_onFinish: function(){
					this._onJasmineFinish();
					throw new Error('Called default on Finish, prepare methods fails');
				},
	
				//**********************************************************************
				// Prepare context Methods
				//**********************************************************************
				/**
				 * This method prepares the context to execute all the specs in a isolated way
				 *
				 */
				_prepareIsolated: function(){
					this.ISOLATED = true;
	
					fixReporter(this._defaultReporter);
	
					this._specs = this._findSpecs();
	
					tests.setRunner(this);
					tests.createTestsObjects(this._specs);
	
					this._createDOMContext();
				},
	
				/**
				 * This method prepares the context to execute one and just one
				 * spec inside of the iframe
				 *
				 */
				_prepareAlone: function(){
					this.ISOLATED = false;
	
	//				this._setHeightInterval = setInterval(this.setHeight.bind(this), 300);
	
					this._specs = this._findSpecs();
					tests.setRunner(this);
					tests.createTestsObjects(this._specs);
	
					this.setCurrentTestObj( tests.getTestBySpec(route.getCurrentSpecFile()) );
					this.load();
				},
	
				_createDOMContext: function(){
					this._containerElement = document.createElement('div');
					this._containerElement.id = "isolatedTests";
	
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
				},
	
				_fillTestsList: function(){
					var i, testObj, specFile, path, tmp;
	
					this._specs.sort();
	
					for(i = 0; i < this._specs.length; i++){
						specFile = this._specs[i];
						tmp = this._getPath(specFile);
						if(tmp !== path){
							this._createPathHeader(tmp);
						}
						path = tmp;
	
						testObj = tests.getTestBySpec(specFile);
						this._specList.appendChild(
							testObj.createListElement()
						);
					}
				},
	
				_createPathHeader: function(path){
					var title = document.createElement('dt');
					title.className = 'path';
					title.innerHTML = path;
					this._specList.appendChild(title);
				},
	
				_getPath: function(specFile){
					var tmp = specFile.split('/');
					tmp.pop();
					return tmp.join('/');
				},
	
				//**********************************************************************
				// ITERATION & LOAD METHODS
				//**********************************************************************
				setCurrentTestObj: function(testObj){
					this._currentSpecObject = testObj;
					this._currentSpecFile = testObj.getSpecFile();
				},
	
				getCurrentTestObj: function(){
					return this._currentSpecObject;
				},
	
				getRunningSpec: function(){
					return this._currentSpecFile;
				},
	
				_next: function(timeout){
					this._processLastExecutedSpec();
					this._nextReadyToBeExecuted = false;
	
					this._clearWatchDog();
					this._clearDumbPreventerWatchDog();
	
					if(timeout){
						this.getCurrentTestObj().markAsTimeout();
					}
	
					if(this._finished === false){
						this._ix++;
						if(this._ix >= tests.getLength()){
							this._onFinish();
						}else{
							this.setCurrentTestObj( tests.getIndex(this._ix) );
							this.load();
						}
					} else {
						this._onFinish();
					}
				},
	
				load: function(){
					var testObj = this.getCurrentTestObj();
					if(!route.isAlone()){
						testObj.markAsLoading();
	
						this._defaultReporter._ExecutingSpecFile(this._currentSpecFile);
						this._setWatchdog();
						// this._closeTestWindow();
						this._startTestWindow();
	
					}else{
						this._specs = [testObj.getSpecFile()];
					}
				},
	
				runCurrent: function(){
	
				},
	
				// PRIVATE Methods
	
				/**
				 * Prevents to jasmine be executed by the default Runner
				 */
				_hackJasmine: function(){
					this._executeJasmine = jasmine.getEnv().execute.bind(jasmine.getEnv());
					jasmine.getEnv().execute = function(){};
	
					this._onJasmineFinish = jasmine.getEnv().currentRunner().finishCallback;
					var me = this;
					jasmine.getEnv().currentRunner().finishCallback = function (){
						me._onFinish();
					};
	
					this._setReporter();
				},
	
				_setReporter: function(){
					var me = this;
					if(!!window.reporter){
						this._defaultReporter = window.reporter;
					}else{
						if(!!window._phantom){
							this._defaultReporter = new jasmine.JsApiReporter;
						}else{
							if(route.isAlone()){
								this._defaultReporter = new jasmine.HtmlReporter;
							}else{
								this._defaultReporter = new HtmlReporter;
								jasmine.getEnv().specFilter = function(spec) {
									return me._defaultReporter.specFilter(spec);
								};
							}
						}
	
						window.reporter = this._defaultReporter;
					}
	
					if(window.reporter instanceof jasmine.HtmlReporter){
						this._reporterClass = 'HtmlReporter';
						jasmine.getEnv().specFilter = function(spec) {
							return me._defaultReporter.specFilter(spec);
						};
					}else if(window.reporter instanceof jasmine.JsApiReporter){
						this._reporterClass = 'JsApiReporter';
						jasmine.getEnv().updateInterval = Number.MAX_VALUE;
					}
					// @todo TODO write a way to specify the reporter type from outside for custom reporters
	
					if(!this._reporterClass){
						this._reporterClass = 'JsApiReporter'; // default reporter...
					}
	
					if(route.isAlone()){
						this._reporter = new jasmine.JsApiReporter();
						jasmine.getEnv().addReporter(this._reporter);
	
						var viewReporter = new HtmlReporter();
						viewReporter.toBody = true;
						jasmine.getEnv().addReporter(viewReporter);
					}
				},
	
				_findSpecs: function(){
					if(!this._specs){
						var specs;
						if(!!window.specs && isArray(window.specs)){
							specs = this._clone('specs');
						}
						if(!!window.specFiles && isArray(window.specFiles)){
							specs = this._clone('specFiles');
						}
	
						// @todo TODO Improve this search to be more compatible with
						// diferents types of templates
	
						return specs;
					}else{
						return this._specs;
					}
				},
	
				_clone: function(varName){
					// @todo TODO crossBrowser!
					var r = JSON.parse(JSON.stringify(window[varName]));
					// @todo check for Tools (not .spec.js files!)
					window[varName] = [];
					return r;
				},
	
				_setWatchdog: function(){
					this._clearWatchDog();
	
					this._watchdogTimer = setTimeout(
						this._next.bind(this, true),
						window.ISOLATED_TEST_WATCHDOG_TIME
					);
				},
	
				_setDumbPreventerWatchdog: function(){
					this._clearDumbPreventerWatchDog();
	
					this._watchdogDumbPreventerTimer = setTimeout(
						this._startTestWindow.bind(this, true),
						window.DUMB_PREVENTER_WATCHDOG_TIME
					);
				},
	
				_clearWatchDog: function(){
					clearTimeout(this._watchdogTimer);
				},
	
				_clearDumbPreventerWatchDog: function(){
					clearTimeout(this._watchdogDumbPreventerTimer);
				},
	
				_startTestWindow: function(retry){
					var testObj = this.getCurrentTestObj();
	
					var left = window.screenX + this.workarea.offsetLeft;
					var top = window.screenY + this.workarea.offsetTop;
					var W = this.workarea.clientWidth;
					var H = this.workarea.clientHeight;
	
					this._testWindow = window.open(testObj.getSRC(), 'currentTest', 'width=' + W + ', height=' + H + ', left=' + left + ', top=' + top + ', scrollbars=yes, resizable=yes');
					this._setDumbPreventerWatchdog();
					log('Loading: ' + testObj.getSRC() + (retry ? '[RETRY]' : ''));
				},
	
				_printReporter: function(reporter){
					log( printReporter(reporter) );
				},
	
				_checkIsPassed: function(reporter, specFile){
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
	
					var test = tests.getTestBySpec(specFile);
					test.onFinish(passedState);
				},
	
				_addChildSpecs: function(specFile, runner){
					this._childSpecsObjectsBySpecFile[specFile] = runner.specs();
					this._processSpecsByFile(this._childSpecsObjectsBySpecFile[specFile], specFile, []);
				},
	
				getSpecs: function(){
					var specs = [], specFile, spec, i;
					for(i = 0; i < this._specs.length; i++){
						specFile = this._specs[i];
						if(this._childSpecsObjectsBySpecFile.hasOwnProperty(specFile)){
							this._processSpecsByFile(
								this._childSpecsObjectsBySpecFile[specFile],
								specFile,
								specs
							);
						}
					}
					return specs;
				},
	
				_processSpecsByFile: function(specsByFile, specFile, specs){
					var i;
	
					for(i = 0; i < specsByFile.length; i++){
	
						specsByFile[i].id = this._getSpecId(specsByFile[i], specFile);
	
						this._fixSpecNSuite(specsByFile[i], specFile);
						specs.push(specsByFile[i]);
					}
				},
	
				_fixSpecNSuite: function(spec, specFile){
					var f = function(){
						return specFile;
					};
					spec.getSpecFile = f;
					spec.suite.getSpecFile = f;
					spec.suite.id = this._getSuiteId(spec.suite, specFile);
				},
	
				_getSpecId: function(spec, specFile){
					if(!spec.hasOwnProperty('______id')){
						spec.______id = spec.id;
					}
					return this._getUID('Spec', specFile, spec.______id);
				},
	
				_getSuiteId: function(suite, specFile){
					if(!suite.hasOwnProperty('______id')){
						suite.______id = suite.id;
					}
					return this._getUID('Suite', specFile, suite.______id);
				},
	
				_getUID: function(type, specFile, id){
					var internalID = type + '_' + specFile + id;
					var id = this._idsForSpecNSuites.indexOf(internalID);
					if(id === -1){
						id = this._idsForSpecNSuites.push(internalID) - 1;
					}
					return id;
				},
	
				_closeTestWindow: function(){
					if (!!this._testWindow && !!this._testWindow.close) {
						this._testWindow.close();
					}
				}
			};
	
			return isolatedRunner;
		}
	
		if(undefined === window.ISOLATED_TEST_WATCHDOG_TIME){
			window.ISOLATED_TEST_WATCHDOG_TIME = DEFAULT_WATCHDOG;
		}else if(!isFinite(window.ISOLATED_TEST_WATCHDOG_TIME)){
			window.ISOLATED_TEST_WATCHDOG_TIME = DEFAULT_WATCHDOG;
			logError('ISOLATED_TEST_WATCHDOG_TIME is not a number. Defined an default time: ' + DEFAULT_WATCHDOG);
		}
		if(undefined === window.DUMB_PREVENTER_WATCHDOG_TIME){
			window.DUMB_PREVENTER_WATCHDOG_TIME = DEFAULT_DUMB_PREVENTER_WATCHDOG;
		}else if(!isFinite(window.DUMB_PREVENTER_WATCHDOG_TIME)){
			window.DUMB_PREVENTER_WATCHDOG_TIME = DEFAULT_DUMB_PREVENTER_WATCHDOG;
			logError('DUMB_PREVENTER_WATCHDOG_TIME is not a number. Defined an default time: ' + DEFAULT_WATCHDOG);
		}
	
		function logError(msg){
			return (!!console && !!console.error ?
				console.error(msg) :
				alert(msg) // throw new error can breaks the execution
			);
		};
	
		function log(msg){
			return (!!console && !!console.log ?
				console.log(msg) :
				null
			);
		};
	
		function isArray(o){
			// @todo TODO change this to be CrossBrowser and also accept OLD Browsers
			return Array.isArray(o);
		}
	
		function findPos(obj) {
			var curtop = 0;
			if (obj.offsetParent) {
				do {
					curtop += obj.offsetTop;
				} while (obj = obj.offsetParent);
			return curtop;
			}
		}
	
		function getHeight(element){
			return parseInt(window.getComputedStyle(element).height.replace('px', ''), 10) || 0;
		}
	
		var isolatedRunner = defineIsolatedRunner();
		window.isolatedRunner = isolatedRunner;
		isolatedRunner._setUp();
	
		return isolatedRunner;
	});
	
}());