# 🚀 AI-Driven SEO Management Platform

A full-stack, intelligent SEO management platform for agencies to automate, analyze, and improve SEO operations for 10–20 client websites.

## 📋 Tech Stack

- **Frontend:** Nuxt 3 (Vue.js), JavaScript, Tailwind CSS, Pinia, Headless UI
- **Backend:** Express.js, Node.js
- **Database:** MongoDB with Mongoose
- **AI:** OpenAI GPT-4/GPT-4o-mini
- **Scheduler:** Node Cron
- **Auth:** Custom JWT Authentication
- **Real-time:** Socket.io
- **Deployment:** Vercel/Netlify (frontend) + Render/Railway (backend) + MongoDB Atlas

## 🏗️ Project Structure

```
seo-management-platform/
├── frontend/              # Nuxt 3 application
│   ├── pages/            # Vue pages (auto-routing)
│   ├── components/       # Vue components
│   ├── composables/      # Vue composables
│   ├── stores/           # Pinia state management
│   ├── plugins/          # Nuxt plugins
│   ├── middleware/       # Route middleware
│   ├── layouts/          # App layouts
│   ├── assets/           # CSS & static assets
│   └── public/           # Public files
│
├── backend/              # Express.js API
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic & AI
│   ├── middleware/      # Auth & validation
│   ├── jobs/            # Cron jobs & automation
│   └── utils/           # Helper functions
│
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB Atlas account or local MongoDB
- OpenAI API key

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
SERPER_API_KEY=your_serper_api_key (optional)
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
NEXTAUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

**Frontend (.env)**
```env
NUXT_PUBLIC_API_URL=http://localhost:5000
NUXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the app at: **http://localhost:3000**

## 🎯 Core Features

### 🧠 AI Site Auditor
- Automated website scanning for SEO issues
- AI-powered prioritization and fix suggestions
- One-click task generation

### 🗂️ Client & Staff Management
- Multi-client dashboard
- Role-based access (Boss, Staff, Developer)
- Staff time tracking and performance metrics

### 🔍 Keyword Research & Monitoring
- Manual keyword management + CSV import
- Weekly automated rank tracking
- AI-powered difficulty scoring and clustering
- Competitor tracking

### ✍️ AI Content Optimization
- Automated content analysis
- AI suggestions for titles, meta, headings, schema
- Boss approval workflow

### 🧱 Task & Workflow System
- Auto-generated fix tasks from audits
- Priority-based task assignment
- Progress tracking and approval system

### 📊 Reporting Dashboard
- Real-time SEO health metrics
- Staff performance analytics
- Auto-generated PDF/Excel reports

### 🌐 Backlink Tracker
- Manual backlink entry and status tracking
- AI-powered opportunity suggestions
- Outreach template generation

### 🔔 Notification System
- Real-time alerts for rank drops, issues, deadlines
- Email and in-app notifications

### 📅 Automation
- Weekly keyword rank updates
- Monthly SEO health reports
- AI-generated executive summaries

## 👥 User Roles

### Boss
- Full access to all clients and reports
- Approve AI-generated fixes
- Manage staff and assignments
- View global analytics

### Staff
- Access assigned clients only
- Add/edit keywords
- Fix audit issues
- Mark tasks complete
- Request AI assistance

### Developer
- Maintain integrations
- Access audit logs
- Manage cron jobs and automations

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# For Vercel
vercel deploy
# For Netlify
netlify deploy --prod
```

### Backend (Render/Railway)
- Connect GitHub repository
- Set environment variables
- Deploy from `backend` directory

### Database (MongoDB Atlas)
- Create cluster
- Whitelist IP addresses
- Get connection string

## 🔧 Development Guidelines

- **Modular architecture:** Separate concerns clearly
- **JSDoc comments:** Document functions with type hints
- **Error handling:** Always use try-catch with proper logging
- **Validation:** Use Joi/Yup for schema validation
- **Security:** Implement rate limiting, sanitization, CORS
- **Testing:** Write unit tests for critical functions
- **Code style:** Use ESLint + Prettier

## 📝 API Documentation

API endpoints are available at `http://localhost:5000/api`

Key routes:
- `/api/auth/*` - Authentication
- `/api/clients/*` - Client management
- `/api/keywords/*` - Keyword operations
- `/api/tasks/*` - Task management
- `/api/audits/*` - Site auditing
- `/api/reports/*` - Report generation
- `/api/backlinks/*` - Backlink tracking

## 🤝 Contributing

1. Create feature branch
2. Make changes with clear commits
3. Test thoroughly
4. Submit pull request

## 📄 License

Proprietary - Echo5 SEO Agency

## 🆘 Support

For issues or questions, contact the development team.

---

**Built By Developers | Echo5 Digital SEO Agency**


## Changelog

**29-10-2025**

-When you save a focus keyword in the page view, it automatically becomes a primary keyword for that client
-You can track which pages target which keywords
-The keyword appears in the client's keyword list
-Multiple pages can target the same keyword

-Reduced batch sizes: From 5 to 3 concurrent requests (high memory tier)
-Increased delays:
--Batch delay increased from 1000ms to 2000ms
--Group delay increased from 500ms to 2000ms
-Added random delay of 500-1500ms before each page request
-Added random delay of 1-3 seconds for content refresh
-Rotating user agents: Uses 5 different realistic browser user agents instead of identifying as a bot
-More realistic headers: Added Accept, Accept-Language, etc. to look like a real browser
- fixed the keyword creation to use the correct schema fields

✅ Title optimization (length 30-60 chars, contains focus keyword)
✅ Meta description (length 120-160 chars, contains focus keyword)
✅ H1 heading (present, contains focus keyword)
✅ Content quality (word count 300+, keyword density 0.5-2.5%)
✅ Images with alt tags
✅ Internal links (3-10 recommended)
✅ External links for authority
✅ Technical SEO (HTTPS, mobile-friendly, canonical URL, indexable)
✅ Structured data (JSON-LD)
✅ Social meta tags (Open Graph, Twitter Cards)


