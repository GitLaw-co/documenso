'use strict';

/**
 * Runtime shim for @lingui/core/macro.
 *
 * Handles both usage patterns:
 *   msg`Some text`           -- tagged template literal
 *   msg({ message: 'Text' }) -- function call with descriptor
 */
function msg(stringsOrDescriptor, ...values) {
  if (
    stringsOrDescriptor &&
    typeof stringsOrDescriptor === 'object' &&
    !Array.isArray(stringsOrDescriptor) &&
    !stringsOrDescriptor.raw
  ) {
    const message = stringsOrDescriptor.message || '';
    return { id: stringsOrDescriptor.id || message, message };
  }

  const strings = stringsOrDescriptor;
  const message = strings.reduce(
    (acc, str, i) => acc + str + (values[i] !== undefined ? String(values[i]) : ''),
    '',
  );
  return { id: message, message };
}

function t(stringsOrDescriptor, ...values) {
  if (
    stringsOrDescriptor &&
    typeof stringsOrDescriptor === 'object' &&
    !Array.isArray(stringsOrDescriptor) &&
    !stringsOrDescriptor.raw
  ) {
    return stringsOrDescriptor.message || '';
  }

  const strings = stringsOrDescriptor;
  return strings.reduce(
    (acc, str, i) => acc + str + (values[i] !== undefined ? String(values[i]) : ''),
    '',
  );
}

module.exports = { msg, t, plural: () => '', select: () => '', selectOrdinal: () => '' };
module.exports.default = module.exports;
