/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([], function(){

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