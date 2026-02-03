# Personal Site

A secure personal website with daily stories, goals tracking, archive access, and fitness coaching.

## 🔒 Security

This application has been hardened for production deployment with comprehensive security features:

- ✅ **Input validation & XSS prevention**
- ✅ **MongoDB injection protection**
- ✅ **CSRF protection**
- ✅ **Rate limiting**
- ✅ **Security headers (Helmet)**
- ✅ **HTTPS enforcement**
- ✅ **Session security**
- ✅ **Audit logging**

**📋 Before deploying, please read**:
- **[DEPLOYMENT_SECURITY_SUMMARY.md](DEPLOYMENT_SECURITY_SUMMARY.md)** - Security assessment and deployment readiness
- **[SECURITY.md](SECURITY.md)** - Comprehensive security documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file (see SECURITY.md for details)
# IMPORTANT: Change all passwords and secrets!
```

### Development

```bash
# Start development server
npm run dev

# Start production server
npm start
```

## 📦 Features

- **Daily Stories**: Write and save daily journal entries
- **Love Stories**: Special archive for memorable moments
- **Goals Tracking**: Weekly goals with progress tracking
- **Fitness Coach**: AI-powered fitness advice (requires Gemini API key)
- **Archive**: Browse and download past entries
- **Secure Access**: Two-level authentication system

## 🛡️ Security Features

### Authentication
- Bcrypt password hashing
- Account lockout after failed attempts
- Secure session management
- Two-level access control

### Protection Against
- Cross-Site Scripting (XSS)
- SQL/NoSQL Injection
- Cross-Site Request Forgery (CSRF)
- Brute Force Attacks
- Session Hijacking
- Clickjacking
- Man-in-the-Middle (MITM)

### Security Scanning
- ✅ CodeQL: 0 alerts
- ✅ npm audit: 2 low (acceptable)
- ✅ Dependencies: No critical vulnerabilities

## ⚙️ Configuration

### Required Environment Variables

```bash
NODE_ENV=production                    # Environment
PORT=3000                              # Server port
MONGODB_URI=mongodb://...              # Database connection
SESSION_SECRET=<32+ random chars>      # Session encryption
MAIN_PASSWORD=<bcrypt hash>            # Main login
ARCHIVE_PASSWORD=<bcrypt hash>         # Archive access
ALLOWED_ORIGINS=https://yourdomain.com # CORS whitelist
```

### Optional Environment Variables

```bash
GEMINI_API_KEY=...  # For fitness coach feature
SENTRY_DSN=...      # For error monitoring
```

## 🔐 Pre-Deployment Checklist

**CRITICAL** - Complete before deploying:

- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `SESSION_SECRET` (32+ chars)
- [ ] Hash `MAIN_PASSWORD` with bcrypt
- [ ] Hash `ARCHIVE_PASSWORD` with bcrypt
- [ ] Configure `MONGODB_URI` with authentication
- [ ] Set `ALLOWED_ORIGINS` to your domain
- [ ] Enable HTTPS on hosting provider
- [ ] Review [SECURITY.md](SECURITY.md) completely

## 📄 License

ISC

## 🤝 Contributing

Security improvements are always welcome! Please report security vulnerabilities privately.

---

**For detailed security information, see**: [DEPLOYMENT_SECURITY_SUMMARY.md](DEPLOYMENT_SECURITY_SUMMARY.md)
