# 🚀 Quick Start Guide

Get your SEO Management Platform running in 5 minutes!

## ⚡ Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- MongoDB ([Download](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account
- OpenAI API Key ([Get one](https://platform.openai.com/api-keys))

## 📦 Installation

### Step 1: Clone/Download Project
```bash
cd "Echo5 Seo Ops"
```

### Step 2: Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add:
# - Your MongoDB connection string
# - Your OpenAI API key
# - A secure JWT secret

# Start backend server
npm run dev
```

✅ Backend running at: **http://localhost:5000**

### Step 3: Frontend Setup (New Terminal)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start frontend server
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

### Step 4: Create First User

**Option A: Using curl (Terminal)**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Boss User",
    "email": "boss@echo5.com",
    "password": "secure123",
    "role": "Boss"
  }'
```

**Option B: Using Postman/Insomnia**
- POST to `http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "name": "Boss User",
  "email": "boss@echo5.com",
  "password": "secure123",
  "role": "Boss"
}
```

### Step 5: Login & Explore! 🎉

1. Open http://localhost:3000
2. Login with:
   - Email: boss@echo5.com
   - Password: secure123
3. Start managing SEO!

## 🎯 What You Get

### ✅ Backend API (Express.js)
- ✓ User authentication (JWT)
- ✓ Client management
- ✓ Keyword tracking
- ✓ Task management
- ✓ SEO auditing
- ✓ AI integration (GPT-4)
- ✓ Report generation
- ✓ Backlink tracking
- ✓ Real-time notifications (Socket.io)
- ✓ Automated scheduling (Node Cron)

### ✅ Frontend App (Nuxt 3 + Vue.js)
- ✓ Modern dashboard
- ✓ Client management UI
- ✓ Keyword research & monitoring
- ✓ Task tracking system
- ✓ SEO health monitoring
- ✓ Real-time notifications
- ✓ Role-based access control
- ✓ Responsive design (Tailwind CSS)
- ✓ State management (Pinia)

## 🔑 User Roles

### Boss
- Full access to everything
- Manage clients & staff
- View all reports & analytics
- Approve AI suggestions

### Staff
- Access assigned clients only
- Manage keywords & tasks
- Request AI assistance
- Track progress

### Developer
- Maintain integrations
- Access audit logs
- Manage automations

## 📱 Main Features

### 1. AI Site Auditor
```
Dashboard → Clients → Select Client → Run Audit
```
- Scans website for SEO issues
- AI-powered fix suggestions
- Priority-based recommendations

### 2. Keyword Tracking
```
Dashboard → Keywords → Add Keyword
```
- Manual keyword management
- Weekly automated rank tracking
- AI difficulty scoring
- CSV import/export

### 3. Task Management
```
Dashboard → Tasks
```
- Auto-generated from audits
- Assign to staff
- Track progress & time
- Boss approval workflow

### 4. Reports
```
Dashboard → Reports → Generate
```
- Weekly/Monthly reports
- PDF & Excel export
- AI-generated summaries

## 🛠️ Customization

### Change Branding
Edit `frontend/nuxt.config.js`:
```javascript
app: {
  head: {
    title: 'Your Company Name',
  }
}
```

### Add Logo
Place your logo in `frontend/public/logo.png`

### Modify Colors
Edit `frontend/tailwind.config.js`

## 🚀 Production Deployment

### Backend (Render/Railway)
1. Push code to GitHub
2. Connect to Render/Railway
3. Set environment variables
4. Deploy!

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
vercel deploy  # or netlify deploy
```

### Database (MongoDB Atlas)
1. Create cluster at mongodb.com
2. Get connection string
3. Update `MONGODB_URI` in backend

## 🆘 Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `.env` file exists
- Check port 5000 is free

### Frontend won't start
- Ensure backend is running first
- Check `.env` file exists
- Verify Node version (18+)

### Can't login
- Ensure you created a user (Step 4)
- Check backend console for errors
- Verify JWT_SECRET is set

### AI features not working
- Verify OPENAI_API_KEY in backend `.env`
- Check API quota/billing
- Review backend logs

## 📚 Documentation

- **Backend API**: `/backend/README.md`
- **Frontend**: `/frontend/README.md`
- **Main README**: `/README.md`

## 💡 Next Steps

1. ✅ Create your first client
2. ✅ Run an SEO audit
3. ✅ Add keywords to track
4. ✅ Assign tasks to staff
5. ✅ Generate your first report

## 🎊 You're Ready!

Your AI-powered SEO management platform is now running!

**Need help?** Check the detailed READMEs in backend and frontend folders.

---

**Built with ❤️ for Echo5 SEO Agency**
