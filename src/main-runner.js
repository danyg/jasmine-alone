/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([
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

				var left = window.screenX + this.workarea.offsetLeft;
				var top = window.screenY + this.workarea.offsetTop;
				var W = this.workarea.clientWidth;
				var H = this.workarea.clientHeight;

				this._defaultReporter._ExecutingSpecFile(testObj.getSpecFile());

				testObj.open(left, top, W, H);
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