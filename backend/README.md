# Backend Setup Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB installed locally or MongoDB Atlas account
- OpenAI API key

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# Required
MONGODB_URI=mongodb://localhost:27017/seo-management
JWT_SECRET=your-super-secret-key
OPENAI_API_KEY=sk-your-openai-key

# Optional
SERPER_API_KEY=your-serper-key
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Start MongoDB
**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:**
- Create cluster at mongodb.com/cloud/atlas
- Get connection string
- Add to `.env` as MONGODB_URI

### 4. Run Development Server
```bash
npm run dev
```

Server will start at: **http://localhost:5000**

### 5. Create First User (Boss)
Use a tool like Postman or curl:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "role": "Boss"
  }'
```

**Note:** The first user must be created manually. After that, Boss users can create new users through the UI.

## Testing API Endpoints

### Health Check
```bash
curl http://localhost:5000/health
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Project Structure

```
backend/
├── models/           # Mongoose schemas
│   ├── User.model.js
│   ├── Client.model.js
│   ├── Keyword.model.js
│   ├── Task.model.js
│   ├── Audit.model.js
│   ├── Backlink.model.js
│   ├── Report.model.js
│   └── Notification.model.js
│
├── routes/           # Express routes
│   ├── auth.routes.js
│   ├── client.routes.js
│   ├── keyword.routes.js
│   ├── task.routes.js
│   ├── audit.routes.js
│   ├── report.routes.js
│   ├── backlink.routes.js
│   ├── user.routes.js
│   └── notification.routes.js
│
├── services/         # Business logic
│   ├── ai.service.js
│   └── audit.service.js
│
├── middleware/       # Express middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validator.js
│
├── jobs/            # Scheduled jobs
│   └── scheduler.js
│
├── utils/           # Utilities
│   └── logger.js
│
└── server.js        # Main entry point
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- For Atlas: Whitelist your IP address

### OpenAI API Errors
- Verify API key is valid
- Check API quota/billing
- Ensure internet connection

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

## Next Steps
After backend is running, proceed to frontend setup in `/frontend/README.md`
