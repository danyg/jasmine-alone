/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */
/* global jasmine: true, document: true, window: true, define: true */
define([
	'./route',
	'./tests',
	'./printer',
	'./fixReporter',
	'./jasmine-html-isolated',
	'./fixJasmineXit',
	'css!jasmine-alone'
], function(
	route,
	tests,
	printReporter,
	fixReporter,
	HtmlReporter
){

	'use strict';

	var DEFAULT_TEST_EXECUTION_TIMEOUT = 60000,
		DEFAULT_TEST_LOAD_TIMEOUT = 3000
	;

	function defineIsolatedRunner() { // because lint
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
				this._idsForSpecNSuites = ['?'];
				this._timeForSpecFile = {};
				this._failedSpecsFiles = 100000;
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
					this._markTime('testEnd', test.getSpecFile());

					reporter = test.getReporter();
					childRunner = test.getChildRunner();
					specFile = test.getSpecFile();

					if(!!reporter){
						this._checkIsPassed(reporter, specFile);
						this._printReporter(reporter, specFile);
					} else {
						this._failed = true;
						test.onFinish(false);
					}

					if(!!childRunner){
						this._addChildSpecs(specFile, childRunner);
					}
				}
			},

			_requireErrorHandler: function(err) {
				var failedId = err.requireModules && err.requireModules[0],
					currentSpecFile = 'MAIN PROCESS';

				if(route.isAlone()) {
					currentSpecFile = route.getCurrentSpecFile();
				}

				throw new Error('Error Loading Dependencies in [' + currentSpecFile + '], dependency error: [' + failedId + ']' + (!!err.message ? ' due ' + err.message : ''));
			},

			/**
			 * Execute the suite when is in Alone mode, that is execute just one spec
			 * must be called from the html runner
			 */
			run: function(){
				var me = this;

				if(!this.init()){
					// do nothing?
					window.require(this._specs, function(){
						me._executeBeforeExecuteTests();
						jasmine.getEnv().execute();
					}, this._requireErrorHandler.bind(this));

					return;
				}else{
					if(route.isAlone()){
						this._onFinish = this._onFinishAloneMode;

						window.require(this._specs, function(){
							if(!!me._parentWindow && !!me._parentWindow.isolatedRunner){
								me._parentWindow.isolatedRunner.onChildStart(route.getCurrentSpecFile());
							}
							me._executeBeforeExecuteTests();

							if(!!me.getExternalReporter()){
								jasmine.getEnv().addReporter(me.getExternalReporter());
							}
							me._executeJasmine();

						}, this._requireErrorHandler.bind(this));
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

			onChildStart: function(specFile) {
				this.setCurrentTestObj(tests.getTestBySpec(specFile));
				var testObj = this.getCurrentTestObj();

				this._defaultReporter._ExecutingSpecFile(testObj.getSpecFile());
				this._clearDumbPreventerWatchDog();
				testObj.onRun();
				this._markTime('loadingStop', specFile);

				log('Loaded: ' + specFile + ' in: ' + this._getTimeDiff(specFile, 'loadingStop', 'loadingStart'));

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

					this._hackReportToMarkItAsFailed(reporter, childRunner, specFile);

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
				if(!this._parentWindow){
					this._printReporter(this._reporter);
				}
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

				this._specs = this._findSpecs();
				tests.setRunner(this);
				tests.createTestsObjects(this._specs);

				this.setCurrentTestObj( tests.getTestBySpec(route.getCurrentSpecFile()) );
				this.load();
			},

			_createDOMContext: function(){
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
					log('TIMEOUT for: ' + this.getCurrentTestObj().getSpecFile());
					this.getCurrentTestObj().markAsTimeout();
					this._reportSpecFileAsTimeout(this.getCurrentTestObj().getSpecFile(), this._testWindow.jasmine.getEnv().currentRunner());
				}

				if(this._finished === false) {
					this._ix++;
					if(this._ix >= tests.getLength()){
						this._onFinish();
					}else{
						var testObj = tests.getIndex(this._ix);
						this._runTest(testObj);
					}
				} else {
					this._onFinish();
				}
			},

			_runTest: function(testObj) {
				this.setCurrentTestObj( testObj );
				this._defaultReporter._ExecutingSpecFile(testObj.getSpecFile());
				this.load();
			},

			load: function(){
				var testObj = this.getCurrentTestObj();
				if(!route.isAlone()){
					testObj.markAsLoading();

					// this._defaultReporter._ExecutingSpecFile(this._currentSpecFile);
					this._setWatchdog();
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
				} else {
					if (!!window._phantom) {
						this._defaultReporter = new jasmine.JsApiReporter();
					} else {
						if(route.isAlone()){
							this._defaultReporter = new jasmine.HtmlReporter();
						}else{
							this._defaultReporter = new HtmlReporter();
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

					if(!window._phantom){
						var viewReporter = new HtmlReporter();
						viewReporter.toBody = true;
						jasmine.getEnv().addReporter(viewReporter);
					}
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
					window.TEST_EXECUTION_TIMEOUT
				);
			},

			_setDumbPreventerWatchdog: function(){
				this._clearDumbPreventerWatchDog();

				this._watchdogDumbPreventerTimer = setTimeout(
					this._startTestWindow.bind(this, true),
					window.TEST_LOAD_TIMEOUT
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
				this._markTime('loadingStart', testObj.getSpecFile());

				var left = window.screenX + this.workarea.offsetLeft;
				var top = window.screenY + this.workarea.offsetTop;
				var W = this.workarea.clientWidth;
				var H = this.workarea.clientHeight;

				this._testWindow = window.open(testObj.getSRC(), 'currentTest', 'width=' + W + ', height=' + H + ', left=' + left + ', top=' + top + ', scrollbars=yes, resizable=yes');
				this._setDumbPreventerWatchdog();
				log('Loading: ' + testObj.getSpecFile() + (retry ? '[RETRY]' : ''));
			},

			_markTime: function (timeKey, specFile) {
				if(!this._timeForSpecFile.hasOwnProperty(specFile)){
					this._timeForSpecFile[specFile] = {};
				}
				this._timeForSpecFile[specFile][timeKey] = Date.now();
			},

			_getTimeDiff: function (specFile, timeKeyA, timeKeyB){
				if(!this._timeForSpecFile.hasOwnProperty(specFile)){
					return 0;
				}
				var timeA = this._timeForSpecFile[specFile][timeKeyA];
				var timeB = this._timeForSpecFile[specFile][timeKeyB];

				return (timeA - timeB).toString() + 'ms';
			},

			_printReporter: function(reporter, specFile){
				var extra = '';
				if(specFile){
					extra += '\n ' + specFile;
					extra += '\n Tests executed in: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStop');
					extra += '\n Total time: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStart');
				}
				log( printReporter(reporter) + extra);
			},

			_checkIsPassed: function(reporter, specFile){
				var passedState = false,
					results = reporter.results(),
					result,
					id,
					rCount = 0
				;

				for (id in results) {
					rCount++;
					result = results[id];
					passedState = result.result === 'passed';
					if (!passedState) {
						break;
					}
				}

				var test = tests.getTestBySpec(specFile);
				test.onFinish(passedState);
			},

			_hackReportToMarkItAsFailed: function(reporter, runner, specFile) {
				try {
					var results = reporter.results(),
						rCount = 0,
						id
					;

					for (id in results) {
						rCount++;
					}

					if(rCount === 0) {
						this._reportSpecFileAsFailed(specFile, runner);
					}
				} catch(e) {
					logError(e);
				}
			},

			_reportSpecFileAsTimeout: function(specFile, runner) {
				this._reportSpecFileAs('should not Timeout', specFile, runner);
			},

			_reportSpecFileAsFailed: function(specFile, runner) {
				this._reportSpecFileAs('should run successfully', specFile, runner);
			},

			_reportSpecFileAs: function(label, specFile, runner) {

				if(runner === undefined) {
					runner = jasmine.getEnv().currentRunner();
				}

				var suite = this._getSpecFileErrorSuite();

				var spec = new jasmine.Spec(
					runner.env,
					suite,
					specFile + ' ' + label
				);

				spec.id = this._failedSpecsFiles++;
				spec.getSpecFile = suite.getSpecFile;

				suite.add(spec);
				runner.addSuite(suite);

				if(!!this._defaultReporter.reportRunnerStarting){
					this._defaultReporter.reportRunnerStarting(runner);
				}
				if(!!this._defaultReporter.reportSpecStarting){
					this._defaultReporter.reportSpecStarting(spec);
				}

				spec.expect(false).toBe(true, 'the spec file ' + specFile + ' ' + label);

				this._defaultReporter.reportSpecResults(spec);

				this._defaultReporter.reportSuiteResults(suite);

				if(!!this._defaultReporter.reportRunnerResults) {
					this._defaultReporter.reportRunnerResults(runner);
				}
			},

			_getSpecFileErrorSuite: function() {
				if(!this._specFileErrorSuite) {
					this._specFileErrorSuite = new jasmine.Suite(
						jasmine.getEnv(),
						'All spec files should run successfully',
						function(){}
					);

					this._specFileErrorSuite.getSpecFile = function() {
						return 'Main Process';
					};
				}
				return this._specFileErrorSuite;
			},

			_addChildSpecs: function(specFile, runner){
				this._childSpecsObjectsBySpecFile[specFile] = runner.specs();
				this._processSpecsByFile(this._childSpecsObjectsBySpecFile[specFile], specFile, []);
			},


			getSpecs: function(){
				var specs = [], specFile, i;
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

			_fixSpecNSuite: function(spec, specFile) {
				var f = function(){
					return specFile;
				};
				if(!spec.getSpecFile) {
					spec.getSpecFile = f;
				}
				this._setSuiteRelWithSpecFile(spec.suite, specFile);
				if(!spec.suite.getSpecFile) {
					spec.suite.getSpecFile = f;
				}
			},

			_setSuiteRelWithSpecFile: function(suite, specFile) {
				var f = function(){
					return specFile;
				};
				if(!suite.getSpecFile) {
					suite.getSpecFile = f;
				}
				suite.id = this._getSuiteId(suite, specFile);

				while (!!suite.parentSuite) {
					suite = suite.parentSuite;
					if(!suite.getSpecFile) {
						suite.getSpecFile = f;
					}
					suite.id = this._getSuiteId(suite, specFile);
				}

			},

			_getSpecId: function(spec, specFile) {
				if(!spec.hasOwnProperty('______id')){
					spec.______id = spec.id;
				}
				return this._getUID('Spec', specFile, spec.______id);
			},

			_getSuiteId: function(suite, specFile){
				if(!suite.hasOwnProperty('______id')){
					suite.______id = suite.id;
				}

				var suiteNameID = suite.getFullName();

				return this._getUID('Suite', specFile + '_' + suiteNameID, suite.______id);
			},

			_getUID: function(type, specFile, id){
				var internalID = type + '_' + specFile + '_' + id;
				//	var id = this._idsForSpecNSuites.indexOf(internalID);
				//	if(id === -1){
				//		id = this._idsForSpecNSuites.push(internalID) - 1;
				//	}
				return internalID.replace(/[\s\W]/g, '_').toLowerCase();
			},

			_closeTestWindow: function(){
				if (!!this._testWindow && !!this._testWindow.close) {
					this._testWindow.close();
				}
			}
		};

		return isolatedRunner;
	}

	function colorize(txt, baseColor){
		var passedC = '\u001b[1;32m',
			skipedC = '\u001b[1;95m',
			failedC = '\u001b[1;31m'
		;
		if(baseColor === undefined) {
			baseColor = '\u001b[0m';
		}

		txt = txt.replace(
			new RegExp(escapeRegExp(printReporter.PASSMARK), 'g'),
			passedC + '\u2714' + baseColor
		);
		txt = txt.replace(
			new RegExp(escapeRegExp(printReporter.FAILMARK), 'g'),
			failedC + '\u0078' + baseColor
		);
		txt = txt.replace(
			new RegExp(escapeRegExp(printReporter.SKIPMARK), 'g'),
			skipedC + '\u25CF' + baseColor
		);

		return txt;
	}

	function escapeRegExp(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	}

	function logError(msg){
		return (!!window.console && !!window.console.error ?
			window.console.error(msg) :
			window.alert(msg) // throw new error can breaks the execution
		);
	}

	function log(msg){
		if(!!window._phantom) {
			setTimeout(function () {
				var eMsg = '';
				eMsg += '\n\n';
				eMsg += '\u001b[1;36m\n';
				eMsg += '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n';
				eMsg += '\u001b[37mINFO: ';
				eMsg += '\n';
				eMsg += colorize(msg, '\u001b[37m');
				eMsg += '\n';
				eMsg += '\u001b[1;36m>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n';
				eMsg += '\n\u001b[0m';
				throw new Error(eMsg);
			},1);
		}

		return (!!window.console && !!window.console.log ?
			window.console.log(msg) :
			null
		);
	}

	function isArray(o){
		// @todo TODO change this to be CrossBrowser and also accept OLD Browsers
		return Array.isArray(o);
	}

	function findPos(obj) {
		var curtop = 0;
		if (obj.offsetParent) {

			do {
				curtop += obj.offsetTop;
			} while (!!(obj = obj.offsetParent));
		}

		return curtop;
	}

	function getHeight(element){
		return parseInt(window.getComputedStyle(element).height.replace('px', ''), 10) || 0;
	}

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

	if(undefined === window.TEST_EXECUTION_TIMEOUT){
		window.TEST_EXECUTION_TIMEOUT = DEFAULT_TEST_EXECUTION_TIMEOUT;
	}else if(!isFinite(window.TEST_EXECUTION_TIMEOUT)){
		window.TEST_EXECUTION_TIMEOUT = DEFAULT_TEST_EXECUTION_TIMEOUT;
		logError('TEST_EXECUTION_TIMEOUT is not a number. Defined an default time: ' + DEFAULT_TEST_EXECUTION_TIMEOUT);
	}
	if(undefined === window.TEST_LOAD_TIMEOUT){
		window.TEST_LOAD_TIMEOUT = DEFAULT_TEST_LOAD_TIMEOUT;
	}else if(!isFinite(window.TEST_LOAD_TIMEOUT)){
		window.TEST_LOAD_TIMEOUT = DEFAULT_TEST_LOAD_TIMEOUT;
		logError('TEST_LOAD_TIMEOUT is not a number. Defined an default time: ' + DEFAULT_TEST_EXECUTION_TIMEOUT);
	}

	var isolatedRunner = defineIsolatedRunner();
	window.isolatedRunner = isolatedRunner;
	isolatedRunner._setUp();

	return isolatedRunner;
});
