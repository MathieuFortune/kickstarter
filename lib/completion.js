/**
 * This file is part of the Meup Kickstarter.
 *
 * (c) 1001pharmacies <http://github.com/1001pharmacies/kicksterter>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

var CUSTOM  = [''];
var BOOLEAN = false;

var options = {
  start: {
    '--tasks': CUSTOM,
    '--port': CUSTOM,
    '--open': BOOLEAN,
    '--log-level': ['disable', 'debug', 'info', 'warn', 'error'],
    '--colors': BOOLEAN,
    '--no-colors': BOOLEAN,
    '--help': BOOLEAN
  },
  init: {
    '--log-level': ['disable', 'debug', 'info', 'warn', 'error'],
    '--colors': BOOLEAN,
    '--no-colors': BOOLEAN,
    '--help': BOOLEAN
  }
};

var parseEnv = function (argv, env) {
  var words = argv.slice(5);

  return {
    words: words,
    count: parseInt(env.COMP_CWORD, 10),
    last: words[words.length - 1],
    prev: words[words.length - 2]
  };
};

var opositeWord = function (word) {
  if (word.charAt(0) !== '-') {
    return null;
  }

  return word.substr(0, 5) === '--no-' ? '--' + word.substr(5) : '--no-' + word.substr(2);
};

var sendCompletionNoOptions = function () {};

var sendCompletion = function (possibleWords, env) {
  var regexp = new RegExp('^' + env.last);
  var filteredWords = possibleWords.filter(function (word) {
    return regexp.test(word) && env.words.indexOf(word) === -1 &&
      env.words.indexOf(opositeWord(word)) === -1;
  });

  if (!filteredWords.length) {
    return sendCompletionNoOptions(env);
  }

  filteredWords.forEach(function (word) {
    console.log(word);
  });
};

var glob = require('glob');
var globOpts = {
  mark: true,
  nocase: true
};

var sendCompletionFiles = function (env) {
  glob(env.last + '*', globOpts, function (err, files) {
    if (err) return console.error(err);

    if (files.length === 1 && files[0].charAt(files[0].length - 1) === '/') {
      sendCompletionFiles({last: files[0]});
    } else {
      console.log(files.join('\n'));
    }
  });
};

var sendCompletionConfirmLast = function (env) {
  console.log(env.last);
};

var complete = function (env) {
  if (env.count === 1) {
    if (env.words[0].charAt(0) === '-') {
      return sendCompletion(['--help', '--version'], env);
    }

    return sendCompletion(Object.keys(options), env);
  }

  if (env.count === 2 && env.words[1].charAt(0) !== '-') {
    // complete files (probably kickstarter.conf.js)
    return sendCompletionFiles(env);
  }

  var cmdOptions = options[env.words[0]];
  var previousOption = cmdOptions[env.prev];

  if (!cmdOptions) {
    // no completion, wrong command
    return sendCompletionNoOptions();
  }

  if (previousOption === CUSTOM && env.last) {
    // custom value with already filled something
    return sendCompletionConfirmLast(env);
  }

  if (previousOption) {
    // custom options
    return sendCompletion(previousOption, env);
  }

  return sendCompletion(Object.keys(cmdOptions), env);
};

var completion = function () {
  if (process.argv[3] === '--') {
    return complete(parseEnv(process.argv, process.env));
  }

  // just print out the kickstarter-completion.sh
  var fs = require('fs');
  var path = require('path');

  fs.readFile(path.resolve(__dirname, '../kickstarter-completion.sh'), 'utf8', function (err, data) {
    if (err) return console.error(err);

    process.stdout.write(data);
    process.stdout.on('error', function (error) {
      // Darwin is a real dick sometimes.
      //
      // This is necessary because the "source" or "." program in
      // bash on OS X closes its file argument before reading
      // from it, meaning that you get exactly 1 write, which will
      // work most of the time, and will always raise an EPIPE.
      //
      // Really, one should not be tossing away EPIPE errors, or any
      // errors, so casually.  But, without this, `. <(kickstarter completion)`
      // can never ever work on OS X.
      if (error.errno === 'EPIPE') {
        error = null;
      }
    });
  });
};

exports.completion = completion;
