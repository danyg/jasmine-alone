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
		var tabChar = '    ';
		if (undefined === tabs) {
			tabs = tabChar;
		}

		var result = results[suite.id], m;
		if (!!result) {

			var txt = suite.name + ': ';
			var i;

			if (result.result !== 'passed') {
				txt += result.result.toUpperCase();

				for (i in result.messages) {
					if (result.messages.hasOwnProperty(i)) {
						m = result.messages[i];
						if(m.actual === undefined && m.matcherName  === undefined && m.expected === undefined){
							txt += '\n' + tabs + tabChar + m.message;
						}else{
							txt += '\n' + tabs + tabChar + m.type + ' ' + m.actual + ' ' + m.matcherName + ' ' + m.expected;
						}

						txt += ' ('+ (m.passed_ ? 'PASSED': m.skipped ? 'SKIPPED' : 'FAILED')+')';
					}
				}
			}

			if(result.messages.length === 0) {
				txt += 'SKIPPED';
			} else {
				txt += 'PASSED';
			}


			for (i in suite.children) {
				if (suite.children.hasOwnProperty(i)) {
					txt += '\n' + tabs + printSuite(suite.children[i], results, tabs + tabChar);
				}
			}

			return txt;
		} else {
			return suite.name + ': SKIPPED';

		}
	}

	return printReporter;
});
