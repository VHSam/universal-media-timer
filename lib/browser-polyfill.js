(function (global, factory) {
  if (typeof define === 'function' && define.amd) {
    define('webextension-polyfill', ['module'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(module);
  } else {
    var e = factory();
    global.browser = e;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  if (typeof browser === 'undefined') {
    // Если это Chrome (нет нативного browser), создаем обертку
    var _browser = typeof chrome !== 'undefined' ? chrome : null;
    if (_browser) {
      browser = _browser;
    }
  }
  return browser;
});