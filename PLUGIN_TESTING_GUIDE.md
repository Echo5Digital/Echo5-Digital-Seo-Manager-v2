# 🧪 Testing the WordPress Plugin

## Quick Test Guide

### Step 1: Install the Plugin

1. **Package the plugin:**
   ```bash
   cd /Users/manu/Documents/projects/Echo5-digital-Seo-Ops-v2/wordpress-plugin
   zip -r echo5-seo-exporter.zip echo5-seo-exporter/
   ```

2. **Install on WordPress:**
   - Go to your WordPress admin (wp-admin)
   - Navigate to **Plugins > Add New > Upload Plugin**
   - Upload `echo5-seo-exporter.zip`
   - Click **Activate Plugin**

3. **Get API Key:**
   - Go to **Settings > Echo5 SEO Exporter**
   - Copy the API key (starts with `echo5_`)

---

## Step 2: Test with cURL

### A. Health Check (Verify Plugin is Active)

```bash
curl -X GET "https://your-site.com/wp-json/echo5-seo/v1/health" \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "version": "1.0.0",
  "wordpress_version": "6.4.1",
  "php_version": "8.1.0",
  "timestamp": "2025-11-25 10:30:00"
}
```

✅ **If this works, the plugin is installed correctly!**

---

### B. Get All Content

```bash
curl -X GET "https://your-site.com/wp-json/echo5-seo/v1/content/all?per_page=5" \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "page",
      "url": "https://your-site.com/about",
      "title": "About Us",
      "content": {
        "word_count": 450,
        "text": "Full text content..."
      },
      "seo": {
        "meta_title": "About Us",
        "meta_description": "Learn about our company..."
      }
    }
  ],
  "pagination": {
    "total": 25,
    "pages": 5,
    "current_page": 1
  }
}
```

---

### C. Get Single Page

```bash
curl -X GET "https://your-site.com/wp-json/echo5-seo/v1/pages/1" \
  -H "X-API-Key: YOUR_API_KEY_HERE"
```

---

## Step 3: Test with Node.js Script

### A. Update Configuration

Edit `backend/scripts/test-wordpress-plugin.js`:

```javascript
const TEST_SITE_URL = 'https://your-actual-site.com';
const API_KEY = 'echo5_your_actual_api_key_here';
```

### B. Run the Test Script

```bash
cd /Users/manu/Documents/projects/Echo5-digital-Seo-Ops-v2/backend
node scripts/test-wordpress-plugin.js
```

**Expected Output:**
```
═══════════════════════════════════════════════
   Echo5 SEO Exporter Plugin - Test Suite
═══════════════════════════════════════════════

📍 Testing Site: https://your-site.com
🔑 API Key: echo5_abc123...

🔍 Testing: Health Check
   Endpoint: /health
   ✅ PASS - Status: 200
   📊 Version: 1.0.0
   📊 WP Version: 6.4.1

🔍 Testing: Get All Content
   Endpoint: /content/all?per_page=5
   ✅ PASS - Status: 200
   📊 Found 5 items
   📄 Sample: "Home"

...

═══════════════════════════════════════════════
   Test Summary
═══════════════════════════════════════════════

Total Tests: 7
✅ Passed: 7
❌ Failed: 0

🎉 ALL TESTS PASSED!
The plugin is working perfectly.
```

---

## Step 4: Test with Browser

### Option A: Direct API Call

Open your browser and navigate to:

```
https://your-site.com/wp-json/echo5-seo/v1/health?api_key=YOUR_API_KEY
```

You should see JSON response with plugin health status.

### Option B: Browser Console

```javascript
// Open browser console (F12) and run:
fetch('https://your-site.com/wp-json/echo5-seo/v1/content/all?per_page=5', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY_HERE'
  }
})
.then(res => res.json())
.then(data => console.log(data))
```

---

## Step 5: Test Integration with Echo5 Platform

### A. Update Client Record

Add API key to client in MongoDB:

```javascript
// In MongoDB or via backend
db.clients.updateOne(
  { domain: "https://your-site.com" },
  { 
    $set: { 
      wordpressPluginApiKey: "echo5_your_api_key",
      wordpressPluginEnabled: true,
      dataSource: "wordpress_plugin"
    }
  }
)
```

### B. Test from Backend

```javascript
// In Node.js console or create test script
const wpService = require('./services/wordpress-plugin.service');

wpService.testConnection(
  'https://your-site.com',
  'echo5_your_api_key'
).then(result => console.log(result));
```

---

## Common Issues & Solutions

### ❌ 404 Not Found

**Problem:** Plugin not installed or REST API disabled

**Solutions:**
1. Verify plugin is activated in WordPress
2. Check if REST API is working: Visit `https://your-site.com/wp-json/`
3. Check permalink settings (Settings > Permalinks > Save)

---

### ❌ 401/403 Unauthorized

**Problem:** Invalid API key

**Solutions:**
1. Copy API key from WordPress Settings > Echo5 SEO Exporter
2. Regenerate API key if needed
3. Check for extra spaces in API key

---

### ❌ CORS Error (in browser)

**Problem:** Browser blocking cross-origin requests

**Solution:** Use server-side (Node.js) or add CORS headers
- The plugin already supports CORS for REST API
- Use cURL or Node.js for testing instead of browser

---

### ❌ Empty Data Response

**Problem:** No pages/posts found

**Solutions:**
1. Check if site has published pages/posts
2. Verify post status is "publish" (not draft)
3. Check pagination params

---

### ❌ Timeout

**Problem:** Large site taking too long

**Solutions:**
1. Reduce `per_page` parameter (try 10-20 instead of 100)
2. Enable caching in plugin settings
3. Increase request timeout in code

---

## Verify Plugin Installation

### Check in WordPress Admin:

1. **Go to Plugins page**
   - Should see "Echo5 SEO Exporter" with green "Active"

2. **Check Settings menu**
   - Should see "Echo5 SEO Exporter" under Settings

3. **Visit Settings page**
   - Should display API key and endpoint list
   - Status section should show plugin version

---

## Test Checklist

Use this checklist to verify everything works:

- [ ] Plugin uploaded and activated
- [ ] Settings page accessible
- [ ] API key visible in settings
- [ ] Health check endpoint returns 200
- [ ] Content endpoint returns data
- [ ] Pages endpoint returns data
- [ ] Data includes SEO metadata
- [ ] Images include alt text
- [ ] Links are extracted
- [ ] SEO plugin detected (if Yoast/RankMath installed)
- [ ] Pagination works
- [ ] Authentication rejects invalid keys
- [ ] Node.js test script passes all tests

---

## Next Steps After Successful Test

1. **Document API key securely**
2. **Add to .env file** (don't commit to Git)
3. **Update Client records** with API keys
4. **Modify audit service** to use plugin
5. **Test full audit workflow**
6. **Roll out to more clients**

---

## Example .env Configuration

```bash
# Client 1
CLIENT1_DOMAIN=https://site1.com
CLIENT1_WP_API_KEY=echo5_abc123...

# Client 2
CLIENT2_DOMAIN=https://site2.com
CLIENT2_WP_API_KEY=echo5_def456...
```

---

## Support

If tests fail after following this guide:

1. Check WordPress error logs
2. Check PHP error logs on server
3. Verify WordPress and PHP versions meet requirements
4. Test REST API: `curl https://your-site.com/wp-json/`
5. Contact developer with error details
