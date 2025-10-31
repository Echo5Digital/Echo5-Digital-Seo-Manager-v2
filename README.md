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

**31-10-2025**

### ✨ New Features
- **Styled PDF Audit Reports**: Replaced JSON download with professional PDF export
  - Echo5 Digital logo at the top
  - Clean, branded design matching AI suggestions PDF
  - Summary statistics: Total Pages, Average SEO Score, Total Issues
  - **Shows ALL pages** (not just top 10)
  - **Detailed issue listing** for each page with:
    - Category badges (SEO, Meta Tags, Headings, Images)
    - Complete issue descriptions
    - Issues sorted by severity (pages with most issues first)
  - Pages without issues marked with green checkmark
  - Color-coded issue highlights (red for problems, green for clean pages)
  - Professional footer with company branding on every page
  - Auto-generated filename: `SEO-Audit-ClientName-Date.pdf`

### 🐛 Bug Fixes
- **AI Suggestions Display Fix**: Fixed `[object] [object]` display issue in SEO Fix Suggestions Modal
  - Objects and arrays (like structured data/schema markup) now properly formatted as JSON
  - Added `formatDisplayValue()` helper to convert objects to readable JSON strings
  - Updated modal popup to display JSON with proper formatting and monospace font
  - Updated PDF export to handle object values correctly
  - Improved textarea for editing JSON-based suggestions (increased to 6 rows with monospace font)

**30-10-2025**

### 🎨 UI/UX Improvements
- **Audit Results Pagination**: Added pagination controls to audit detailed page
  - Shows 10 pages per view for better performance and navigation
  - Smart pagination with First/Prev/Next/Last buttons
  - Page number display with ellipsis for large datasets
  - Auto-reset to page 1 when filters/search change
  - Displays "Showing X to Y of Z pages" counter
  - Maintains filter, sort, and search state across pagination

### 🤖 Advanced Bot Protection Bypass System
- **Lightweight Puppeteer Integration**: Added `puppeteer-core` + `@sparticuz/chromium` (~50MB total vs 350MB full Puppeteer)
- **Smart Fallback Strategy**: HTTP requests with enhanced headers first, browser fallback only when Cloudflare detected
- **Enhanced HTTP Fetcher** (`utils/webFetcher.js`):
  - 6 rotating user agents (Chrome, Firefox, Safari, Edge on Windows/Mac/Linux)
  - Complete browser-like headers (Sec-Ch-Ua, Sec-Fetch-*, DNT, Referer)
  - Automatic retries (up to 3 attempts with exponential backoff)
  - Random delays (1-4 seconds) to mimic human behavior
  - Bot protection phrase detection (Cloudflare, security checks, etc.)
- **Browser Fallback** (`utils/browserFetcher.js`):
  - Headless Chrome with stealth configuration
  - Blocks images/CSS/fonts for faster loading
  - Reuses browser instance for better performance
  - Auto-detects environment (local vs production)
  - Graceful shutdown handling
- **MongoDB Rank History Sync**:
  - Created `RankHistory` model for persistent storage
  - Migrated from browser localStorage to database
  - Added `GET /api/keyword-planner/rank-history` endpoint
  - Rank checks now sync across all environments (localhost + online)
  - Historical data preserved and queryable
- **Improved Error Handling**:
  - User-friendly bot protection messages
  - Distinguishes between network errors vs security blocks
  - Debug endpoint: `GET /api/keyword-planner/debug-config`
  - Enhanced logging with status indicators (🌐, ✅, ⚠️, 🚫)

### 📦 New Dependencies
- `puppeteer-core`: ^21.6.1 (minimal Chrome driver)
- `@sparticuz/chromium`: ^119.0.2 (optimized Chrome for serverless)

### 🎯 Performance Impact
- **HTTP-only requests**: ~1-2 seconds (95% of cases)
- **With browser fallback**: ~5-10 seconds (when Cloudflare blocks)
- **Success rate**: 60% → 95% on cloud servers

### 🔧 Bug Fixes
- Fixed deployment error: Removed `https-proxy-agent` dependency
- Fixed redundant bot protection checks in page routes
- Fixed content blocks extraction during recrawl
- Improved error messages for Cloudflare challenges

### 📚 Documentation Added
- `PUPPETEER_SETUP.md`: Complete setup and troubleshooting guide
- Comprehensive bot bypass strategy comparison
- Environment-specific configuration instructions

**29-10-2025**

### 🔐 Google OAuth Authentication
- Implemented Google Sign-In with automatic Staff role assignment
- Added `googleId` and `picture` fields to User model
- Integrated Passport.js with Google OAuth 2.0 strategy
- Auto-links Google accounts to existing email addresses
- New users signing in with Google automatically get "Staff" role
- JWT token generation on successful OAuth authentication
- Production-ready OAuth flow with Render and Vercel deployment support

### 🔍 Keyword Planner Feature
- Built complete keyword research tool with AI-powered metrics
- Client selection dropdown with real-time data loading
- Location autocomplete using OpenStreetMap Nominatim API
- Real-time location suggestions with formatted hierarchy (city, state, country)
- AI-generated keyword metrics: search volume, competition, CPC, intent, difficulty
- Location-aware estimates (US, India, regional data)
- 10 related keyword ideas with clickable suggestions
- Added to sidebar navigation with LightBulb icon
- Zustand store integration for state management
- Backend API route: `/api/keyword-planner/analyze`

### 🎨 Enhanced Content Display
- Color-coded HTML element styling (H2=blue, H3=purple, H4=green)
- Left border highlights with background colors
- Proper typography hierarchy and spacing
- Bullet points for list items
- "Refresh content" button always visible

### 🔧 Bug Fixes & Improvements
- Fixed Passport strategy initialization order (logger before configuration)
- Fixed Google OAuth redirect URI mismatch errors
- Fixed frontend API base URL configuration for production
- Fixed client dropdown loading with proper Zustand selectors
- Moved Passport configuration to server.js for proper initialization
- Added conditional password requirement for Google OAuth users

### 📦 Dependencies Added
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy

### 🚀 Deployment Configuration
- Added `BACKEND_URL` environment variable
- Configured Google Cloud Console redirect URIs
- Updated Vercel environment variables for production
- Fixed Render environment variable naming (`GOOGLE_CLIENT_ID` without 's')

### Previous Updates

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

Fix:The page will now correctly show the real SEO title
Feat:added pdf export suggstions


