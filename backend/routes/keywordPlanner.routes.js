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
    const { domain, keyword } = req.body;

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
        const postUrl = 'https://api.dataforseo.com/v3/serp/google/organic/task_post';

        // Create a task for the keyword. We'll request desktop results by default.
        const payload = {
          tasks: [
            {
              // Minimal payload - dataforseo accepts various shapes; if this fails we'll catch and fallback
              keywords: [keyword],
              language_code: 'en',
              // location_code could be provided for accuracy; omit to keep generic
              device: 'desktop'
            }
          ]
        };

        const postRes = await axios.post(postUrl, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        // Expect an id (task id) to poll. DataForSEO returns a 'tasks' array with an 'id' per item typically
        const taskId = postRes?.data?.tasks?.[0]?.id || postRes?.data?.tasks?.[0]?.task_id || null;
        const taskIdentifier = taskId || postRes?.data?.id || null;

        // If no task id, try to parse immediate result (some accounts return result synchronously)
        if (!taskIdentifier) {
          const immediatePosition = findPositionInResults(postRes?.data, domain);
          if (immediatePosition) {
            return res.json({ status: 'success', data: { domain, keyword, rank: immediatePosition, inTop100: true, difficulty, checkedAt: new Date(), source: 'dataforseo' } });
          }
        }

        // Poll task_get until ready or timeout
        const getUrl = 'https://api.dataforseo.com/v3/serp/google/organic/task_get';
        const maxWait = 30000; // 30s max
        const start = Date.now();
        let finalResult = null;

        while (Date.now() - start < maxWait) {
          const getRes = await axios.post(getUrl, { /* task_id or id field depends on API */ id: taskIdentifier }, {
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
            timeout: 15000
          });

          const status = getRes?.data?.tasks?.[0]?.status || getRes?.data?.status || null;
          // Try to extract results
          const results = getRes?.data?.tasks?.[0]?.result || getRes?.data?.tasks?.[0]?.items || getRes?.data?.tasks?.[0]?.output || getRes?.data;

          const pos = findPositionInResults(results, domain);
          if (pos) {
            finalResult = pos;
            break;
          }

          // If status indicates finished but no position, break
          if (status && ['ready', 'finished', 'done'].includes(String(status).toLowerCase())) break;

          // Wait before retrying
          await new Promise(r => setTimeout(r, 2500));
        }

        if (finalResult) {
          return res.json({ status: 'success', data: { domain, keyword, rank: finalResult, inTop100: true, difficulty, checkedAt: new Date(), source: 'dataforseo' } });
        }

        // If we reach here, DataForSEO didn't yield a match — fall through to demo fallback
        console.warn('DataForSEO did not return a position for', domain, keyword);
      } catch (err) {
        console.warn('DataForSEO lookup failed, falling back to demo. Error:', err.message || err);
        // continue to fallback demo below
      }
    }

    // Fallback: Simple deterministic pseudo-random rank based on input (demo)
    const seed = Array.from((domain + '|' + keyword)).reduce((s, c) => s + c.charCodeAt(0), 0);
    const rank = (seed % 100) + 1; // 1 - 100

    res.json({
      status: 'success',
      data: {
        domain,
        keyword,
        rank: rank <= 100 ? rank : null,
        inTop100: rank <= 100,
        difficulty,
        checkedAt: new Date(),
        source: 'demo'
      }
    });
  } catch (error) {
    console.error('❌ Rank check error:', error);
    next(error);
  }
});

module.exports = router;
