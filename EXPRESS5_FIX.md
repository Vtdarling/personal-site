# Express 5 Compatibility Fix

## Problem

The application was experiencing the following error:
```
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

## Root Cause

In Express 5.x, the `req.query` property was changed from a regular data property to a read-only getter property with no setter. The `express-mongo-sanitize` package (v2.2.0) is incompatible with this change because it attempts to reassign `req.query` after sanitization:

```javascript
// This fails in Express 5:
req.query = sanitizedQuery; // TypeError!
```

## Solution

Created a custom Express 5-compatible MongoDB sanitization middleware at `middleware/mongo-sanitize-express5.js` that:

1. **For writable properties** (body, params, headers): Sanitizes them in-place as before
2. **For req.query**: 
   - Gets the query object from the prototype getter
   - Sanitizes it in-place
   - Shadows the prototype getter by defining a direct property on the request object

```javascript
// Express 5 compatible approach:
const query = req.query; // Get from prototype getter
sanitizeObject(query, options); // Sanitize in-place
Object.defineProperty(req, 'query', { // Shadow the getter
  value: query,
  writable: true,
  enumerable: true,
  configurable: true
});
```

## Security Features

The middleware maintains all security protections:

- **MongoDB Injection Protection**: Removes or replaces dangerous operators
  - Keys starting with `$` → `$where` becomes `_where`
  - Keys containing `.` → `user.name` becomes `user_name`
- **Nested Object Support**: Recursively sanitizes nested objects and arrays
- **Prototype Pollution Protection**: Explicitly blocks `__proto__`, `constructor`, and `prototype` keys
- **Configurable**: Supports the same options as express-mongo-sanitize

## Testing

Comprehensive integration tests verify:
- ✅ Query parameter sanitization
- ✅ Body sanitization
- ✅ Nested objects and arrays
- ✅ Clean data passes through unchanged
- ✅ Sanitization callbacks work correctly

## Migration

No migration needed for application code. The fix is a drop-in replacement:

```javascript
// Before:
const mongoSanitize = require('express-mongo-sanitize');

// After:
const mongoSanitize = require('./middleware/mongo-sanitize-express5');
```

## Security Scan Results

- **CodeQL**: 0 alerts
- **All security patterns**: Properly handled
- **No regressions**: Maintains same security level as express-mongo-sanitize

## References

- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html)
- [express-mongo-sanitize on npm](https://www.npmjs.com/package/express-mongo-sanitize)
- [MongoDB Injection Prevention](https://owasp.org/www-community/attacks/NoSQL_injection)
