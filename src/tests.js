/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define(['./route', './Test'], function(route, Test){

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