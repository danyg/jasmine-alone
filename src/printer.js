/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([], function(){
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
