'use strict';

// If user passed `-c` or `--check` arguments to Node, check its syntax
// instead of actually running the file.

const {
  prepareMainThreadExecution
} = require('internal/bootstrap/pre_execution');

const {
  readStdin
} = require('internal/process/execution');

const { pathToFileURL } = require('url');

const {
  stripShebangOrBOM,
} = require('internal/modules/cjs/helpers');

const {
  Module: {
    _resolveFilename: resolveCJSModuleName,
  },
  wrapSafe,
} = require('internal/modules/cjs/loader');

// TODO(joyeecheung): not every one of these are necessary
prepareMainThreadExecution(true);

if (process.argv[1] && process.argv[1] !== '-') {
  // Expand process.argv[1] into a full path.
  const path = require('path');
  process.argv[1] = path.resolve(process.argv[1]);

  // Read the source.
  const filename = resolveCJSModuleName(process.argv[1]);

  const fs = require('fs');
  const source = fs.readFileSync(filename, 'utf-8');

  markBootstrapComplete();

  checkSyntax(source, filename);
} else {
  markBootstrapComplete();

  readStdin((code) => {
    checkSyntax(code, '[stdin]');
  });
}

function checkSyntax(source, filename) {
  const { getOptionValue } = require('internal/options');
  const experimentalModules = getOptionValue('--experimental-modules');
  if (experimentalModules) {
    let isModule = false;
    if (filename === '[stdin]' || filename === '[eval]') {
      isModule = getOptionValue('--input-type') === 'module';
    } else {
      const resolve = require('internal/modules/esm/default_resolve');
      const { format } = resolve(pathToFileURL(filename).toString());
      isModule = format === 'module';
    }
    if (isModule) {
      const { ModuleWrap } = internalBinding('module_wrap');
      new ModuleWrap(source, filename);
      return;
    }
  }

  wrapSafe(filename, stripShebangOrBOM(source));
}
