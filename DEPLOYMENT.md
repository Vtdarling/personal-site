# Deployment Guide - Veeran's Biography

## 🚀 Quick Deployment Steps

### 1. Install Security Dependencies

```bash
npm install
```

This will install:
- `helmet` - Security headers
- `express-rate-limit` - DDoS protection
- `express-mongo-sanitize` - NoSQL injection protection

### 2. Update Environment Variables

**IMPORTANT:** Before deploying, update your `.env` file:

```bash
# Generate a strong session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update your `.env` file:
```env
MONGODB_URI=your-production-mongodb-uri
PORT=3000
NODE_ENV=production
SESSION_SECRET=paste-generated-secret-here
MAIN_PASSWORD=create-strong-password
ARCHIVE_PASSWORD=create-strong-password
GEMINI_API_KEY=your-api-key
```

### 3. Test Locally

```bash
npm start
```

Visit: http://localhost:3000

### 4. Deploy to Production

#### Option A: Vercel / Netlify

1. Push code to GitHub (ensure .env is in .gitignore)
2. Connect your repository
3. Add environment variables in platform settings
4. Deploy!

#### Option B: Railway / Render

1. Create new project
2. Connect GitHub repo
3. Add environment variables
4. Deploy

#### Option C: DigitalOcean / AWS / VPS

```bash
# On your server
git clone your-repo
cd your-repo
npm install
npm start
```

Use PM2 for production:
```bash
npm install -g pm2
pm2 start server.js --name veeran-bio
pm2 startup
pm2 save
```

### 5. Set Up SSL/HTTPS

#### Using Nginx + Let's Encrypt:

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Nginx Configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Database Setup (MongoDB Atlas)

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for any IP, or specific IPs)
5. Get connection string
6. Update MONGODB_URI in environment variables

### 7. Post-Deployment Security Checks

✅ HTTPS enabled
✅ Environment variables set
✅ .env not in git
✅ Strong passwords configured
✅ Rate limiting working
✅ Database secured
✅ Backups configured

### 8. Monitoring & Maintenance

```bash
# Check application status
pm2 status

# View logs
pm2 logs veeran-bio

# Restart application
pm2 restart veeran-bio

# Update application
git pull
npm install
pm2 restart veeran-bio
```

### 9. Regular Maintenance

Weekly:
- Check logs for suspicious activity
- Monitor login attempts
- Review database

Monthly:
- Update dependencies: `npm update`
- Check for security vulnerabilities: `npm audit`
- Backup database
- Review SSL certificate expiry

## 🔐 Security Features Active

- ✅ Helmet.js (Security Headers)
- ✅ Rate Limiting (5 login attempts per 15 min)
- ✅ NoSQL Injection Protection
- ✅ Session Security (HttpOnly, Secure, SameSite)
- ✅ Input Validation
- ✅ Environment Variables
- ✅ HTTPS Support

## 📞 Support

If you encounter any issues:
1. Check logs: `pm2 logs`
2. Review SECURITY.md
3. Verify environment variables
4. Check database connection

## 🎉 You're Ready!

Your website is now secured and ready for production deployment!

**Remember:**
- Never commit .env file
- Keep dependencies updated
- Monitor login attempts
- Regular backups
- Strong passwords

---

**Deployment Date**: _____________
**Domain**: _____________
**Status**: 🟢 Ready for Production
