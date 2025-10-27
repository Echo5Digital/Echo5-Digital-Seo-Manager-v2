# Deployment Guide - Echo5 SEO Platform

## 🚀 Quick Overview

**Backend**: Deploy to Render.com  
**Frontend**: Deploy to Vercel  
**Database**: MongoDB Atlas (already configured)

---

## 📦 Backend Deployment (Render.com)

### Step 1: Prepare Repository
```bash
# Make sure your code is pushed to GitHub
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Render Service
1. Go to [Render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `echo5-seo-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Add Environment Variables
Copy from `backend/.env.render` and add these in Render Dashboard:

```
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://mcrazymanu_db_user:mJbbgqF8Molx2r9f@cluster0.xsd1bcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=seo-management-jwt-secret-key-echo5-2025-secure-random-32chars-CHANGE-THIS
JWT_EXPIRE=30d
OPENAI_API_KEY=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
OPENAI_MODEL=gpt-4o-mini
FRONTEND_URL=https://your-app.vercel.app
```

**⚠️ IMPORTANT**: Update `FRONTEND_URL` after deploying frontend (Step 2 of Frontend Deployment)

### Step 4: Deploy
- Click **"Create Web Service"**
- Wait for deployment to complete (5-10 minutes)
- Copy your backend URL: `https://echo5-seo-backend.onrender.com`

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare for Vercel
Ensure `next.config.js` has proper settings:

```javascript
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
}
```

### Step 2: Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://echo5-seo-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://echo5-seo-backend.onrender.com
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-using-openssl-rand-base64-32
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Step 4: Deploy
- Click **"Deploy"**
- Wait for deployment (2-5 minutes)
- Copy your frontend URL: `https://your-app.vercel.app`

### Step 5: Update Backend FRONTEND_URL
1. Go back to Render Dashboard
2. Update `FRONTEND_URL` environment variable with your Vercel URL
3. Redeploy backend service

---

## 🔐 CORS Configuration

Update `backend/server.js` to allow your Vercel domain:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app'  // Add your Vercel URL
  ],
  credentials: true
}
```

---

## 🔄 Local Development vs Production

### Local Development
```bash
# Backend
cd backend
npm run dev  # Uses .env with localhost

# Frontend  
cd frontend
npm run dev  # Uses .env.local with localhost
```

### Production
- **Backend**: Automatically uses Render environment variables
- **Frontend**: Automatically uses Vercel environment variables

---

## 📋 Deployment Checklist

### Before Deploying:
- [ ] Push all code to GitHub
- [ ] MongoDB Atlas is configured and accessible
- [ ] OpenAI API key is valid
- [ ] All sensitive data removed from code

### Backend (Render):
- [ ] Web Service created
- [ ] Environment variables added
- [ ] Build succeeds
- [ ] Health check endpoint works: `/health`
- [ ] CORS allows frontend domain

### Frontend (Vercel):
- [ ] Project imported
- [ ] Environment variables added
- [ ] NEXTAUTH_SECRET generated
- [ ] Build succeeds
- [ ] API calls work to backend

### Post-Deployment:
- [ ] Test login functionality
- [ ] Test API connections
- [ ] Test real-time features (Socket.io)
- [ ] Verify database connections
- [ ] Check error logs

---

## 🐛 Troubleshooting

### Backend Issues

**Build Fails**:
```bash
# Check package.json has start script
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

**Database Connection Fails**:
- Verify MongoDB Atlas IP whitelist: Add `0.0.0.0/0` for Render
- Check connection string format
- Ensure user has read/write permissions

**Environment Variables Not Loading**:
- Restart Render service after adding env vars
- Check for typos in variable names
- Ensure no trailing spaces

### Frontend Issues

**API Calls Fail**:
- Check NEXT_PUBLIC_API_URL is correct
- Verify backend CORS settings
- Check browser console for errors

**NextAuth Errors**:
- Ensure NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches deployment URL
- Check backend allows frontend origin

**Build Fails**:
```bash
# Local test build
npm run build

# Check for errors
npm run lint
```

### CORS Errors
- Update backend `corsOptions.origin` array
- Add both http://localhost:3000 and https://your-app.vercel.app
- Redeploy backend after changes

---

## 📊 Monitoring

### Render Dashboard
- Monitor logs: Dashboard → Logs
- Check metrics: CPU, Memory usage
- View deployment history

### Vercel Dashboard
- Analytics: Functions, Edge, Web Analytics
- Logs: Real-time function logs
- Deployments: Preview and Production

---

## 🔄 Update Deployment

### Update Backend:
```bash
git add .
git commit -m "Update backend"
git push origin main
# Render auto-deploys from main branch
```

### Update Frontend:
```bash
git add .
git commit -m "Update frontend"  
git push origin main
# Vercel auto-deploys from main branch
```

---

## 💰 Cost Estimate

### Free Tier:
- **Render**: Free (sleeps after 15min inactivity)
- **Vercel**: Free (hobby plan)
- **MongoDB Atlas**: Free (512MB storage)
- **Total**: $0/month

### Recommended Paid:
- **Render**: $7/month (Starter, always on)
- **Vercel**: Free (sufficient for most)
- **MongoDB Atlas**: Free or $9/month (Shared M2)
- **Total**: ~$7-16/month

---

## 🔗 URLs After Deployment

```
Frontend (Vercel): https://echo5-seo.vercel.app
Backend (Render):  https://echo5-seo-backend.onrender.com
Database (Atlas):  cluster0.xsd1bcl.mongodb.net
```

---

## 📞 Support

**Render**: [docs.render.com](https://docs.render.com)  
**Vercel**: [vercel.com/docs](https://vercel.com/docs)  
**MongoDB**: [docs.mongodb.com](https://docs.mongodb.com)

---

**Deployment Status**: Ready for Production 🚀
