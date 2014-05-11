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
	
	var DEFAULT_WATCHDOG = 60000;

	function defineIsolatedRunner(){ // because lint
		var isolatedRunner = {
			ISOLATED: false,

			_ix: null,
			_specs: null,
			_watchdogTimer: null,
			_reporter: null,

			// DOM PROPERTIES
			_iframe: null,
			_specList: null,
			_runAllBtn: null,
			_isRunningInIframe: null,
			
			_setUp: function(){
				this._parentWindow = window.parent;
				if(this._parentWindow !== window){
					if(!!this._parentWindow.isolatedRunner){
						this._isRunningInIframe = true;
					}
				}
				
				this._childSpecsObjectsBySpecFile = {};
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
				}else{
					throw new Error('Trying to execute all specs in alone mode! Avoiding inifite recursion');
				}
			},
			
			/**
			 * Execute the suite when is in Alone mode, that is execute just one spec
			 * must be called from the html runner
			 */
			run: function(){
				if(!this.init()){
					// do nothing?
					require(this._specs, function(){
						this._executeBeforeExecuteTests();
						this._executeJasmine();
					});

					return;
				}else{
					if(route.isAlone()){
						var me = this;
						this._onFinish = this._onFinishAloneMode;
						
						require(this._specs, function(){
							me._executeBeforeExecuteTests();

							jasmine.getEnv().addReporter(me._reporter);
							if(!!me.getExternalReporter()){
								jasmine.getEnv().addReporter(me.getExternalReporter());
							}
							me._executeJasmine();
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

					this._iframe.style.height = height + 'px';

					// @todo TODO the specFile is not for the log, this is only for lint
					// the specFile could be used to set the height of the specified iframe
					// if in some moment we return to use a iframe for every spec
					// instead to use the same for every one
					log(specFile + ' setHeight: ' + height);
				}
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
				
				this._iframe.style.display = 'none';
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

				this.load(tests.getTestBySpec(route.getCurrentSpecFile()));
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
				
				this._iframe = document.createElement('iframe');
				this._iframe.id = 'isolated-tests-iframe';
				this._iframe.setAttribute('frameborder', 0);
				this._iframe.setAttribute('scrolling', 'no');
				
				workarea.appendChild(this._iframe);
				
				this._containerElement.appendChild(this._specList);
				this._containerElement.appendChild(workarea);
				
				document.body.appendChild(this._containerElement);
				
				this._fillTestsList();
			},
			
			_fillTestsList: function(){
				var i, testObj;
				for(i = 0; i < tests.getLength(); i++){
					testObj = tests.getIndex(i);
					this._specList.appendChild(
						testObj.createListElement()
					);
				}
			},

			//**********************************************************************
			// ITERATION & LOAD METHODS
			//**********************************************************************
			_next: function(){
				this._setWatchdog();

				this._ix++;
				if(this._ix >= tests.getLength()){
					this._onFinish();
				}else{
					this.load(tests.getIndex(this._ix));
				}
			},

			load: function(testObj){
				this._currentSpecFile = testObj.getSpecFile();
				if(!route.isAlone()){
					this._defaultReporter._ExecutingSpecFile(this._currentSpecFile);
					testObj.onRun();
					this._iframe.style.display = 'block';
					this._iframe.src = testObj.getSRC();
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
					this._next.bind(this), 
					window.ISOLATED_TEST_WATCHDOG_TIME
				);
			},
			
			_clearWatchDog: function(){
				clearTimeout(this._watchdogTimer);
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
	
	var isolatedRunner = defineIsolatedRunner();
	window.isolatedRunner = isolatedRunner;
	isolatedRunner._setUp();
	
	return isolatedRunner;
});
