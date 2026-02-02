#!/usr/bin/env node

/**
 * Production Verification Script
 * Checks that all deployment requirements are met
 */

const fs = require('fs');
const path = require('path');

// Simple color output (without colors library)
const log = {
  success: (msg) => console.log('✓ ' + msg),
  error: (msg) => console.log('✗ ' + msg),
  warn: (msg) => console.log('⚠ ' + msg),
  info: (msg) => console.log('ℹ ' + msg),
};

console.log('\n🚀 PRODUCTION DEPLOYMENT VERIFICATION\n');
console.log('=' .repeat(50) + '\n');

let allChecks = true;

// 1. Check .env file
console.log('📋 CONFIGURATION CHECKS\n');

if (fs.existsSync('.env')) {
  log.success('.env file exists');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    env[key.trim()] = values.join('=').trim();
  });
  
  // Check NODE_ENV
  if (env.NODE_ENV === 'production') {
    log.success('NODE_ENV is set to production');
  } else {
    log.error('NODE_ENV is not set to production');
    allChecks = false;
  }
  
  // Check SESSION_SECRET
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) {
    log.success('SESSION_SECRET is configured (32+ chars)');
  } else {
    log.error('SESSION_SECRET is missing or too short');
    allChecks = false;
  }
  
  // Check passwords are hashed
  if (env.MAIN_PASSWORD && env.MAIN_PASSWORD.startsWith('$2')) {
    log.success('MAIN_PASSWORD is bcrypt hashed');
  } else {
    log.warn('MAIN_PASSWORD does not appear to be hashed');
  }
  
  if (env.ARCHIVE_PASSWORD && env.ARCHIVE_PASSWORD.startsWith('$2')) {
    log.success('ARCHIVE_PASSWORD is bcrypt hashed');
  } else {
    log.warn('ARCHIVE_PASSWORD does not appear to be hashed');
  }
  
  // Check MONGODB_URI
  if (env.MONGODB_URI && env.MONGODB_URI.length > 10) {
    log.success('MONGODB_URI is configured');
  } else {
    log.error('MONGODB_URI is missing or invalid');
    allChecks = false;
  }
  
  // Check ALLOWED_ORIGINS
  if (env.ALLOWED_ORIGINS && !env.ALLOWED_ORIGINS.includes('localhost')) {
    log.success('ALLOWED_ORIGINS configured for production');
  } else {
    log.warn('ALLOWED_ORIGINS may not be production-ready');
  }
  
  // Check GEMINI_API_KEY
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 10) {
    log.success('GEMINI_API_KEY is configured');
  } else {
    log.error('GEMINI_API_KEY is missing');
    allChecks = false;
  }
  
} else {
  log.error('.env file not found');
  allChecks = false;
}

console.log('');

// 2. Check dependencies
console.log('📦 DEPENDENCY CHECKS\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'express',
  'mongoose',
  'bcryptjs',
  'csurf',
  'helmet',
  'express-rate-limit',
  'morgan',
  'cors',
  '@sentry/node'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    log.success(`${dep} is installed`);
  } else {
    log.error(`${dep} is NOT installed`);
    allChecks = false;
  }
});

console.log('');

// 3. Check files exist
console.log('📁 FILE CHECKS\n');

const requiredFiles = [
  'server.js',
  'routes/index.js',
  'models/Story.js',
  'models/Goal.js',
  'models/AuditLog.js',
  'views/login.ejs',
  'views/archive-login.ejs',
  'views/index.ejs',
  '.env',
  '.env.example',
  '.gitignore',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    log.success(`${file} exists`);
  } else {
    log.error(`${file} is missing`);
    allChecks = false;
  }
});

console.log('');

// 4. Check documentation
console.log('📚 DOCUMENTATION CHECKS\n');

const docFiles = [
  'DEPLOYMENT_GUIDE.md',
  'SECURITY_IMPLEMENTATION.md',
  'SECURITY_QUICK_START.md',
];

docFiles.forEach(file => {
  if (fs.existsSync(file)) {
    log.success(`${file} exists`);
  } else {
    log.warn(`${file} is missing (optional)`);
  }
});

console.log('');
console.log('=' .repeat(50));

if (allChecks) {
  console.log('\n✅ All critical checks passed!\n');
  console.log('Your site is ready for production deployment.');
  console.log('\nNext steps:');
  console.log('1. Review DEPLOYMENT_GUIDE.md for platform-specific instructions');
  console.log('2. Choose your hosting platform (Heroku, Railway, AWS, etc)');
  console.log('3. Follow the deployment steps for your platform');
  console.log('4. Test the deployed application');
  console.log('5. Monitor logs and set up alerts\n');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please fix the issues above.\n');
  process.exit(1);
}
