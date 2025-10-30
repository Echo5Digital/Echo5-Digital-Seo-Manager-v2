const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const axios = require('axios');

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

        // Create a live request payload
        // Note: DataForSEO uses location_code (numeric) not location_name
        // Common codes: 2356 = India, 2840 = United States, 2826 = United Kingdom
        // Default to India (2356) for Kochi/Kerala searches
        let locationCode = 2356; // India default
        let locationName = location || 'India';
        
        // Map common location strings to codes
        if (location) {
          const loc = location.toLowerCase();
          if (loc.includes('united states') || loc.includes('usa') || loc.includes('us')) {
            locationCode = 2840;
            locationName = 'United States';
          } else if (loc.includes('united kingdom') || loc.includes('uk')) {
            locationCode = 2826;
            locationName = 'United Kingdom';
          } else if (loc.includes('india')) {
            locationCode = 2356;
            locationName = 'India';
          } else if (loc.includes('canada')) {
            locationCode = 2124;
            locationName = 'Canada';
          } else if (loc.includes('australia')) {
            locationCode = 2036;
            locationName = 'Australia';
          }
          // For other locations, try to use India as default or the user can specify location_code
        }

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
        console.log('📍 Location:', locationName, '(code:', locationCode + ')');
        console.log('📤 Payload:', JSON.stringify(payload, null, 2));
        
        const liveRes = await axios.post(liveUrl, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30s timeout for live results
        });

        console.log('✅ DataForSEO Response Status:', liveRes.data?.status_code, liveRes.data?.status_message);
        
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
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type === 'organic') {
              const itemDomain = normalizeDomain(item.url || item.domain || '');
              console.log(`  [${item.rank_absolute || i + 1}] ${item.url} -> ${itemDomain}`);
              if (itemDomain && (itemDomain === normalizedTarget || itemDomain.includes(normalizedTarget))) {
                finalResult = item.rank_absolute || item.rank_group || (i + 1);
                console.log('🎯 Position found:', finalResult, 'URL:', item.url);
                break;
              }
            }
          }
          
          if (finalResult) {
            return res.json({ 
              status: 'success', 
              data: { 
                domain, 
                keyword, 
                rank: finalResult, 
                inTop100: true, 
                difficulty, 
                location: locationName, 
                checkedAt: new Date(), 
                source: 'dataforseo' 
              } 
            });
          } else {
            // Domain not found in top 100
            console.warn('⚠️ Domain not found in top 100 results');
            return res.json({
              status: 'success',
              data: {
                domain,
                keyword,
                rank: null,
                inTop100: false,
                difficulty,
                location: locationName,
                checkedAt: new Date(),
                source: 'dataforseo',
                message: 'Not found in top 100 results'
              }
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

module.exports = router;
