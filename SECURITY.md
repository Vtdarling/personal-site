# Security Policy

## 🔒 Security Features

This application implements multiple layers of security to protect against common web vulnerabilities and attacks.

### 1. Authentication & Authorization

- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
- **Session Management**: Secure session handling with httpOnly, secure, and sameSite cookies
- **Account Lockout**: Automatic lockout after 5 failed login attempts for 15 minutes
- **Two-Level Access**: Separate authentication for main site and archive access
- **Audit Logging**: Comprehensive logging of all authentication events with IP tracking

### 2. Input Validation & Sanitization

- **MongoDB Injection Protection**: `express-mongo-sanitize` prevents NoSQL injection attacks
- **XSS Prevention**: Input sanitization removes malicious HTML/script tags
- **Validation Middleware**: All user inputs are validated using `express-validator`
- **Content Length Limits**: 
  - Story titles: 200 characters max
  - Story content: 50,000 characters max
  - Fitness messages: 500 characters max
  - Request body: 10MB limit

### 3. Security Headers (Helmet)

- **Content Security Policy (CSP)**: Restricts resource loading to trusted sources
- **HSTS**: Forces HTTPS connections with 1-year max-age
- **X-Frame-Options**: Prevents clickjacking (deny)
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **Referrer-Policy**: Controls referrer information (strict-origin-when-cross-origin)
- **XSS Filter**: Browser XSS protection enabled

### 4. CSRF Protection

- **Token-Based Protection**: CSRF tokens required for all state-changing operations
- **Session-Based**: Tokens stored in session, not cookies
- **Automatic Token Injection**: Tokens automatically available in all views

### 5. Rate Limiting

- **Login Rate Limiting**: 5 attempts per 15 minutes per IP
- **General Rate Limiting**: 100 requests per 15 minutes per IP
- **Smart Bypass**: Development environments can bypass limits on localhost

### 6. HTTPS & Transport Security

- **Production HTTPS Redirect**: Automatic HTTP to HTTPS upgrade in production
- **HSTS Preloading**: Ready for browser HSTS preload lists
- **Secure Cookies**: Cookies only transmitted over HTTPS in production

### 7. CORS Configuration

- **Origin Whitelist**: Only configured origins can access the API
- **Credential Support**: Properly configured for authenticated requests
- **Method Restrictions**: Limited to GET, POST, PUT, DELETE

### 8. Error Handling & Monitoring

- **Sentry Integration**: Real-time error tracking and monitoring (optional)
- **Production Error Hiding**: Sensitive error details hidden in production
- **CSRF Error Handling**: User-friendly messages for token failures
- **Audit Trail**: All security events logged with severity levels

### 9. Database Security

- **MongoDB Connection**: Supports both local and MongoDB Atlas with authentication
- **Query Sanitization**: Protection against NoSQL injection
- **Connection Resilience**: Proper error handling and connection retries

## 🛡️ Deployment Security Checklist

Before deploying to production, ensure you complete all these steps:

### Critical (Must Do)

- [ ] **Set `NODE_ENV=production`** in environment variables
- [ ] **Generate strong `SESSION_SECRET`** (32+ random characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] **Hash `MAIN_PASSWORD`** using bcrypt
  ```bash
  node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(h => console.log(h));"
  ```
- [ ] **Hash `ARCHIVE_PASSWORD`** using bcrypt
- [ ] **Configure `MONGODB_URI`** with authentication enabled
- [ ] **Set `ALLOWED_ORIGINS`** to your production domain(s)
- [ ] **Enable HTTPS** on your hosting provider
- [ ] **Never commit `.env` file** (already in .gitignore)

### Recommended

- [ ] Set up MongoDB database backups
- [ ] Enable MongoDB authentication
- [ ] Configure `SENTRY_DSN` for error monitoring
- [ ] Set up monitoring alerts for failed login attempts
- [ ] Review and test CORS settings
- [ ] Set up firewall rules on hosting provider
- [ ] Enable database connection encryption
- [ ] Configure log rotation for audit logs
- [ ] Regular dependency updates (`npm audit` and `npm update`)

### Optional but Beneficial

- [ ] Add WAF (Web Application Firewall) if available
- [ ] Set up DDoS protection
- [ ] Configure CDN for static assets
- [ ] Enable database read replicas for scalability
- [ ] Set up automated security scanning
- [ ] Implement IP geoblocking if appropriate

## 🚨 Reporting Security Vulnerabilities

If you discover a security vulnerability in this application:

1. **DO NOT** open a public issue
2. Contact the maintainer directly via email or private message
3. Provide detailed information about the vulnerability
4. Allow reasonable time for the issue to be addressed

## 📋 Security Testing

### Manual Testing

Test these security features before going live:

```bash
# 1. Test login rate limiting
# Try 6 failed login attempts - should lock account

# 2. Test CSRF protection  
# Submit a form without CSRF token - should be rejected

# 3. Test XSS protection
# Submit story with <script>alert('xss')</script> - should be sanitized

# 4. Test MongoDB injection
# Submit {"$gt": ""} in login - should be sanitized

# 5. Test HTTPS redirect
# Access http://yourdomain.com - should redirect to https://
```

### Automated Testing

Run security audits regularly:

```bash
# Check for dependency vulnerabilities
npm audit

# Update vulnerable dependencies
npm audit fix

# Check for outdated packages
npm outdated
```

## 🔍 Security Monitoring

### What to Monitor

1. **Failed Login Attempts**: Track IPs with repeated failures
2. **Unusual Access Patterns**: Multiple archive downloads in short time
3. **Error Rates**: Sudden increase in 400/500 errors
4. **Database Queries**: Slow or unusual query patterns
5. **Session Activity**: Unusual session creation rates

### Audit Log Review

Regularly review audit logs for:
- Failed login attempts from suspicious IPs
- Multiple account lockouts
- Unusual story access patterns
- Critical severity events

Query example:
```javascript
// Find all critical security events
AuditLog.find({ severity: 'critical' }).sort({ createdAt: -1 })

// Find failed logins from specific IP
AuditLog.find({ 
  action: 'login_failed', 
  ipAddress: '1.2.3.4' 
}).sort({ createdAt: -1 })
```

## 🔧 Security Configuration Reference

### Environment Variables

| Variable | Purpose | Security Level |
|----------|---------|----------------|
| `NODE_ENV` | Environment mode | Critical |
| `SESSION_SECRET` | Session encryption | Critical |
| `MAIN_PASSWORD` | Main login (bcrypt hash) | Critical |
| `ARCHIVE_PASSWORD` | Archive access (bcrypt hash) | Critical |
| `MONGODB_URI` | Database connection | Critical |
| `ALLOWED_ORIGINS` | CORS whitelist | Important |
| `GEMINI_API_KEY` | AI API key | Important |
| `SENTRY_DSN` | Error monitoring | Optional |

### Security Headers Configuration

Current CSP directives:
- `default-src`: 'self'
- `style-src`: 'self', 'unsafe-inline', cdn.jsdelivr.net
- `script-src`: 'self', 'unsafe-inline', cdn.jsdelivr.net
- `font-src`: 'self', cdn.jsdelivr.net
- `img-src`: 'self', data:, https:
- `connect-src`: 'self'

**Note**: 'unsafe-inline' for styles/scripts should be removed when possible by moving inline code to separate files.

## 📚 Additional Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)

## 📝 Version History

### Current Version
- MongoDB injection protection
- XSS input sanitization
- Input validation middleware
- Comprehensive security documentation

### Previous Features
- CSRF protection
- Rate limiting
- Helmet security headers
- Session security
- Account lockout
- Audit logging

---

**Last Updated**: 2026-02-03  
**Security Review**: Recommended quarterly
