const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const axios = require('axios');
const RankHistory = require('../models/RankHistory.model');

// Helper: shallow-domain match
function normalizeDomain(u) {
  try {
    if (!u) return '';
    if (!u.startsWith('http')) u = 'http://' + u;
    const parsed = new URL(u);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return String(u).replace(/^www\./, '').toLowerCase();
  }
}

// Helper: try to find position for a domain inside a DataForSEO-like result structure
function findPositionInResults(results, targetDomain) {
  targetDomain = normalizeDomain(targetDomain);
  if (!results) return null;

  const walk = (node) => {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const p = walk(item);
        if (p) return p;
      }
      return null;
    }

    if (typeof node === 'object') {
      // Common shapes: { position, url } or { url, domain } or { items: [...] }
      if (node.url || node.domain) {
        const url = node.url || node.domain || '';
        const hostname = normalizeDomain(url);
        if (hostname && hostname.includes(targetDomain)) {
          // Prefer explicit position if present
          return node.position || node.pos || node.rank || null;
        }
      }

      for (const k of Object.keys(node)) {
        const p = walk(node[k]);
        if (p) return p;
      }
    }

    return null;
  };

  return walk(results);
}

// POST /api/keyword-planner/analyze - Analyze keywords with location
router.post('/analyze', protect, async (req, res, next) => {
  try {
    const { keywords, location, clientId } = req.body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Keywords array is required',
      });
    }

    if (!location) {
      return res.status(400).json({
        status: 'error',
        message: 'Location is required',
      });
    }

    console.log(`🔍 Analyzing ${keywords.length} keywords for location: ${location}`);

    // Get keyword planner data from AI service
    const plannerData = await aiService.getKeywordPlannerData(keywords, location);

    console.log(`✅ Keyword planner analysis complete`);

    res.json({
      status: 'success',
      data: plannerData,
    });
  } catch (error) {
    console.error('❌ Keyword planner error:', error);
    next(error);
  }
});

// POST /api/keyword-planner/rank - Check keyword rank for a domain (mock/AI)
router.post('/rank', protect, async (req, res, next) => {
  try {
    const { domain, keyword, location } = req.body;

    if (!domain || !keyword) {
      return res.status(400).json({ status: 'error', message: 'Domain and keyword are required' });
    }

    // If DataForSEO credentials are configured, try a live lookup
    const dfUser = process.env.DATAFORSEO_USER;
    const dfPass = process.env.DATAFORSEO_PASS;

    // Use AI service to get a difficulty estimate (optional)
    let difficulty = 50;
    try {
      const analysis = await aiService.analyzeKeywordDifficulty(keyword);
      difficulty = analysis.difficulty || difficulty;
    } catch (err) {
      console.warn('AI difficulty analysis failed, using default', err.message || err);
    }

    if (dfUser && dfPass) {
      try {
        const auth = Buffer.from(`${dfUser}:${dfPass}`).toString('base64');
        
        // Use the LIVE endpoint for immediate results (costs slightly more but no polling needed)
        const liveUrl = 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced';

        // Determine location code based on provided location or default to United States
        let locationCode = 2840; // United States default
        
        // Map common locations to DataForSEO location codes
        // Grouped by region and sorted alphabetically
        const locationMap = {
          // North America
          'canada': 2124,
          'united states': 2840,
          'usa': 2840,
          'us': 2840,
          
          // Europe
          'france': 2250,
          'germany': 2276,
          'united kingdom': 2826,
          'uk': 2826,
          
          // Asia-Pacific
          'australia': 2036,
          'india': 2356,
          'singapore': 2702,
          
          // Middle East
          'dubai': 2784,
          'uae': 2784
        };
        
        if (location) {
          const normalizedLocation = location.toLowerCase().trim();
          // Check if location matches any of our mapped countries
          for (const [key, code] of Object.entries(locationMap)) {
            if (normalizedLocation.includes(key)) {
              locationCode = code;
              break;
            }
          }
          // If no match found in map, try to use as city name with India default
          // For city-specific searches, we'll use location_name with a valid location_code
        }

        // Create a live request payload
        const payload = [
          {
            keyword: keyword,
            language_code: 'en',
            location_code: locationCode,
            device: 'desktop',
            os: 'windows',
            depth: 100, // Check top 100 results
            calculate_rectangles: false // Don't need visual data
          }
        ];

        console.log('🔍 Calling DataForSEO LIVE API for keyword:', keyword, 'domain:', domain);
        console.log('� Location:', location, '| Location Code:', locationCode);
        console.log('🌐 Server environment:', process.env.NODE_ENV);
        console.log('�📤 Payload:', JSON.stringify(payload, null, 2));
        
        const liveRes = await axios.post(liveUrl, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30s timeout for live results
        });

        console.log('✅ DataForSEO Response Status:', liveRes.data?.status_code, liveRes.data?.status_message);
        console.log('📊 Response cost:', liveRes.data?.cost || 'N/A');
        
        // Check for API errors
        if (liveRes.data?.status_code >= 40000) {
          const errorMsg = liveRes.data?.status_message || 'Unknown DataForSEO error';
          console.error('❌ DataForSEO API Error:', errorMsg);
          throw new Error(`DataForSEO: ${errorMsg}`);
        }

        // Check for task-level errors
        const taskData = liveRes.data?.tasks?.[0];
        if (taskData?.status_code >= 40000) {
          const taskError = taskData.status_message || 'Task error';
          console.error('❌ DataForSEO Task Error:', taskError);
          throw new Error(`DataForSEO Task: ${taskError}`);
        }

        // Live endpoint returns results immediately
        const items = taskData?.result?.[0]?.items;
        
        if (items && Array.isArray(items)) {
          console.log(`📦 Found ${items.length} search results from DataForSEO`);
          
          // Search through organic results for our domain
          const normalizedTarget = normalizeDomain(domain);
          console.log('🔍 Searching for domain:', domain, '(normalized:', normalizedTarget + ')');
          
          let finalResult = null;
          let organicPosition = 0; // Track organic-only position
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type === 'organic') {
              organicPosition++; // Increment for each organic result
              const itemDomain = normalizeDomain(item.url || item.domain || '');
              console.log(`  [Organic #${organicPosition}, Absolute #${item.rank_absolute || i + 1}] ${item.url} -> ${itemDomain}`);
              if (itemDomain && (itemDomain === normalizedTarget || itemDomain.includes(normalizedTarget))) {
                finalResult = organicPosition; // Use organic position instead of rank_absolute
                console.log('🎯 Position found: Organic #' + finalResult + ' (Absolute #' + (item.rank_absolute || i + 1) + ') URL:', item.url);
                break;
              }
            }
          }
          
          if (finalResult) {
            // Save to database
            const rankData = {
              domain, 
              keyword, 
              rank: finalResult, 
              inTop100: true, 
              difficulty, 
              location: location || `Location Code: ${locationCode}`, 
              locationCode: locationCode,
              checkedAt: new Date(), 
              source: 'dataforseo'
            };
            
            try {
              await RankHistory.create(rankData);
              console.log('✅ Rank history saved to database');
            } catch (dbError) {
              console.error('⚠️ Failed to save rank history:', dbError.message);
              // Continue even if save fails
            }
            
            return res.json({ 
              status: 'success', 
              data: rankData
            });
          } else {
            // Domain not found in top 100
            console.warn('⚠️ Domain not found in top 100 results');
            
            const rankData = {
              domain,
              keyword,
              rank: null,
              inTop100: false,
              difficulty,
              location: location || `Location Code: ${locationCode}`,
              locationCode: locationCode,
              checkedAt: new Date(),
              source: 'dataforseo',
              message: 'Not found in top 100 results'
            };
            
            try {
              await RankHistory.create(rankData);
              console.log('✅ Rank history (not found) saved to database');
            } catch (dbError) {
              console.error('⚠️ Failed to save rank history:', dbError.message);
              // Continue even if save fails
            }
            
            return res.json({
              status: 'success',
              data: rankData
            });
          }
        } else {
          console.warn('⚠️ No items in DataForSEO response');
          throw new Error('No results from DataForSEO');
        }
      } catch (err) {
        console.error('❌ DataForSEO lookup failed:', err.message || err);
        console.error('Full error:', err.response?.data || err);
        
        // Check if it's an IP whitelist error
        if (err.message?.includes('IP') || err.response?.data?.status_message?.includes('IP')) {
          console.error('⚠️ Possible IP whitelist issue - add your IP to DataForSEO whitelist');
        }
        
        // Return error instead of demo data
        return res.status(500).json({
          status: 'error',
          message: 'DataForSEO API error: ' + (err.message || 'Unknown error'),
          error: err.response?.data?.status_message || err.message
        });
      }
    }

    // If DataForSEO credentials are not configured, return error
    return res.status(400).json({
      status: 'error',
      message: 'DataForSEO credentials not configured. Please add DATAFORSEO_USER and DATAFORSEO_PASS to environment variables.'
    });
  } catch (error) {
    console.error('❌ Rank check error:', error);
    next(error);
  }
});

// Get rank history from database
router.get('/rank-history', protect, async (req, res) => {
  try {
    const { limit = 100, domain, keyword } = req.query;
    
    const query = {};
    if (domain) query.domain = { $regex: domain, $options: 'i' };
    if (keyword) query.keyword = { $regex: keyword, $options: 'i' };
    
    const history = await RankHistory.find(query)
      .sort({ checkedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    console.error('❌ Error fetching rank history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch rank history'
    });
  }
});

// Debug endpoint to check environment configuration
router.get('/debug-config', (req, res) => {
  const locationCode = getLocationCode(req.query.location || 'United States');
  res.json({
    environment: process.env.NODE_ENV || 'development',
    dataForSeoEmail: process.env.DATAFORSEO_EMAIL ? '***configured***' : '❌ missing',
    dataForSeoPassword: process.env.DATAFORSEO_PASSWORD ? '***configured***' : '❌ missing',
    requestLocation: req.query.location || 'United States',
    mappedLocationCode: locationCode,
    serverTime: new Date().toISOString(),
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'user-agent': req.headers['user-agent']
    }
  });
});

module.exports = router;
