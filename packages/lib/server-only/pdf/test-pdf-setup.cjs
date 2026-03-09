/**
 * Preload script for test-pdf-render.ts.
 *
 * Redirects @lingui/core/macro (and related macro modules) to a runtime shim,
 * since the Babel/Vite compile-time transform is unavailable when running
 * via tsx directly.
 */
'use strict';

const Module = require('node:module');
const path = require('node:path');

const shimPath = path.join(__dirname, 'test-lingui-macro-shim.js');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (
    request === '@lingui/core/macro' ||
    request === '@lingui/react/macro' ||
    request === '@lingui/babel-plugin-lingui-macro/macro'
  ) {
    return shimPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
