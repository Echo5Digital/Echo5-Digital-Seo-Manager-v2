# Railway.app Deployment Guide - Echo5 SEO Platform

## 🚂 Why Railway.app?

- ✅ **Fast deploys**: 2-3 minutes vs 10-15 on Render
- ✅ **$5 free credit**: Lasts 1-3 months
- ✅ **No cold starts**: Always ready
- ✅ **Better performance**: Faster builds and response times
- ✅ **Simpler setup**: Auto-detects everything

---

## 📦 Backend Deployment (Railway.app)

### Step 1: Sign Up & Connect GitHub

1. Go to [Railway.app](https://railway.app)
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **"Echo5-digital-Seo-Ops-v2"**
4. Railway will auto-detect your project structure

### Step 3: Configure Service

1. Click on your deployed service
2. Go to **Settings** tab
3. Configure:

**Root Directory**:
```
backend
```

**Custom Start Command** (Settings → Deploy):
```
node server.js
```

**Custom Build Command** (optional):
```
npm install --production
```

### Step 4: Add Environment Variables

Click **"Variables"** tab and add these one by one:

```bash
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://mcrazymanu_db_user:mJbbgqF8Molx2r9f@cluster0.xsd1bcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=seo-management-jwt-secret-key-echo5-2025-secure-random-32chars
JWT_EXPIRE=30d
OPENAI_API_KEY=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
OPENAI_MODEL=gpt-4o-mini
FRONTEND_URL=https://your-app.vercel.app
SERPER_API_KEY=your-serper-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**💡 Tip**: Railway has a "RAW Editor" - paste all at once in format:
```
KEY=value
KEY2=value2
```

### Step 5: Deploy

1. Railway auto-deploys on first setup
2. Wait **2-3 minutes** for deployment
3. Check **"Deployments"** tab for progress
4. Once complete, click **"Settings"** → **"Generate Domain"**
5. Copy your URL: `https://your-app.up.railway.app`

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import **"Echo5-digital-Seo-Ops-v2"**
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 2: Add Environment Variables

In Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-app.up.railway.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Step 3: Deploy

1. Click **"Deploy"**
2. Wait **2-5 minutes**
3. Copy your Vercel URL: `https://your-app.vercel.app`

### Step 4: Update Backend FRONTEND_URL

1. Go back to Railway
2. Click your service → **"Variables"**
3. Update `FRONTEND_URL` to your Vercel URL
4. Service will auto-redeploy

---

## 🔐 CORS Configuration

Update `backend/server.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',  // Your Vercel URL
    'https://your-app.up.railway.app'  // Your Railway URL (optional)
  ],
  credentials: true
}
```

Commit and push:
```bash
git add backend/server.js
git commit -m "Update CORS for production"
git push origin main
```

Railway will auto-deploy the changes!

---

## 📊 Railway Features

### Environment Variables
- **Easy editing**: Click Variables → Add/Edit
- **RAW Editor**: Paste multiple variables at once
- **No restart needed**: Auto-applies on save

### Deployments
- **Auto-deploy**: Pushes to `main` trigger deploys
- **Instant rollback**: Click any previous deployment
- **Build logs**: Real-time view of build process
- **Runtime logs**: See your app logs live

### Domains
- **Free subdomain**: `*.up.railway.app`
- **Custom domain**: Add your own (free)
- **SSL**: Automatic HTTPS

### Monitoring
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Health checks**: Automatic

---

## 💰 Cost Breakdown

### Free Tier (First Month)
- **$5 credit included**
- **Usage**: ~$0.10-0.30 per day for this app
- **Duration**: 15-50 days depending on usage
- **After credit**: Pay as you go

### Paid (After Credit)
- **Estimated**: $5-10/month
- **Pro Plan**: $20/month (unlimited projects)

**Compare to Render**:
- Render Free: Slow, sleeps
- Render Paid: $7/month
- **Railway**: Better performance, same cost

---

## 🚀 Quick Commands

### View Logs
```bash
# Install Railway CLI (optional)
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs
```

### Redeploy
```bash
# Just push to GitHub
git push origin main
# Railway auto-deploys!
```

### Environment Variables via CLI
```bash
# Set variable
railway variables set KEY=value

# View all
railway variables
```

---

## 🐛 Troubleshooting

### Build Fails
**Issue**: npm install timeout
**Solution**: Railway has higher memory - shouldn't happen. But if it does:
1. Check logs in Deployments tab
2. Verify `package.json` is correct
3. Try manual redeploy

### App Not Starting
**Issue**: Server won't start
**Solution**:
1. Check **"Deploy"** logs for errors
2. Verify `PORT` variable is set
3. Ensure start command is `node server.js`

### Database Connection Fails
**Issue**: Can't connect to MongoDB
**Solution**:
1. Check MongoDB Atlas whitelist: Add `0.0.0.0/0`
2. Verify `MONGODB_URI` is correct
3. Check MongoDB user has permissions

### CORS Errors
**Issue**: Frontend can't call backend
**Solution**:
1. Update `corsOptions` in `server.js`
2. Add Vercel URL to allowed origins
3. Commit and push changes

---

## 📋 Deployment Checklist

### Railway Setup:
- [ ] Account created and GitHub connected
- [ ] Project deployed from GitHub
- [ ] Root directory set to `backend`
- [ ] Environment variables added
- [ ] Domain generated
- [ ] Deployment successful
- [ ] Logs show "Server running"

### Vercel Setup:
- [ ] Project imported
- [ ] Root directory set to `frontend`
- [ ] Environment variables added
- [ ] NEXTAUTH_SECRET generated
- [ ] Deployment successful
- [ ] Can access login page

### Integration:
- [ ] Backend FRONTEND_URL updated
- [ ] Frontend NEXT_PUBLIC_API_URL updated
- [ ] CORS configured
- [ ] Login works
- [ ] API calls work
- [ ] Socket.io connects

---

## 🔗 Final URLs

After deployment, you'll have:

```
Backend (Railway):  https://echo5-seo-backend.up.railway.app
Frontend (Vercel):  https://echo5-seo.vercel.app
Database (Atlas):   cluster0.xsd1bcl.mongodb.net
```

---

## 🎯 Next Steps

1. **Test Everything**:
   - Login functionality
   - Client creation
   - Keyword tracking
   - SEO audits
   - Real-time notifications

2. **Monitor Usage**:
   - Railway Dashboard → Metrics
   - Watch your $5 credit usage
   - Upgrade to Pro if needed

3. **Custom Domain** (Optional):
   - Railway: Settings → Domains → Add Custom
   - Vercel: Settings → Domains → Add

4. **Set Up Monitoring**:
   - Add error tracking (Sentry)
   - Set up uptime monitoring
   - Configure email alerts

---

## 📞 Support

**Railway**: 
- Docs: [docs.railway.app](https://docs.railway.app)
- Discord: Very active community
- Status: [railway.app/status](https://railway.app/status)

**Vercel**:
- Docs: [vercel.com/docs](https://vercel.com/docs)
- Support: [vercel.com/support](https://vercel.com/support)

---

## ⚡ Why Railway > Render

| Feature | Railway | Render |
|---------|---------|--------|
| Build Time | 2-3 min | 10-15 min |
| Free Tier | $5 credit | Free but sleeps |
| Performance | Fast | Slow on free |
| Auto-deploy | ✅ Yes | ✅ Yes |
| Custom domains | ✅ Free | ✅ Free |
| Logs | Excellent | Good |
| UI/UX | Modern | Basic |

---

**Deployment Status**: Railway Ready! 🚂✨
