# Environment Variables Guide

This guide explains all environment variables needed for the SEO Management Platform.

---

## 🔧 Backend Environment Variables

Create `backend/.env` file:

```env
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=development
PORT=5000

# ==========================================
# DATABASE
# ==========================================
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/seo-management

# OR MongoDB Atlas (Production)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/seo-management?retryWrites=true&w=majority

# ==========================================
# JWT AUTHENTICATION
# ==========================================
# Generate a random secret: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=30d

# ==========================================
# OPENAI API (Required for AI features)
# ==========================================
# Get your key: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# ==========================================
# SERP API (Optional - for rank tracking)
# ==========================================
# Option 1: Serper.dev - https://serper.dev
SERPER_API_KEY=your-serper-api-key

# Option 2: RapidAPI - https://rapidapi.com
# RAPIDAPI_KEY=your-rapidapi-key

# ==========================================
# FRONTEND URL
# ==========================================
FRONTEND_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# ==========================================
# EMAIL CONFIGURATION (Optional)
# ==========================================
# Gmail Setup:
# 1. Enable 2FA on your Google account
# 2. Generate App Password: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

# Other Email Providers:
# - SendGrid: smtp.sendgrid.net
# - Mailgun: smtp.mailgun.org
# - Outlook: smtp-mail.outlook.com

# ==========================================
# REDIS (Optional - for BullMQ queue)
# ==========================================
# Local Redis
# REDIS_URL=redis://localhost:6379

# Redis Cloud (Production)
# REDIS_URL=redis://username:password@host:port

# ==========================================
# FILE UPLOAD
# ==========================================
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# ==========================================
# RATE LIMITING
# ==========================================
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# SLACK NOTIFICATIONS (Optional)
# ==========================================
# Create webhook: https://api.slack.com/messaging/webhooks
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# ==========================================
# GOOGLE OAUTH (Optional - future feature)
# ==========================================
# GOOGLE_CLIENT_ID=your-google-oauth-client-id
# GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=info
```

---

## 🎨 Frontend Environment Variables

Create `frontend/.env` file:

```env
# ==========================================
# API CONFIGURATION
# ==========================================
# Development
NUXT_PUBLIC_API_URL=http://localhost:5000

# Production
# NUXT_PUBLIC_API_URL=https://your-api-domain.com

# ==========================================
# SOCKET.IO
# ==========================================
# Development
NUXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Production
# NUXT_PUBLIC_SOCKET_URL=https://your-api-domain.com

# ==========================================
# OPTIONAL FEATURES
# ==========================================
# Google Analytics (Optional)
# NUXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry Error Tracking (Optional)
# NUXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 🔐 How to Get API Keys

### MongoDB Atlas (Free Tier Available)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account & cluster
3. Click "Connect" → "Connect your application"
4. Copy connection string
5. Replace `<password>` and `<dbname>`

### OpenAI API Key (Required)
1. Go to https://platform.openai.com
2. Sign up / Login
3. Go to API Keys section
4. Create new secret key
5. Copy and save (you won't see it again!)
6. Add billing method for usage

**Cost:** ~$0.002 per audit (GPT-4o-mini)

### Serper.dev (Optional - for rank tracking)
1. Go to https://serper.dev
2. Sign up for free account
3. Get API key from dashboard
4. Free tier: 1000 queries/month

**Alternative:** Use RapidAPI or SerpAPI

### Gmail App Password (Optional - for emails)
1. Enable 2-Factor Authentication
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and your device
4. Generate & copy 16-character password
5. Use in `SMTP_PASS`

---

## 🚀 Production Environment Variables

### Backend (Render/Railway/AWS)

Set these in your hosting platform dashboard:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
OPENAI_API_KEY=sk-...
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (Vercel/Netlify)

```env
NUXT_PUBLIC_API_URL=https://your-backend-domain.com
NUXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
```

---

## ✅ Validation Checklist

Before starting the app, verify:

### Backend
- [ ] `MONGODB_URI` - Can connect to database
- [ ] `JWT_SECRET` - At least 32 characters
- [ ] `OPENAI_API_KEY` - Starts with `sk-`
- [ ] `FRONTEND_URL` - Matches frontend URL

### Frontend
- [ ] `NUXT_PUBLIC_API_URL` - Points to running backend
- [ ] `NUXT_PUBLIC_SOCKET_URL` - Same as API URL

---

## 🧪 Testing Environment Variables

### Check Backend
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI ? '✅ MongoDB URI set' : '❌ MongoDB URI missing')"
node -e "require('dotenv').config(); console.log(process.env.OPENAI_API_KEY ? '✅ OpenAI key set' : '❌ OpenAI key missing')"
```

### Check Frontend
```bash
cd frontend
npm run dev
# Check console for API URL in Network tab
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Added to `.gitignore`
2. **Use strong JWT secrets** - Min 32 characters
3. **Rotate keys regularly** - Every 90 days
4. **Different keys per environment** - Dev vs Production
5. **Limit API key permissions** - Only what's needed
6. **Monitor API usage** - Check OpenAI dashboard
7. **Use environment-specific URLs** - No hardcoded values

---

## 🆘 Troubleshooting

### "MongoDB connection failed"
- Check `MONGODB_URI` format
- Verify network access in Atlas
- Check username/password

### "Invalid OpenAI API key"
- Verify key starts with `sk-`
- Check billing is set up
- Try creating new key

### "CORS error"
- Ensure `FRONTEND_URL` matches exactly
- Check protocol (http vs https)
- Verify port numbers

### "JWT token invalid"
- Check `JWT_SECRET` is set
- Verify secret matches between sessions
- Clear browser localStorage

---

## 📝 Example .env Files

### Minimal (Development)
```env
# Backend
MONGODB_URI=mongodb://localhost:27017/seo
JWT_SECRET=my-super-secret-key-for-development
OPENAI_API_KEY=sk-xxxxxxxx
FRONTEND_URL=http://localhost:3000

# Frontend
NUXT_PUBLIC_API_URL=http://localhost:5000
```

### Full (Production)
```env
# Backend
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/seo
JWT_SECRET=production-secret-minimum-32-characters
OPENAI_API_KEY=sk-xxxxxxxx
SERPER_API_KEY=xxxxxxxx
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=xxxxxxxx
FRONTEND_URL=https://seo.yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx

# Frontend
NUXT_PUBLIC_API_URL=https://api.yourdomain.com
NUXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NUXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

**Ready to configure?** Copy `.env.example` files and fill in your values!
