/* jshint ignore:start */
define([], function() {

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
/* jshint ignore:end */