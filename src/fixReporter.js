/* 
 * 
 *  @overview 
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 * 
 */

define([], function(){
	
	function fixReporter(reporter){
		var parentRunner = jasmine.getEnv().currentRunner()//,
//			reporter = getReporter()
		;

		var childSpecs = [],
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
		   queue = []
		;

		function proxyMethod(method){
			if(!!reporter[method]){
				oMethods[method] = reporter[method];
				reporter[method] = function(){
					queue.push([method, arguments]);
				};
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
			var specs = parentRunner.specs(), spec;
			// FIX SUITES IDS
			for(var i = 0; i < specs.length; i++){
				spec = specs[i];
				spec.id = i;
				if(!childSuites.hasOwnProperty(spec.suite.getFullName()) ){
					spec.suite.id = ++suites;
					childSuites[ spec.suite.getFullName() ] = spec.suite;
				}
			}

			if(!!oMethods.reportRunnerStarting){
				oMethods.reportRunnerStarting.call(reporter, parentRunner);
				var q = document.getElementById('HTMLReporter'),
					o = document.getElementById('isolated-test-workarea');
				if(q){
					o.appendChild(q.parentNode.removeChild(q));
				}
			}
			var a;
			for(var i = 0; i < queue.length; i++){
				a = queue[i];
				method = a[0];
				args = a[1];

				if(!!oMethods[ method ]){
					oMethods[ method ].apply(reporter, args);
				}
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
