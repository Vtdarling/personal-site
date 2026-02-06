// Express 5 compatible MongoDB sanitization middleware
// This replaces express-mongo-sanitize which is incompatible with Express 5.x

'use strict';

const TEST_REGEX = /^\$|\./;
const REPLACE_REGEX = /^\$|\./g;

function isPlainObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function withEach(target, cb) {
  (function act(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(act);
    } else if (isPlainObject(obj)) {
      Object.keys(obj).forEach(function (key) {
        const val = obj[key];
        const resp = cb(obj, val, key);
        if (resp.shouldRecurse) {
          act(obj[resp.key || key]);
        }
      });
    }
  })(target);
}

function sanitizeObject(obj, options) {
  const replaceWith = options.replaceWith || '_';
  let isSanitized = false;

  withEach(obj, function (parent, val, key) {
    let shouldRecurse = true;
    let finalKey = key;

    if (TEST_REGEX.test(key)) {
      isSanitized = true;
      delete parent[key];
      
      if (replaceWith) {
        const newKey = key.replace(REPLACE_REGEX, replaceWith);
        // Avoid prototype pollution
        if (newKey !== '__proto__' && newKey !== 'constructor' && newKey !== 'prototype') {
          parent[newKey] = val;
          finalKey = newKey;
        }
      } else {
        shouldRecurse = false;
      }
    }

    return {
      shouldRecurse: shouldRecurse,
      key: finalKey,
    };
  });

  return isSanitized;
}

/**
 * Express 5 compatible MongoDB sanitization middleware
 * @param {{replaceWith?: string, onSanitize?: function}} options
 * @returns {function}
 */
function mongoSanitize(options = {}) {
  const hasOnSanitize = typeof options.onSanitize === 'function';
  
  return function (req, res, next) {
    // Sanitize body, params, and headers (which are writable)
    ['body', 'params', 'headers'].forEach(function (key) {
      if (req[key]) {
        const isSanitized = sanitizeObject(req[key], options);
        if (isSanitized && hasOnSanitize) {
          options.onSanitize({ req, key });
        }
      }
    });

    // Handle query specially for Express 5
    // The query property is a getter on the prototype with no setter.
    // We need to get the query object, sanitize it, and then shadow 
    // the prototype getter with a direct property on the request object.
    if (req.query) {
      const originalQuery = req.query;
      const isSanitized = sanitizeObject(originalQuery, options);
      
      if (isSanitized) {
        // Shadow the prototype getter with a direct property
        Object.defineProperty(req, 'query', {
          value: originalQuery,
          writable: true,
          enumerable: true,
          configurable: true
        });
        
        if (hasOnSanitize) {
          options.onSanitize({ req, key: 'query' });
        }
      }
    }

    next();
  };
}

module.exports = mongoSanitize;
