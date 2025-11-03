const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const axios = require('axios');
const RankHistory = require('../models/RankHistory.model');
const rankService = require('../services/rank.service');

// Configure axios defaults for better connection handling
axios.defaults.httpAgent = new (require('http').Agent)({ 
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 90000
});
axios.defaults.httpsAgent = new (require('https').Agent)({ 
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 90000
});

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

// Helper: convert location name to DataForSEO location code
function getLocationCode(location) {
  if (!location) return 2840; // Default to United States
  
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
    'spain': 2724,
    'italy': 2380,
    'netherlands': 2528,
    
    // Asia-Pacific
    'australia': 2036,
    'india': 2356,
    'singapore': 2702,
    'japan': 2392,
    'china': 2156,
    
    // Middle East
    'dubai': 2784,
    'uae': 2784,
    'united arab emirates': 2784
  };
  
  const normalizedLocation = location.toLowerCase().trim();
  
  // Check if location matches any of our mapped countries
  for (const [key, code] of Object.entries(locationMap)) {
    if (normalizedLocation.includes(key)) {
      return code;
    }
  }
  
  // Default to United States if no match
  return 2840;
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

    // ============================================
    // OXYLABS INTEGRATION
    // ============================================
    if (rankService.isOxylabs()) {
      console.log('🌐 Using Oxylabs API for rank checking');
      
      try {
        const result = await rankService.checkRankWithOxylabs({
          keyword,
          domain,
          location: location || 'United States'
        });

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Get AI difficulty estimate
        let difficulty = 50;
        try {
          const analysis = await aiService.analyzeKeywordDifficulty(keyword);
          difficulty = analysis.difficulty || difficulty;
        } catch (err) {
          console.warn('AI difficulty analysis failed, using default', err.message || err);
        }

        if (result.found) {
          // Find previous rank for comparison
          let previousRank = null;
          let rankChange = null;
          
          try {
            const previousRecord = await RankHistory.findOne({
              domain,
              keyword,
              month: { $ne: month }
            }).sort({ checkedAt: -1 });

            if (previousRecord && previousRecord.rank) {
              previousRank = previousRecord.rank;
              rankChange = previousRank - result.rank;
            }
          } catch (err) {
            console.warn('⚠️ Could not fetch previous rank:', err.message);
          }

          const rankData = {
            domain,
            keyword,
            rank: result.rank,
            inTop100: true,
            difficulty,
            location: location || 'United States',
            month,
            year,
            previousRank,
            rankChange,
            checkedAt: now,
            source: 'oxylabs'
          };

          // Delete older checks from today
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          const deleted = await RankHistory.deleteMany({
            domain,
            keyword,
            checkedAt: { $gte: startOfDay, $lt: endOfDay }
          });
          
          if (deleted.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
          }

          await RankHistory.create(rankData);
          console.log('✅ Rank history saved to database');

          return res.json({
            status: 'success',
            data: rankData
          });
        } else {
          // Not found in top 100
          let previousRank = null;
          let rankChange = null;
          
          try {
            const previousRecord = await RankHistory.findOne({
              domain,
              keyword,
              month: { $ne: month }
            }).sort({ checkedAt: -1 });

            if (previousRecord && previousRecord.rank) {
              previousRank = previousRecord.rank;
              rankChange = previousRank - 101;
            }
          } catch (err) {
            console.warn('⚠️ Could not fetch previous rank:', err.message);
          }

          const rankData = {
            domain,
            keyword,
            rank: null,
            inTop100: false,
            difficulty,
            location: location || 'United States',
            month,
            year,
            previousRank,
            rankChange,
            checkedAt: now,
            source: 'oxylabs',
            message: `Not ranked in top 100 results${previousRank ? ` (previously ranked #${previousRank})` : ''}`
          };

          // Delete older checks from today
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          const deleted = await RankHistory.deleteMany({
            domain,
            keyword,
            checkedAt: { $gte: startOfDay, $lt: endOfDay }
          });
          
          if (deleted.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
          }

          await RankHistory.create(rankData);
          console.log('✅ Rank history saved (not in top 100)');

          return res.json({
            status: 'success',
            data: rankData
          });
        }
      } catch (oxyError) {
        console.error('❌ Oxylabs API error:', oxyError.message);
        return res.status(500).json({
          status: 'error',
          message: `Oxylabs API error: ${oxyError.message}`
        });
      }
    }

    // ============================================
    // DATAFORSEO INTEGRATION (FALLBACK)
    // ============================================
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

        // Progressive depth search to save API credits
        // Start with depth 10, then 20, 50, and finally 100 if not found
        const searchDepths = [10, 20, 50, 100];
        let finalResult = null;
        let totalCost = 0;
        
        console.log('🔍 Starting progressive rank check for keyword:', keyword, 'domain:', domain);
        console.log('📍 Location:', location, '| Location Code:', locationCode);
        
        for (const depth of searchDepths) {
          console.log(`\n🔎 Searching in top ${depth} results...`);
          
          // Create a live request payload
          const payload = [
            {
              keyword: keyword,
              language_code: 'en',
              location_code: locationCode,
              device: 'desktop',
              os: 'windows',
              depth: depth,
              calculate_rectangles: false // Don't need visual data
            }
          ];
          
          const liveRes = await axios.post(liveUrl, payload, {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60s timeout for live results
          });

          console.log(`✅ Response Status: ${liveRes.data?.status_code}, Cost: ${liveRes.data?.cost || 'N/A'}`);
          totalCost += liveRes.data?.cost || 0;
          
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
            
            let organicPosition = 0; // Track organic-only position
            let found = false;
            
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type === 'organic') {
                organicPosition++; // Increment for each organic result
                const itemDomain = normalizeDomain(item.url || item.domain || '');
                console.log(`  [Organic #${organicPosition}, Absolute #${item.rank_absolute || i + 1}] ${item.url} -> ${itemDomain}`);
                if (itemDomain && (itemDomain === normalizedTarget || itemDomain.includes(normalizedTarget))) {
                  finalResult = organicPosition; // Use organic position instead of rank_absolute
                  console.log(`🎯 FOUND at Organic #${finalResult} (Absolute #${item.rank_absolute || i + 1}) URL: ${item.url}`);
                  console.log(`💰 Total API cost for this search: ${totalCost} credits (checked up to depth ${depth})`);
                  found = true;
                  break;
                }
              }
            }
            
            // If found, stop progressive search
            if (found) {
              break;
            }
          }
          
          // If this was the last depth and still not found
          if (depth === 100 && !finalResult) {
            console.log(`❌ Domain not found in top ${depth} results`);
            console.log(`💰 Total API cost: ${totalCost} credits`);
          }
        }
        
        // Continue with existing logic
        if (true) {
          const items = []; // Placeholder to maintain code structure
          
          if (finalResult) {
            // Find previous rank for comparison
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            
            let previousRank = null;
            let rankChange = null;
            
            try {
              const previousRecord = await RankHistory.findOne({
                domain,
                keyword,
                month: { $ne: month } // Different month
              }).sort({ checkedAt: -1 });

              if (previousRecord && previousRecord.rank) {
                previousRank = previousRecord.rank;
                rankChange = previousRank - finalResult; // Positive = improved
              }
            } catch (err) {
              console.warn('⚠️ Could not fetch previous rank:', err.message);
            }
            
            // Save to database
            const rankData = {
              domain, 
              keyword, 
              rank: finalResult, 
              inTop100: true, 
              difficulty, 
              location: location || `Location Code: ${locationCode}`, 
              locationCode: locationCode,
              month,
              year,
              previousRank,
              rankChange,
              checkedAt: now, 
              source: 'dataforseo'
            };
            
            try {
              // Delete any older rank checks from today for this keyword
              const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
              
              const deleted = await RankHistory.deleteMany({
                domain,
                keyword,
                checkedAt: {
                  $gte: startOfDay,
                  $lt: endOfDay
                }
              });
              
              if (deleted.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
              }
              
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
            
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            
            // Find previous rank for comparison
            let previousRank = null;
            let rankChange = null;
            
            try {
              const previousRecord = await RankHistory.findOne({
                domain,
                keyword,
                month: { $ne: month } // Different month
              }).sort({ checkedAt: -1 });

              if (previousRecord && previousRecord.rank) {
                previousRank = previousRecord.rank;
                // Domain dropped out of top 100 - negative change
                rankChange = previousRank - 101; // Indicates it dropped below 100
              }
            } catch (err) {
              console.warn('⚠️ Could not fetch previous rank:', err.message);
            }
            
            const rankData = {
              domain,
              keyword,
              rank: null,
              inTop100: false,
              difficulty,
              location: location || `Location Code: ${locationCode}`,
              locationCode: locationCode,
              month,
              year,
              previousRank,
              rankChange,
              checkedAt: now,
              source: 'dataforseo',
              message: `Not ranked in top 100 results${previousRank ? ` (previously ranked #${previousRank})` : ''}`
            };
            
            try {
              // Delete any older rank checks from today for this keyword
              const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
              
              const deleted = await RankHistory.deleteMany({
                domain,
                keyword,
                checkedAt: {
                  $gte: startOfDay,
                  $lt: endOfDay
                }
              });
              
              if (deleted.deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
              }
              
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
        
        // Check if it's a timeout error
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          return res.status(504).json({
            status: 'error',
            message: 'Request timeout - DataForSEO API took too long to respond. Please try again.',
            error: 'TIMEOUT',
            suggestion: 'The API request exceeded 60 seconds. This may be due to network issues or high API load.'
          });
        }
        
        // Check if it's an IP whitelist error
        if (err.message?.includes('IP') || err.response?.data?.status_message?.includes('IP')) {
          console.error('⚠️ Possible IP whitelist issue - add your IP to DataForSEO whitelist');
          return res.status(403).json({
            status: 'error',
            message: 'IP address not whitelisted in DataForSEO account',
            error: 'IP_NOT_WHITELISTED',
            suggestion: 'Add your server IP to the DataForSEO whitelist in your account settings.'
          });
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

// Bulk rank check for multiple keywords
router.post('/bulk-rank-check', protect, async (req, res) => {
  try {
    const { domain, keywords, location = 'United States', clientId, keywordIds } = req.body;
    
    if (!domain || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Domain and keywords array are required'
      });
    }

    if (keywords.length > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Maximum 50 keywords allowed per bulk check'
      });
    }

    // Recommend smaller batch sizes for reliability
    if (keywords.length > 20) {
      console.log(`⚠️ Warning: Bulk checking ${keywords.length} keywords. For better reliability, consider batches of 10-20 keywords.`);
    }

    const results = [];
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // ============================================
    // OXYLABS INTEGRATION FOR BULK
    // ============================================
    if (rankService.isOxylabs()) {
      console.log(`🌐 Using Oxylabs API for bulk rank checking (${keywords.length} keywords)`);
      
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        const keywordId = keywordIds && keywordIds[i] ? keywordIds[i] : null;
        
        try {
          console.log(`\n🔍 [${i + 1}/${keywords.length}] Checking rank for: "${keyword}"`);
          
          const result = await rankService.checkRankWithOxylabs({
            keyword,
            domain,
            location
          });

          // Find previous rank for comparison
          let previousRank = null;
          let rankChange = null;
          
          const previousRecord = await RankHistory.findOne({
            domain,
            keyword,
            month: { $ne: month }
          }).sort({ checkedAt: -1 });

          if (previousRecord && previousRecord.rank) {
            previousRank = previousRecord.rank;
            if (result.found) {
              rankChange = previousRank - result.rank;
            } else {
              rankChange = previousRank - 101;
            }
          }

          const rankData = {
            domain,
            keyword,
            rank: result.rank,
            inTop100: result.found,
            difficulty: null, // Skip difficulty in bulk to save API calls
            location,
            month,
            year,
            previousRank,
            rankChange,
            checkedAt: now,
            source: 'oxylabs',
            client: clientId || null,
            keywordId: keywordId || null,
            message: result.found ? undefined : `Not ranked in top 100 results${previousRank ? ` (previously #${previousRank})` : ''}`
          };

          // Delete older checks from today
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          const deleted = await RankHistory.deleteMany({
            domain,
            keyword,
            checkedAt: { $gte: startOfDay, $lt: endOfDay }
          });
          
          if (deleted.deletedCount > 0) {
            console.log(`  🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
          }

          await RankHistory.create(rankData);
          results.push({
            keyword,
            rank: result.rank || null,
            inTop100: result.found,
            difficulty: null,
            previousRank,
            rankChange,
            message: rankData.message,
            status: 'success'
          });
          
          console.log(`✅ [${i + 1}/${keywords.length}] Rank: ${result.rank || 'Not in top 100'}, Change: ${rankChange !== null ? (rankChange > 0 ? `+${rankChange}` : rankChange) : 'N/A'}`);

          // Add delay between requests
          if (i < keywords.length - 1) {
            const delay = keywords.length > 20 ? 5000 : 4000;
            console.log(`  ⏱️ Waiting ${delay/1000}s before next keyword...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (keywordError) {
          console.error(`❌ Error checking rank for "${keyword}":`, keywordError.message);
          results.push({
            keyword,
            status: 'error',
            error: keywordError.message,
            rank: null,
            inTop100: false
          });
        }
      }

      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'error').length;

      return res.json({
        status: 'success',
        data: {
          domain,
          location,
          total: keywords.length,
          successful,
          failed,
          results,
          provider: 'oxylabs'
        },
        warning: failed > keywords.length / 2 ? 'More than 50% of checks failed. Consider checking API credentials.' : null
      });
    }

    // ============================================
    // DATAFORSEO INTEGRATION (FALLBACK)
    // ============================================
    const locationCode = getLocationCode(location);

    // Process each keyword
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      const keywordId = keywordIds && keywordIds[i] ? keywordIds[i] : null;
      
      try {
        console.log(`\n🔍 [${i + 1}/${keywords.length}] Checking rank for: "${keyword}"`);
        
        // Skip keyword difficulty in bulk checks to reduce API calls and avoid auth issues
        // Difficulty can be checked separately if needed
        let difficulty = null;

        // Page-by-page incremental checking to save API costs
        // Check 10 results at a time, stop when keyword is found
        let finalResult = null;
        const pageSize = 10;
        const maxDepth = 100;
        let totalCost = 0;
        
        for (let currentDepth = pageSize; currentDepth <= maxDepth; currentDepth += pageSize) {
          console.log(`  🔎 Checking results ${currentDepth - pageSize + 1}-${currentDepth}...`);
          
          // Retry logic for socket hang up errors
          let retries = 0;
          const maxRetries = 2;
          let liveRes = null;
          
          while (retries <= maxRetries) {
            try {
              liveRes = await axios.post('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', [{
                keyword,
                location_code: locationCode,
                language_code: 'en',
                depth: currentDepth // Incremental depth: 10, 20, 30, ... 100
              }], {
                auth: {
                  username: process.env.DATAFORSEO_USER,
                  password: process.env.DATAFORSEO_PASS
                },
                timeout: 90000, // 90s timeout
                headers: {
                  'Connection': 'keep-alive',
                  'Accept-Encoding': 'gzip, deflate'
                }
              });
              
              break; // Success, exit retry loop
            } catch (apiError) {
              if ((apiError.code === 'ECONNRESET' || apiError.message?.includes('socket hang up')) && retries < maxRetries) {
                retries++;
                console.log(`  ⚠️ Connection lost, retrying (${retries}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Progressive delay
              } else {
                throw apiError; // Re-throw if not retryable or max retries reached
              }
            }
          }

          totalCost += liveRes?.data?.cost || 0;
          const taskData = liveRes?.data?.tasks?.[0];
          const items = taskData?.result?.[0]?.items;
          
          if (items && Array.isArray(items)) {
            const normalizedTarget = normalizeDomain(domain);
            let organicPosition = 0;
            let found = false;
            
            for (let j = 0; j < items.length; j++) {
              const item = items[j];
              if (item.type === 'organic') {
                organicPosition++;
                const itemDomain = normalizeDomain(item.url || item.domain || '');
                if (itemDomain && (itemDomain === normalizedTarget || itemDomain.includes(normalizedTarget))) {
                  finalResult = organicPosition;
                  console.log(`  ✅ Found at #${finalResult} (total cost: ${totalCost.toFixed(4)} credits)`);
                  found = true;
                  break; // Stop searching once found
                }
              }
            }
            
            // Stop page-by-page search if keyword is found
            if (found) {
              break;
            }
          }
          
          // Small delay between page checks to avoid rate limiting
          if (currentDepth < maxDepth) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s between pages
          }
        }
        
        if (!finalResult) {
          console.log(`  ❌ Not found in top ${maxDepth} (total cost: ${totalCost.toFixed(4)} credits)`);
        }
        
        // Find previous rank for this keyword
        let previousRank = null;
        let rankChange = null;
        
        const previousRecord = await RankHistory.findOne({
          domain,
          keyword,
          month: { $ne: month } // Different month
        }).sort({ checkedAt: -1 });

        if (previousRecord && previousRecord.rank) {
          previousRank = previousRecord.rank;
          if (finalResult) {
            rankChange = previousRank - finalResult; // Positive = improved (moved up)
          } else {
            // Domain dropped out of top 100
            rankChange = previousRank - 101;
          }
        }

        const rankData = {
          domain,
          keyword,
          rank: finalResult,
          inTop100: !!finalResult,
          difficulty,
          location: location || `Location Code: ${locationCode}`,
          locationCode,
          month,
          year,
          previousRank,
          rankChange,
          checkedAt: now,
          source: 'dataforseo',
          client: clientId || null,
          keywordId: keywordId || null,
          message: finalResult ? undefined : `Not ranked in top 100 results${previousRank ? ` (previously #${previousRank})` : ''}`
        };

        // Delete any older rank checks from today for this keyword
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        const deleted = await RankHistory.deleteMany({
          domain,
          keyword,
          checkedAt: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        });
        
        if (deleted.deletedCount > 0) {
          console.log(`  🧹 Cleaned up ${deleted.deletedCount} older check(s) from today`);
        }

        await RankHistory.create(rankData);
        results.push({
          keyword,
          rank: finalResult || null,
          inTop100: !!finalResult,
          difficulty,
          previousRank,
          rankChange,
          message: rankData.message,
          status: 'success'
        });
        
        console.log(`✅ [${i + 1}/${keywords.length}] Rank: ${finalResult || 'Not in top 100'}, Change: ${rankChange !== null ? (rankChange > 0 ? `+${rankChange}` : rankChange) : 'N/A'}`);
      

        // Add delay between requests to avoid rate limiting and connection issues
        // Longer delay for bulk operations to prevent socket issues
        if (i < keywords.length - 1) {
          const delay = keywords.length > 20 ? 5000 : 4000; // 5s for large batches, 4s otherwise
          console.log(`  ⏱️ Waiting ${delay/1000}s before next keyword...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (keywordError) {
        console.error(`❌ Error checking rank for "${keyword}":`, keywordError.message);
        
        // Check if it's a socket hang up error
        if (keywordError.code === 'ECONNRESET' || keywordError.message?.includes('socket hang up')) {
          results.push({
            keyword,
            status: 'error',
            error: 'Connection lost - Please try again with fewer keywords or wait a moment',
            rank: null,
            inTop100: false
          });
        }
        // Check if it's a timeout error
        else if (keywordError.code === 'ECONNABORTED' || keywordError.message?.includes('timeout')) {
          results.push({
            keyword,
            status: 'error',
            error: 'Request timeout - API took too long to respond',
            rank: null,
            inTop100: false
          });
        }
        // Check if it's an auth error (401)
        else if (keywordError.response?.status === 401 || keywordError.message?.includes('401')) {
          results.push({
            keyword,
            status: 'error',
            error: 'Authentication failed - Check DataForSEO credentials',
            rank: null,
            inTop100: false
          });
        }
        else {
          results.push({
            keyword,
            status: 'error',
            error: keywordError.message,
            rank: null,
            inTop100: false
          });
        }
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    res.json({
      status: 'success',
      data: {
        checked: keywords.length,
        successful,
        failed,
        results
      },
      // Add recommendation if many failures
      ...(failed > keywords.length * 0.3 && {
        warning: 'High failure rate detected. Consider checking fewer keywords at once (recommended: 10-20) or waiting a few minutes between bulk checks.'
      })
    });

  } catch (error) {
    console.error('❌ Bulk rank check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Bulk rank check failed'
    });
  }
});

// Get monthly comparison data - ENHANCED VERSION
router.get('/monthly-comparison', protect, async (req, res) => {
  try {
    const { domain, clientId, months = 6 } = req.query;
    
    if (!domain && !clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Either domain or clientId is required'
      });
    }

    const query = {};
    if (domain) query.domain = { $regex: domain, $options: 'i' };
    if (clientId) query.client = clientId;

    // Get data for the last N months OR all available months
    const now = new Date();
    const monthsToFetch = parseInt(months) || 12; // Default to 12 months
    
    // First, fetch ALL records to see what months we actually have data for
    const allRecords = await RankHistory.find(query)
      .sort({ year: -1, month: -1, checkedAt: -1 });

    if (allRecords.length === 0) {
      return res.json({
        status: 'success',
        data: {
          monthlyData: {},
          keywordTimeline: [],
          comparisons: [],
          performanceCategories: {
            topPerformers: 0,
            needAttention: 0,
            lostVisibility: 0,
            stable: 0,
            new: 0,
            details: {
              topPerformers: [],
              needAttention: [],
              lostVisibility: [],
              stable: [],
              new: []
            }
          },
          monthlyStats: [],
          summary: {
            improved: 0,
            declined: 0,
            unchanged: 0,
            new: 0,
            lost: 0,
            totalKeywords: 0
          },
          metadata: {
            domain: domain || 'N/A',
            monthsAnalyzed: monthsToFetch,
            dateRange: 'No data available',
            generatedAt: new Date().toISOString(),
            message: 'No rank history data found for the specified criteria'
          }
        }
      });
    }

    // Find unique month-year combinations from actual data
    const uniqueMonths = new Map();
    allRecords.forEach(record => {
      const key = `${record.year}-${String(record.month).padStart(2, '0')}`;
      if (!uniqueMonths.has(key)) {
        const date = new Date(record.year, record.month - 1, 1);
        uniqueMonths.set(key, {
          month: record.month,
          year: record.year,
          monthKey: key,
          monthName: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          date: date
        });
      }
    });

    // Sort months by date (newest first) and limit to requested number
    const monthYearPairs = Array.from(uniqueMonths.values())
      .sort((a, b) => b.date - a.date)
      .slice(0, monthsToFetch);

    console.log(`📊 Monthly Comparison Query:`, {
      domain,
      clientId,
      monthsRequested: monthsToFetch,
      monthsFound: monthYearPairs.length,
      monthYearPairs: monthYearPairs.map(m => `${m.year}-${m.month}`),
      recordsFound: allRecords.length,
      query: query
    });

    console.log(`📝 Sample of found records:`, allRecords.slice(0, 3).map(r => ({
      keyword: r.keyword,
      domain: r.domain,
      rank: r.rank,
      month: r.month,
      year: r.year
    })));

    // Build comprehensive monthly data structure
    const monthlyData = {};
    const keywordHistoryMap = {}; // keyword -> { monthKey: { rank, checkedAt, weeklyChecks: [] } }
    const weeklyBreakdown = {}; // monthKey -> keyword -> [all checks with dates]
    
    // Initialize monthly data structure
    monthYearPairs.forEach(({ monthKey, month, year, monthName }) => {
      monthlyData[monthKey] = {
        month,
        year,
        monthName,
        keywords: {},
        weeklyData: {}, // NEW: keyword -> [weekly checks]
        stats: {
          totalKeywords: 0,
          averageRank: 0,
          top10Count: 0,
          top30Count: 0,
          top100Count: 0,
          notRankingCount: 0,
          totalChecks: 0 // NEW: Track total number of checks
        }
      };
      weeklyBreakdown[monthKey] = {};
    });

    // Process all records and group by keyword and month
    // IMPORTANT: Collect ALL checks, not just the latest
    allRecords.forEach(record => {
      const monthKey = `${record.year}-${String(record.month).padStart(2, '0')}`;
      const keyword = record.keyword;
      
      // Skip if this month is not in our selected range
      if (!monthlyData[monthKey]) return;
      
      // Initialize keyword history if not exists
      if (!keywordHistoryMap[keyword]) {
        keywordHistoryMap[keyword] = {};
      }
      
      // Initialize weekly breakdown for this month/keyword
      if (!weeklyBreakdown[monthKey][keyword]) {
        weeklyBreakdown[monthKey][keyword] = [];
      }
      
      // Add this check to weekly breakdown (ALL checks, not just latest)
      weeklyBreakdown[monthKey][keyword].push({
        rank: record.rank,
        inTop100: record.inTop100,
        checkedAt: record.checkedAt,
        checkedDate: new Date(record.checkedAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        }),
        checkedDateFull: new Date(record.checkedAt).toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      });
      
      // Store the most recent check for this keyword in this month (for summary)
      if (!monthlyData[monthKey].keywords[keyword] || 
          new Date(record.checkedAt) > new Date(monthlyData[monthKey].keywords[keyword].checkedAt)) {
        monthlyData[monthKey].keywords[keyword] = {
          keyword: record.keyword,
          rank: record.rank,
          inTop100: record.inTop100,
          difficulty: record.difficulty,
          checkedAt: record.checkedAt,
          checkedDate: new Date(record.checkedAt).toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
          location: record.location,
          totalChecks: weeklyBreakdown[monthKey][keyword].length // Track number of checks
        };
        
        keywordHistoryMap[keyword][monthKey] = {
          rank: record.rank,
          checkedAt: record.checkedAt,
          weeklyChecks: weeklyBreakdown[monthKey][keyword] // Include all weekly checks
        };
      }
    });

    // Sort weekly checks by date for each keyword in each month
    Object.keys(weeklyBreakdown).forEach(monthKey => {
      Object.keys(weeklyBreakdown[monthKey]).forEach(keyword => {
        weeklyBreakdown[monthKey][keyword].sort((a, b) => 
          new Date(a.checkedAt) - new Date(b.checkedAt)
        );
        // Update the keyword data with weekly breakdown
        if (monthlyData[monthKey].keywords[keyword]) {
          monthlyData[monthKey].keywords[keyword].weeklyChecks = weeklyBreakdown[monthKey][keyword];
        }
      });
    });

    // Calculate stats for each month
    Object.keys(monthlyData).forEach(monthKey => {
      const keywords = Object.values(monthlyData[monthKey].keywords);
      const rankedKeywords = keywords.filter(k => k.rank);
      
      // Calculate total checks across all keywords in this month
      const totalChecks = Object.values(weeklyBreakdown[monthKey]).reduce(
        (sum, checks) => sum + checks.length, 0
      );
      
      monthlyData[monthKey].stats.totalKeywords = keywords.length;
      monthlyData[monthKey].stats.totalChecks = totalChecks;
      monthlyData[monthKey].stats.averageRank = rankedKeywords.length > 0
        ? (rankedKeywords.reduce((sum, k) => sum + k.rank, 0) / rankedKeywords.length).toFixed(1)
        : null;
      monthlyData[monthKey].stats.top10Count = keywords.filter(k => k.rank && k.rank <= 10).length;
      monthlyData[monthKey].stats.top30Count = keywords.filter(k => k.rank && k.rank <= 30).length;
      monthlyData[monthKey].stats.top100Count = keywords.filter(k => k.rank && k.rank <= 100).length;
      monthlyData[monthKey].stats.notRankingCount = keywords.filter(k => !k.rank).length;
      
      // Store weekly breakdown in monthly data for easy access
      monthlyData[monthKey].weeklyBreakdown = weeklyBreakdown[monthKey];
    });

    // Build comprehensive keyword timeline data
    const keywordTimeline = [];
    Object.keys(keywordHistoryMap).forEach(keyword => {
      const timeline = {
        keyword,
        history: [],
        currentRank: null,
        bestRank: null,
        worstRank: null,
        averageRank: null,
        trend: 'stable', // improved, declined, stable, new
        totalChange: null
      };

      // Build history array in chronological order
      const sortedMonths = monthYearPairs.map(m => m.monthKey).reverse();
      sortedMonths.forEach(monthKey => {
        const monthHistory = keywordHistoryMap[keyword][monthKey];
        const rank = monthHistory?.rank || null;
        const checkedAt = monthHistory?.checkedAt || null;
        const weeklyChecks = monthHistory?.weeklyChecks || [];
        const monthData = monthYearPairs.find(m => m.monthKey === monthKey);
        
        timeline.history.push({
          monthKey,
          monthName: monthData.monthName,
          rank,
          checkedAt,
          checkedDate: checkedAt 
            ? new Date(checkedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })
            : null,
          weeklyChecks: weeklyChecks, // Include all weekly checks for this month
          totalChecks: weeklyChecks.length,
          rankRange: weeklyChecks.length > 0 ? {
            min: Math.min(...weeklyChecks.filter(c => c.rank).map(c => c.rank)),
            max: Math.max(...weeklyChecks.filter(c => c.rank).map(c => c.rank)),
            average: (weeklyChecks.filter(c => c.rank).reduce((sum, c) => sum + c.rank, 0) / 
                     weeklyChecks.filter(c => c.rank).length).toFixed(1)
          } : null
        });
      });

      // Calculate statistics
      const ranks = timeline.history.filter(h => h.rank).map(h => h.rank);
      if (ranks.length > 0) {
        timeline.currentRank = timeline.history[timeline.history.length - 1].rank;
        timeline.bestRank = Math.min(...ranks);
        timeline.worstRank = Math.max(...ranks);
        timeline.averageRank = (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1);
        
        // Calculate trend
        if (ranks.length >= 2) {
          const firstRank = timeline.history.find(h => h.rank)?.rank;
          const lastRank = timeline.currentRank;
          if (firstRank && lastRank) {
            timeline.totalChange = firstRank - lastRank; // Positive = improved
            if (timeline.totalChange > 5) timeline.trend = 'improved';
            else if (timeline.totalChange < -5) timeline.trend = 'declined';
            else timeline.trend = 'stable';
          }
        } else {
          timeline.trend = 'new';
        }
      }

      keywordTimeline.push(timeline);
    });

    // Calculate overall comparisons (current vs previous month)
    const comparisons = [];
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    
    if (sortedMonths.length >= 2) {
      const currentMonthKey = sortedMonths[0];
      const previousMonthKey = sortedMonths[1];
      
      const currentKeywords = monthlyData[currentMonthKey].keywords;
      const previousKeywords = monthlyData[previousMonthKey].keywords;
      
      // Get all unique keywords
      const allKeywords = new Set([
        ...Object.keys(currentKeywords),
        ...Object.keys(previousKeywords)
      ]);

      allKeywords.forEach(keyword => {
        const current = currentKeywords[keyword];
        const previous = previousKeywords[keyword];
        
        const comparison = {
          keyword,
          currentRank: current?.rank || null,
          currentDate: current?.checkedDate || null,
          previousRank: previous?.rank || null,
          previousDate: previous?.checkedDate || null,
          change: null,
          percentChange: null,
          status: 'new',
          difficulty: current?.difficulty || previous?.difficulty || null
        };

        if (previous?.rank && current?.rank) {
          comparison.change = previous.rank - current.rank; // Positive = improved
          comparison.percentChange = ((previous.rank - current.rank) / previous.rank * 100).toFixed(1);
          
          if (comparison.change > 0) comparison.status = 'improved';
          else if (comparison.change < 0) comparison.status = 'declined';
          else comparison.status = 'unchanged';
        } else if (previous && !previous.rank && current?.rank) {
          comparison.status = 'now_ranking';
        } else if (previous?.rank && (!current || !current.rank)) {
          comparison.status = 'lost_ranking';
        } else if (!previous && current) {
          comparison.status = 'new';
        } else if (previous && !current) {
          comparison.status = 'not_checked';
        }

        comparisons.push(comparison);
      });
    }

    // Performance categories
    const performanceCategories = {
      topPerformers: keywordTimeline.filter(k => k.trend === 'improved' && k.currentRank && k.currentRank <= 30),
      needAttention: keywordTimeline.filter(k => k.trend === 'declined' || (k.currentRank && k.currentRank > 50)),
      lostVisibility: keywordTimeline.filter(k => !k.currentRank && k.history.some(h => h.rank)),
      stable: keywordTimeline.filter(k => k.trend === 'stable' && k.currentRank),
      new: keywordTimeline.filter(k => k.trend === 'new')
    };

    // Calculate month-over-month stats comparison
    const monthlyStats = sortedMonths.map(monthKey => ({
      monthKey,
      monthName: monthlyData[monthKey].monthName,
      ...monthlyData[monthKey].stats
    }));

    console.log(`📈 Monthly Stats Generated:`, monthlyStats.map(m => ({
      month: m.monthName,
      total: m.totalKeywords,
      avg: m.averageRank,
      top10: m.top10Count
    })));

    console.log(`📊 Summary Stats:`, {
      improved: comparisons.filter(c => c.status === 'improved').length,
      declined: comparisons.filter(c => c.status === 'declined').length,
      unchanged: comparisons.filter(c => c.status === 'unchanged').length,
      new: comparisons.filter(c => c.status === 'new' || c.status === 'now_ranking').length,
      lost: comparisons.filter(c => c.status === 'lost_ranking').length,
      totalKeywords: comparisons.length,
      totalComparisons: comparisons.length
    });

    res.json({
      status: 'success',
      data: {
        monthlyData,
        keywordTimeline,
        comparisons,
        weeklyBreakdown, // NEW: All weekly checks organized by month and keyword
        performanceCategories: {
          topPerformers: performanceCategories.topPerformers.length,
          needAttention: performanceCategories.needAttention.length,
          lostVisibility: performanceCategories.lostVisibility.length,
          stable: performanceCategories.stable.length,
          new: performanceCategories.new.length,
          details: performanceCategories
        },
        monthlyStats,
        summary: {
          improved: comparisons.filter(c => c.status === 'improved').length,
          declined: comparisons.filter(c => c.status === 'declined').length,
          unchanged: comparisons.filter(c => c.status === 'unchanged').length,
          new: comparisons.filter(c => c.status === 'new' || c.status === 'now_ranking').length,
          lost: comparisons.filter(c => c.status === 'lost_ranking').length,
          totalKeywords: Object.keys(keywordHistoryMap).length,
          totalChecks: Object.values(weeklyBreakdown).reduce((sum, monthData) => 
            sum + Object.values(monthData).reduce((s, checks) => s + checks.length, 0), 0
          ) // NEW: Total checks across all months
        },
        metadata: {
          domain: domain || 'N/A',
          monthsAnalyzed: monthYearPairs.length,
          dateRange: `${monthYearPairs[monthYearPairs.length - 1].monthName} - ${monthYearPairs[0].monthName}`,
          generatedAt: new Date().toISOString(),
          weeklyTrackingEnabled: true, // NEW: Indicate weekly data is available
          description: 'Monthly comparison with weekly rank check breakdowns'
        }
      }
    });

  } catch (error) {
    console.error('❌ Monthly comparison error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch monthly comparison'
    });
  }
});

// Get weekly view with dates for monthly comparison
router.get('/weekly-comparison', protect, async (req, res) => {
  try {
    const { domain, clientId, weeks = 4 } = req.query;
    
    if (!domain && !clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Either domain or clientId is required'
      });
    }

    const query = {};
    if (domain) query.domain = { $regex: domain, $options: 'i' };
    if (clientId) query.client = clientId;

    // Calculate week ranges
    const now = new Date();
    const weeksToFetch = parseInt(weeks) || 4;
    const weekRanges = [];
    
    for (let i = 0; i < weeksToFetch; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      weekRanges.push({
        weekNumber: weeksToFetch - i,
        weekLabel: `Week ${weeksToFetch - i}`,
        startDate: weekStart,
        endDate: weekEnd,
        weekKey: `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`,
        dateRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      });
    }

    weekRanges.reverse(); // Oldest to newest

    // Fetch all records for the time period
    const oldestWeek = weekRanges[0];
    const newestWeek = weekRanges[weekRanges.length - 1];
    
    const allRecords = await RankHistory.find({
      ...query,
      checkedAt: {
        $gte: oldestWeek.startDate,
        $lte: newestWeek.endDate
      }
    }).sort({ keyword: 1, checkedAt: -1 });

    console.log(`📅 Weekly Comparison Query:`, {
      domain,
      clientId,
      weeksRequested: weeksToFetch,
      dateRange: `${oldestWeek.startDate.toISOString()} - ${newestWeek.endDate.toISOString()}`,
      recordsFound: allRecords.length
    });

    // Build weekly data structure
    const weeklyData = {};
    const keywordWeeklyMap = {}; // keyword -> { weekKey: { rank, checkedAt } }
    
    // Initialize weekly data
    weekRanges.forEach(week => {
      weeklyData[week.weekKey] = {
        weekNumber: week.weekNumber,
        weekLabel: week.weekLabel,
        dateRange: week.dateRange,
        startDate: week.startDate.toISOString(),
        endDate: week.endDate.toISOString(),
        keywords: {},
        stats: {
          totalKeywords: 0,
          averageRank: 0,
          top10Count: 0,
          top30Count: 0,
          top100Count: 0,
          notRankingCount: 0
        }
      };
    });

    // Process records - group by keyword and week, keep latest check per week
    allRecords.forEach(record => {
      const checkedDate = new Date(record.checkedAt);
      const keyword = record.keyword;
      
      // Find which week this record belongs to
      const week = weekRanges.find(w => 
        checkedDate >= w.startDate && checkedDate <= w.endDate
      );
      
      if (week) {
        const weekKey = week.weekKey;
        
        // Initialize keyword weekly map
        if (!keywordWeeklyMap[keyword]) {
          keywordWeeklyMap[keyword] = {};
        }
        
        // Keep the most recent check for this keyword in this week
        if (!weeklyData[weekKey].keywords[keyword] || 
            checkedDate > new Date(weeklyData[weekKey].keywords[keyword].checkedAt)) {
          weeklyData[weekKey].keywords[keyword] = {
            keyword: record.keyword,
            rank: record.rank,
            inTop100: record.inTop100,
            difficulty: record.difficulty,
            checkedAt: record.checkedAt,
            checkedDate: checkedDate.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            location: record.location
          };
          
          keywordWeeklyMap[keyword][weekKey] = {
            rank: record.rank,
            checkedAt: record.checkedAt
          };
        }
      }
    });

    // Calculate stats for each week
    Object.keys(weeklyData).forEach(weekKey => {
      const keywords = Object.values(weeklyData[weekKey].keywords);
      const rankedKeywords = keywords.filter(k => k.rank);
      
      weeklyData[weekKey].stats.totalKeywords = keywords.length;
      weeklyData[weekKey].stats.averageRank = rankedKeywords.length > 0
        ? (rankedKeywords.reduce((sum, k) => sum + k.rank, 0) / rankedKeywords.length).toFixed(1)
        : null;
      weeklyData[weekKey].stats.top10Count = keywords.filter(k => k.rank && k.rank <= 10).length;
      weeklyData[weekKey].stats.top30Count = keywords.filter(k => k.rank && k.rank <= 30).length;
      weeklyData[weekKey].stats.top100Count = keywords.filter(k => k.rank && k.rank <= 100).length;
      weeklyData[weekKey].stats.notRankingCount = keywords.filter(k => !k.rank).length;
    });

    // Build keyword timeline with weekly granularity
    const keywordTimeline = [];
    Object.keys(keywordWeeklyMap).forEach(keyword => {
      const timeline = {
        keyword,
        weeklyHistory: [],
        currentRank: null,
        currentDate: null,
        bestRank: null,
        worstRank: null,
        averageRank: null,
        weeklyTrend: 'stable'
      };

      // Build weekly history
      weekRanges.forEach(week => {
        const weekData = keywordWeeklyMap[keyword][week.weekKey];
        timeline.weeklyHistory.push({
          weekKey: week.weekKey,
          weekLabel: week.weekLabel,
          dateRange: week.dateRange,
          rank: weekData?.rank || null,
          checkedAt: weekData?.checkedAt || null,
          checkedDate: weekData?.checkedAt 
            ? new Date(weekData.checkedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })
            : null
        });
      });

      // Calculate statistics
      const ranks = timeline.weeklyHistory.filter(h => h.rank).map(h => h.rank);
      if (ranks.length > 0) {
        const latestWeek = timeline.weeklyHistory[timeline.weeklyHistory.length - 1];
        timeline.currentRank = latestWeek.rank;
        timeline.currentDate = latestWeek.checkedDate;
        timeline.bestRank = Math.min(...ranks);
        timeline.worstRank = Math.max(...ranks);
        timeline.averageRank = (ranks.reduce((a, b) => a + b, 0) / ranks.length).toFixed(1);
        
        // Calculate weekly trend (comparing last 2 weeks)
        if (ranks.length >= 2) {
          const recentWeeks = timeline.weeklyHistory.filter(h => h.rank).slice(-2);
          if (recentWeeks.length === 2) {
            const change = recentWeeks[0].rank - recentWeeks[1].rank;
            if (change > 3) timeline.weeklyTrend = 'improving';
            else if (change < -3) timeline.weeklyTrend = 'declining';
            else timeline.weeklyTrend = 'stable';
          }
        }
      }

      keywordTimeline.push(timeline);
    });

    // Week-over-week comparisons
    const weeklyComparisons = [];
    const sortedWeeks = Object.keys(weeklyData).sort();
    
    if (sortedWeeks.length >= 2) {
      const currentWeekKey = sortedWeeks[sortedWeeks.length - 1];
      const previousWeekKey = sortedWeeks[sortedWeeks.length - 2];
      
      const currentKeywords = weeklyData[currentWeekKey].keywords;
      const previousKeywords = weeklyData[previousWeekKey].keywords;
      
      const allKeywords = new Set([
        ...Object.keys(currentKeywords),
        ...Object.keys(previousKeywords)
      ]);

      allKeywords.forEach(keyword => {
        const current = currentKeywords[keyword];
        const previous = previousKeywords[keyword];
        
        const comparison = {
          keyword,
          currentRank: current?.rank || null,
          currentDate: current?.checkedDate || null,
          previousRank: previous?.rank || null,
          previousDate: previous?.checkedDate || null,
          change: null,
          status: 'new'
        };

        if (previous?.rank && current?.rank) {
          comparison.change = previous.rank - current.rank;
          if (comparison.change > 0) comparison.status = 'improved';
          else if (comparison.change < 0) comparison.status = 'declined';
          else comparison.status = 'unchanged';
        } else if (!previous && current) {
          comparison.status = 'new';
        } else if (previous && !current) {
          comparison.status = 'not_checked_this_week';
        }

        weeklyComparisons.push(comparison);
      });
    }

    // Weekly stats summary
    const weeklyStats = sortedWeeks.map(weekKey => ({
      weekKey,
      ...weeklyData[weekKey]
    }));

    res.json({
      status: 'success',
      data: {
        weeklyData,
        keywordTimeline,
        weeklyComparisons,
        weeklyStats,
        summary: {
          improved: weeklyComparisons.filter(c => c.status === 'improved').length,
          declined: weeklyComparisons.filter(c => c.status === 'declined').length,
          unchanged: weeklyComparisons.filter(c => c.status === 'unchanged').length,
          new: weeklyComparisons.filter(c => c.status === 'new').length,
          totalKeywords: Object.keys(keywordWeeklyMap).length
        },
        metadata: {
          domain: domain || 'N/A',
          weeksAnalyzed: weeksToFetch,
          dateRange: `${weekRanges[0].dateRange} to ${weekRanges[weekRanges.length - 1].dateRange}`,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Weekly comparison error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch weekly comparison'
    });
  }
});

// Debug endpoint to check environment configuration
router.get('/debug-config', (req, res) => {
  const locationCode = getLocationCode(req.query.location || 'United States');
  const providerInfo = rankService.getProviderInfo();
  
  res.json({
    environment: process.env.NODE_ENV || 'development',
    rankApiProvider: providerInfo.provider.toUpperCase(),
    dataForSeoUser: process.env.DATAFORSEO_USER ? '***configured***' : '❌ missing',
    dataForSeoPass: process.env.DATAFORSEO_PASS ? '***configured***' : '❌ missing',
    oxylabsUser: process.env.OXYLABS_USER ? '***configured***' : '❌ missing',
    oxylabsPass: process.env.OXYLABS_PASS ? '***configured***' : '❌ missing',
    activeProvider: providerInfo,
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
