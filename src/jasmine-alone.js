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
	'./jasmine-html-isolated'
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
					this._runAllBtn.setAttribute('disabled', 'disabled');
					this._onFinish = this._onFinishIsolatedAllMode;

					this._ix = -1;
					this._next();
				} else {
					throw new Error('Trying to execute all specs in alone mode! Avoiding inifite recursion');
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
						if(!!cbk && !!cbk.constructor && cbk.constructor.toLowerCase() === 'function'){
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
					// executed on PARENT
					this._clearWatchDog();

					if(reporter){
						this._printReporter(reporter);
						this._checkIsPassed(reporter, specFile);
					}

					this._addChildSpecs(specFile, childRunner);

					// check if is runned again or using the button
					this._closeTestWindow();
					this._next();
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

			_onFinishIsolatedAllMode: function(){
				this._runAllBtn.removeAttribute('disabled');

				this._defaultReporter.onFinishSuite();
				this._defaultReporter.finished = true;

				this._printReporter(this._reporter);


//				this._iframe.style.display = 'none';
				// @todo TODO show the merged HTML REPORT
				// @todo TODO fix the links in order to point to specFile instead jasmine internal spec
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

				var workarea = document.createElement('div');
				workarea.className = 'isolated-test-workarea';
				workarea.id = 'isolated-test-workarea';

//				this._iframe = document.createElement('iframe');
//				this._iframe.id = 'isolated-tests-iframe';
//				this._iframe.setAttribute('frameborder', 0);
//				this._iframe.setAttribute('scrolling', 'no');

//				workarea.appendChild(this._iframe);

				this._containerElement.appendChild(this._specList);
				this._containerElement.appendChild(workarea);

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

			_next: function(timeout){
				if(timeout && !!tests.getIndex(this._ix)){
					tests.getIndex(this._ix).markAsTimeout();
				}


				this._ix++;
				if(this._ix >= tests.getLength()){
					this._onFinish();
				}else{
					this.setCurrentTestObj( tests.getIndex(this._ix) );
					this.load();
				}
			},

			load: function(){
				var testObj = this.getCurrentTestObj();
				if(!route.isAlone()){
					testObj.markAsLoading();

					this._defaultReporter._ExecutingSpecFile(this._currentSpecFile);
					this._setWatchdog();
					this._closeTestWindow();
					this._startTestWindow();

				}else{
					this._specs = [testObj.getSpecFile()];
				}
			},

			getRunningSpec: function(){
				return this._currentSpecFile;
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
					
					var viewReporter = new jasmine.HtmlReporter();
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
				this._testWindow = window.open(testObj.getSRC(), 'currentTest', 'width=880, height=600, left=1020, top=50, scrollbars=yes, resizable=yes');
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
				if(!spec.______id){
					spec.______id = spec.id;
				}
				return this._getUID('Spec', specFile, spec.______id);
			},
			
			_getSuiteId: function(suite, specFile){
				if(!suite.______id){
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
