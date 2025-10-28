# Render Deployment Configuration for Low Memory Environments

## Memory Tiers

The application automatically detects available memory and adjusts configuration:

### Low Memory (512MB - 1GB) - Render Free Tier
- **Max Discovery**: 50 pages
- **Max Analysis**: 25 pages  
- **Batch Size**: 2 pages at a time
- **Batch Delay**: 2000ms (2 seconds)
- **Deep Analysis**: Disabled (skips broken link checks, heavy operations)

### Medium Memory (2GB) - Render Starter Plan
- **Max Discovery**: 100 pages
- **Max Analysis**: 50 pages
- **Batch Size**: 3 pages at a time
- **Batch Delay**: 1500ms
- **Deep Analysis**: Enabled

### High Memory (4GB+) - Local Development / Larger Plans
- **Max Discovery**: 200 pages
- **Max Analysis**: 100 pages
- **Batch Size**: 5 pages at a time
- **Batch Delay**: 1000ms
- **Deep Analysis**: Enabled

## Render Deployment Steps

### 1. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `echo5-seo-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (512MB) or Starter ($7/mo, 512MB)

### 2. Environment Variables

Add these in Render Dashboard → Environment:

```
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_random_string
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-vercel-app.vercel.app
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Optional: Override Memory Tier

Force a specific memory tier (not recommended - auto-detection is better):

```
MEMORY_TIER=low
```

### 4. Optional: Custom Limits

Override specific limits:

```
MAX_PAGES_DISCOVERY=30
MAX_PAGES_ANALYSIS=15
BATCH_SIZE=1
BATCH_DELAY_MS=3000
```

## Render Free Tier Limitations

### What Works:
✅ Basic site audits (25 pages deep analysis)
✅ Page discovery (50 pages)
✅ Essential SEO checks (robots.txt, sitemap, SSL)
✅ Meta tag analysis from discovered pages
✅ Client management, keywords, tasks
✅ Real-time notifications

### What's Skipped (Low Memory):
⚠️ Broken link checking (memory intensive)
⚠️ Comprehensive meta tag crawling
⚠️ Alt tag validation across all images
⚠️ Schema markup deep analysis
⚠️ Link redirect chains

### Workarounds for Free Tier:

1. **Use MongoDB Atlas Free Tier** (512MB RAM)
   - Shared cluster (M0)
   - Up to 512MB storage
   - Free forever

2. **Upgrade to Render Starter** ($7/mo)
   - 512MB RAM (same as free)
   - No cold starts
   - Custom domains
   - Better uptime

3. **Split Large Audits**
   - Run multiple smaller audits on different sections
   - Focus on most important pages first

4. **Schedule Audits During Off-Peak**
   - Use the job scheduler for background processing
   - Less memory contention

## Performance Tips for Low Memory

### 1. Optimize MongoDB Queries
```javascript
// Use lean() for read-only operations
const clients = await Client.find().lean();

// Limit fields returned
const audits = await Audit.find().select('domain status summary');

// Use pagination
const tasks = await Task.find().limit(20).skip(page * 20);
```

### 2. Clear Response Data
```javascript
// In your routes, don't send huge response objects
res.json({
  success: true,
  data: audit.summary, // Send summary only, not full results
  id: audit._id
});
```

### 3. Stream Large Responses
```javascript
// For large data exports
res.setHeader('Content-Type', 'application/json');
res.write('[');
// Stream items one by one
res.write(']');
res.end();
```

## Monitoring Memory Usage

### Add Memory Logging
The audit service now logs memory tier on startup:

```
🧠 Memory tier: LOW (512MB available)
📊 Config: Discovery=50, Analysis=25, Batch=2
```

### Check Render Logs
Monitor your Render logs for:
- Memory tier detection
- Batch processing progress
- Skipped operations warnings

### Upgrade When Needed

If you see frequent errors or need more capacity:

1. **Render Pro** ($25/mo) - 2GB RAM
2. **Render Pro Plus** ($85/mo) - 4GB RAM
3. **Custom Plans** - 8GB+ RAM

## Testing Locally

Test low-memory mode locally:

```bash
# Force low memory tier
export MEMORY_TIER=low
npm run dev
```

Or set in `.env`:
```
MEMORY_TIER=low
```

## Alternative: Multi-Instance Strategy

For very large sites on free tier:

1. Deploy multiple Render instances
2. Each handles different sections:
   - Instance 1: Homepage + blog
   - Instance 2: Products
   - Instance 3: Services
3. Aggregate results in frontend

## Questions?

- Memory errors? Check Render logs for OOM (Out of Memory) errors
- Slow audits? Normal for free tier (cold starts + limited memory)
- Incomplete results? Expected on low memory - critical data is still collected

## Summary

The application now **automatically adapts** to available memory:
- ✅ Works on Render Free Tier (limited but functional)
- ✅ Improves on paid plans (more comprehensive audits)
- ✅ Full features on high-memory environments (local dev, large servers)
