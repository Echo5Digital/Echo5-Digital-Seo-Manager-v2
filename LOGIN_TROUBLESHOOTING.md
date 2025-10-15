# Login Troubleshooting Guide

## ✅ System Status (As of October 16, 2025)

### Servers Running:
- **Backend**: http://localhost:5001 ✅
- **Frontend**: http://localhost:3000 ✅
- **MongoDB**: Atlas Cloud (Connected) ✅

### Admin Credentials:
- **Email**: `admin@echo5.com`
- **Password**: `Admin@123456`
- **Role**: Boss (Full Access)

---

## 🔐 How to Login

1. **Open your browser** and go to: http://localhost:3000

2. **You should be redirected to**: http://localhost:3000/login

3. **Enter credentials**:
   - Email: `admin@echo5.com`
   - Password: `Admin@123456`

4. **Click "Sign In"**

5. **You should be redirected to**: http://localhost:3000/dashboard

---

## 🐛 Common Issues & Solutions

### Issue 1: "Can't login" or No Response

**Possible Causes**:
- Backend server not running
- Frontend server not running
- Network/CORS issues

**Solutions**:
```bash
# Check if backend is running
lsof -i :5001 | grep LISTEN

# Check if frontend is running  
lsof -i :3000 | grep LISTEN

# If not running, restart them:
# Backend:
cd "/Users/manu/Documents/Echo5 Seo Ops/backend" && npm run dev

# Frontend (in a new terminal):
cd "/Users/manu/Documents/Echo5 Seo Ops/frontend" && npm run dev
```

### Issue 2: "Invalid email or password"

**Solution**: Reset admin user
```bash
cd "/Users/manu/Documents/Echo5 Seo Ops/backend"
node scripts/reset-admin.js
```

This will recreate the admin account with the correct credentials.

### Issue 3: Backend Port Conflict (EADDRINUSE)

**Cause**: Port 5001 is already in use

**Solution**:
```bash
# Kill all node processes
pkill -9 node

# Wait a moment
sleep 2

# Restart backend
cd "/Users/manu/Documents/Echo5 Seo Ops/backend" && npm run dev

# Restart frontend
cd "/Users/manu/Documents/Echo5 Seo Ops/frontend" && npm run dev
```

### Issue 4: Frontend Shows Blank Page

**Possible Causes**:
- JavaScript errors in console
- API connection issues

**Solutions**:
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Check Console tab for errors
3. Check Network tab to see if API calls are being made
4. Verify `.env` file exists in frontend folder:
   ```bash
   cat "/Users/manu/Documents/Echo5 Seo Ops/frontend/.env"
   ```
   Should show:
   ```
   NUXT_PUBLIC_API_URL=http://localhost:5001
   NUXT_PUBLIC_SOCKET_URL=http://localhost:5001
   ```

### Issue 5: CORS Errors

**Cause**: Backend not allowing frontend requests

**Solution**: Check backend `server.js` CORS configuration (already configured for localhost:3000)

---

## 🧪 Test Backend API Directly

You can test if the backend is working correctly:

```bash
# Test login endpoint
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@echo5.com","password":"Admin@123456"}'
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "id": "...",
      "name": "Admin User",
      "email": "admin@echo5.com",
      "role": "Boss"
    }
  }
}
```

If this works, backend is fine - the issue is in the frontend.

---

## 🔄 Complete System Restart

If everything is broken, here's the nuclear option:

```bash
# 1. Kill all node processes
pkill -9 node

# 2. Wait a moment
sleep 3

# 3. Start backend
cd "/Users/manu/Documents/Echo5 Seo Ops/backend"
npm run dev &

# 4. Wait for backend to start
sleep 5

# 5. Start frontend
cd "/Users/manu/Documents/Echo5 Seo Ops/frontend"
npm run dev
```

---

## 📞 Additional Help

### Check Logs:
- Backend logs: Check terminal where backend is running
- Frontend logs: Check browser DevTools Console
- MongoDB logs: Check MongoDB Atlas dashboard

### Verify User Exists:
```bash
cd "/Users/manu/Documents/Echo5 Seo Ops/backend"
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'admin@echo5.com' });
  console.log('User:', user);
  await mongoose.connection.close();
});
"
```

### Test Frontend API Connection:
Open browser console at http://localhost:3000 and run:
```javascript
// Test if API is reachable
fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@echo5.com', password: 'Admin@123456' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## ✅ Success Checklist

Before attempting login, verify:

- [ ] Backend server running on port 5001
- [ ] Frontend server running on port 3000  
- [ ] MongoDB connection successful (check backend logs)
- [ ] Admin user exists in database
- [ ] Browser can access http://localhost:3000
- [ ] No CORS errors in browser console
- [ ] Backend API responds to curl test

Once all checked, login should work! 🎉
