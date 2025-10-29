const OpenAI = require('openai');
const { logger } = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * AI Service for SEO-related analysis and suggestions
 */
class AIService {
  /**
   * Analyze audit issues and provide recommendations
   * @param {Object} auditResults - Audit results object
   * @param {string} clientDomain - Client's domain
   * @returns {Promise<Object>} AI analysis
   */
  async analyzeAuditResults(auditResults, clientDomain) {
    try {
      const prompt = `You are an expert SEO consultant. Analyze the following website audit results for ${clientDomain} and provide:

1. Executive Summary (2-3 sentences)
2. Top 3 Priority Issues (most critical to fix first)
3. Quick Wins (easy fixes with high impact)
4. Long-term Actions (strategic improvements)
5. Estimated Overall Impact

Audit Results:
- Critical Issues: ${auditResults.criticalCount || 0}
- High Issues: ${auditResults.highCount || 0}
- Medium Issues: ${auditResults.mediumCount || 0}
- Low Issues: ${auditResults.lowCount || 0}

Issue Details:
${JSON.stringify(auditResults, null, 2)}

Provide actionable, specific recommendations.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO consultant specializing in technical SEO, on-page optimization, and content strategy.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const analysis = completion.choices[0].message.content;

      return {
        executiveSummary: this.extractSection(analysis, 'Executive Summary'),
        topPriorities: this.extractList(analysis, 'Top 3 Priority Issues'),
        quickWins: this.extractList(analysis, 'Quick Wins'),
        longTermActions: this.extractList(analysis, 'Long-term Actions'),
        estimatedImpact: this.extractSection(analysis, 'Estimated Overall Impact'),
        analyzedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Audit Analysis Error:', error);
      throw new Error('Failed to analyze audit results');
    }
  }

  /**
   * Generate fix suggestions for a specific issue
   * @param {string} issueType - Type of issue
   * @param {Object} issueDetails - Details of the issue
   * @returns {Promise<Object>} Fix suggestion
   */
  async generateFixSuggestion(issueType, issueDetails) {
    try {
      const prompt = `As an SEO expert, provide a detailed fix for this issue:

Issue Type: ${issueType}
Details: ${JSON.stringify(issueDetails, null, 2)}

Provide:
1. What's wrong and why it matters
2. Step-by-step fix instructions
3. Expected impact (High/Medium/Low)
4. Estimated time to fix`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO technical expert. Provide clear, actionable fix instructions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
      });

      const suggestion = completion.choices[0].message.content;

      return {
        recommendation: suggestion,
        reasoning: this.extractSection(suggestion, "what's wrong"),
        estimatedImpact: this.extractImpact(suggestion),
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Fix Suggestion Error:', error);
      throw new Error('Failed to generate fix suggestion');
    }
  }

  /**
   * Analyze keyword difficulty and provide strategy
   * @param {string} keyword - Keyword to analyze
   * @param {Array} serpData - SERP results data
   * @returns {Promise<Object>} Keyword analysis
   */
  async analyzeKeywordDifficulty(keyword, serpData = []) {
    try {
      const prompt = `Analyze the SEO difficulty for the keyword: "${keyword}"

${serpData.length > 0 ? `Current SERP Results:\n${JSON.stringify(serpData.slice(0, 10), null, 2)}` : ''}

Provide:
1. Difficulty Score (0-100)
2. Search Intent Analysis
3. Content Strategy Recommendations
4. Ranking Opportunity Assessment`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a keyword research expert. Analyze keyword difficulty and competition.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const analysis = completion.choices[0].message.content;

      return {
        difficulty: this.extractDifficultyScore(analysis),
        suggestions: analysis,
        lastAnalyzed: new Date(),
      };
    } catch (error) {
      logger.error('AI Keyword Analysis Error:', error);
      return {
        difficulty: 50,
        suggestions: 'Analysis unavailable. Manual review recommended.',
        lastAnalyzed: new Date(),
      };
    }
  }

  /**
   * Get keyword statistics (volume, competition, intent)
   * Uses AI to estimate realistic keyword metrics
   * @param {string} keyword - The keyword to analyze
   * @returns {Promise<Object>} Keyword stats
   */
  async getKeywordStats(keyword) {
    try {
      const prompt = `Analyze this keyword and provide realistic SEO metrics: "${keyword}"

Based on industry standards and keyword patterns, provide:
1. Estimated Monthly Search Volume (be realistic based on keyword type and length)
2. Competition Level (Low/Medium/High) - consider commercial intent and industry
3. Search Intent (Informational/Navigational/Transactional/Commercial)
4. Keyword Difficulty Score (0-100)
5. Brief explanation of the metrics

Respond in this exact JSON format:
{
  "volume": <number>,
  "competition": "Low|Medium|High",
  "intent": "Informational|Navigational|Transactional|Commercial",
  "difficulty": <number 0-100>,
  "explanation": "<brief 1-2 sentence explanation>"
}

Guidelines:
- Long-tail keywords (4+ words): Lower volume (10-500), lower competition
- Short keywords (1-2 words): Higher volume (1000-100000+), higher competition
- Branded keywords: Medium volume, low competition
- Commercial keywords (buy, best, review): Higher competition
- Question keywords (how, what, why): Informational intent, medium volume
- Location-based keywords: Medium volume, medium competition

Return ONLY valid JSON, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO keyword researcher with deep knowledge of search volumes, competition levels, and search intent patterns. Provide realistic, data-driven keyword metrics based on industry standards and keyword characteristics.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent data
        max_tokens: 300,
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Extract JSON from response
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || responseText;
      } else if (responseText.includes('```')) {
        jsonText = responseText.match(/```\s*([\s\S]*?)\s*```/)?.[1] || responseText;
      }

      const stats = JSON.parse(jsonText);
      
      logger.info(`Keyword stats generated for "${keyword}":`, stats);
      
      return {
        volume: stats.volume || 0,
        competition: stats.competition || 'Medium',
        intent: stats.intent || 'Informational',
        difficulty: stats.difficulty || 50,
        explanation: stats.explanation || 'AI-generated keyword metrics',
      };
    } catch (error) {
      logger.error('AI Keyword Stats Error:', error);
      // Return default values if AI fails
      return {
        volume: 0,
        competition: 'Medium',
        intent: 'Informational',
        difficulty: 50,
        explanation: 'Unable to fetch keyword stats. Please update manually.',
      };
    }
  }

  /**
   * Keyword Planner - Get comprehensive keyword data with location-based insights
   * @param {Array<string>} keywords - Array of keywords to analyze
   * @param {string} location - Target location (e.g., "Kochi, Kerala" or "United States")
   * @returns {Promise<Object>} Keyword planner data with results and ideas
   */
  async getKeywordPlannerData(keywords, location) {
    try {
      logger.info(`Generating keyword planner data for ${keywords.length} keywords in ${location}`);

      const prompt = `You are an expert SEO keyword researcher. Analyze these keywords for the location "${location}":

Keywords: ${keywords.join(', ')}

For EACH keyword, provide:
1. **searchVolume**: Estimated average monthly search volume (number)
2. **competition**: Competition level (Low/Medium/High)
3. **cpc**: Estimated cost-per-click in USD (e.g., "1.50")
4. **intent**: Search intent (Informational/Navigational/Transactional/Commercial)
5. **difficulty**: SEO difficulty score (0-100)

Also generate 10 RELATED keyword ideas that:
- Are relevant to the original keywords
- Target the same location
- Include long-tail variations
- Mix different search intents
- Have good potential for the business

**Location Context Guidelines:**
- For US/International: Higher search volumes, higher CPC
- For India/Kerala/Kochi: Lower search volumes (10-30% of US), lower CPC (₹50-200 = $0.60-2.40)
- For local keywords: Add location modifiers where appropriate
- Consider local language variations if applicable

**Volume Guidelines by Location:**
- US National keyword (1-2 words): 10,000-500,000
- US Local keyword (city name): 500-50,000
- India National: 1,000-100,000
- Kerala/Kochi Local: 100-10,000
- Long-tail (4+ words): Divide by 5-10

**CPC Guidelines:**
- US Competitive (legal, insurance): $5-50
- US Commercial: $1-5
- US Informational: $0.10-1
- India Competitive: $0.80-3
- India Commercial: $0.30-1.50
- India Informational: $0.05-0.40

Respond in this EXACT JSON format:
{
  "results": [
    {
      "keyword": "exact keyword from input",
      "searchVolume": <number>,
      "competition": "Low|Medium|High",
      "cpc": "X.XX",
      "intent": "Informational|Navigational|Transactional|Commercial",
      "difficulty": <0-100>
    }
  ],
  "ideas": [
    {
      "keyword": "related keyword suggestion",
      "volume": <number>,
      "competition": "Low|Medium|High",
      "cpc": "X.XX",
      "intent": "Informational|Navigational|Transactional|Commercial"
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO keyword researcher with deep knowledge of search volumes, competition levels, and CPC data across different geographic markets. You provide realistic, location-specific keyword data based on actual market conditions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent data
      });

      const content = completion.choices[0].message.content.trim();
      
      // Extract JSON from markdown code blocks if present
      let jsonText = content;
      if (content.includes('```json')) {
        jsonText = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonText = content.split('```')[1].split('```')[0].trim();
      }

      const data = JSON.parse(jsonText);
      
      logger.info(`Keyword planner data generated: ${data.results?.length || 0} results, ${data.ideas?.length || 0} ideas`);

      return {
        results: data.results || [],
        ideas: data.ideas || [],
        location,
        analyzedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Keyword Planner Error:', error);
      throw new Error('Failed to generate keyword planner data');
    }
  }

  /**
   * Cluster keywords into topical groups
   * @param {Array} keywords - Array of keyword objects
   * @returns {Promise<Object>} Clustered keywords
   */
  async clusterKeywords(keywords) {
    try {
      const keywordList = keywords.map(k => k.keyword).join('\n');
      
      const prompt = `Group these keywords into topical clusters. Identify 3-5 main topic clusters:

Keywords:
${keywordList}

Return clusters in this format:
Cluster 1: [Name]
- keyword1
- keyword2

Cluster 2: [Name]
- keyword3
- keyword4`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO keyword strategist. Group keywords by semantic similarity and search intent.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      return {
        clusters: completion.choices[0].message.content,
        analyzedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Keyword Clustering Error:', error);
      throw new Error('Failed to cluster keywords');
    }
  }

  /**
   * Optimize content for target keyword
   * @param {string} content - Page content
   * @param {string} keyword - Target keyword
   * @param {string} currentTitle - Current page title
   * @param {string} currentMeta - Current meta description
   * @returns {Promise<Object>} Optimization suggestions
   */
  async optimizeContent(content, keyword, currentTitle = '', currentMeta = '') {
    try {
      const prompt = `Optimize this page content for the keyword: "${keyword}"

Current Title: ${currentTitle || 'Not set'}
Current Meta Description: ${currentMeta || 'Not set'}

Content Preview:
${content.substring(0, 2000)}...

Provide:
1. Optimized Title Tag (60 chars max)
2. Optimized Meta Description (155 chars max)
3. Recommended H1
4. H2-H3 Structure suggestions
5. Internal linking opportunities
6. Schema markup recommendations
7. Content improvement tips`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an on-page SEO expert. Provide specific, actionable optimization recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const suggestions = completion.choices[0].message.content;

      return {
        title: this.extractSection(suggestions, 'Title Tag'),
        metaDescription: this.extractSection(suggestions, 'Meta Description'),
        headingStructure: this.extractSection(suggestions, 'Structure'),
        internalLinks: this.extractSection(suggestions, 'Internal linking'),
        schema: this.extractSection(suggestions, 'Schema'),
        contentTips: this.extractSection(suggestions, 'Content improvement'),
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Content Optimization Error:', error);
      throw new Error('Failed to optimize content');
    }
  }

  /**
   * Generate backlink outreach template
   * @param {string} targetDomain - Domain to get backlink from
   * @param {string} clientDomain - Client's domain
   * @param {string} contentContext - Context for outreach
   * @returns {Promise<string>} Outreach email template
   */
  async generateOutreachTemplate(targetDomain, clientDomain, contentContext) {
    try {
      const prompt = `Create a personalized backlink outreach email template:

Target Website: ${targetDomain}
Our Website: ${clientDomain}
Context: ${contentContext}

Create a professional, concise, and effective outreach email that:
1. Personalizes to the target site
2. Provides value proposition
3. Suggests specific content for linking
4. Maintains professional tone
5. Includes clear call-to-action`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a digital PR and link building expert. Create effective outreach templates.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('AI Outreach Template Error:', error);
      throw new Error('Failed to generate outreach template');
    }
  }

  /**
   * Generate initial site structure for new client
   * @param {string} industry - Client's industry
   * @param {string} domain - Client's domain
   * @returns {Promise<Object>} Suggested site structure
   */
  async generateSiteStructure(industry, domain) {
    try {
      const prompt = `Create an SEO-optimized site structure for a ${industry} business (${domain}):

Provide:
1. Recommended main pages (with slugs)
2. Content hierarchy
3. Initial keyword mapping per page
4. Sample meta titles
5. Content brief for each main page

Format as a structured JSON response.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an SEO strategist specializing in site architecture and information hierarchy.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return {
        structure: completion.choices[0].message.content,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Site Structure Error:', error);
      throw new Error('Failed to generate site structure');
    }
  }

  /**
   * Generate executive summary for boss dashboard
   * @param {Object} data - Aggregated data from all clients
   * @returns {Promise<Object>} Executive summary
   */
  async generateExecutiveSummary(data) {
    try {
      const prompt = `Create an executive summary for the SEO agency boss based on this data:

${JSON.stringify(data, null, 2)}

Provide:
1. Top Wins (3 biggest achievements)
2. Top Issues (3 most critical problems)
3. Next Steps (3 recommended actions)
4. Overall Performance Assessment

Keep it concise and actionable.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a senior SEO strategist providing executive-level insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const summary = completion.choices[0].message.content;

      return {
        topWins: this.extractList(summary, 'Top Wins'),
        topIssues: this.extractList(summary, 'Top Issues'),
        nextSteps: this.extractList(summary, 'Next Steps'),
        assessment: this.extractSection(summary, 'Overall Performance'),
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Executive Summary Error:', error);
      throw new Error('Failed to generate executive summary');
    }
  }

  /**
   * Analyze page SEO and provide recommendations
   * @param {Object} page - Page object
   * @returns {Promise<Object>} SEO analysis
   */
  async analyzePageSEO(page) {
    try {
      const prompt = `Analyze this webpage for SEO optimization:

Title: ${page.title}
Meta Description: ${page.metaDescription}
URL: ${page.url}
H1: ${page.h1}
Type: ${page.type}
Word Count: ${page.content?.wordCount || 'Unknown'}
Images: ${page.images.length} (${page.images.filter(i => !i.alt).length} missing alt tags)
Keywords: ${page.keywords.map(k => k.keyword).join(', ')}

Provide:
1. SEO Score (0-100)
2. Critical Issues (must fix)
3. Recommendations (actionable improvements)
4. Content Suggestions
5. Meta Tag Improvements

Be specific and actionable.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO analyst specializing in on-page optimization, content strategy, and technical SEO.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
      });

      const analysis = completion.choices[0].message.content;
      
      return {
        score: this.extractSEOScore(analysis),
        issues: this.extractIssuesFromAnalysis(analysis),
        recommendations: this.extractList(analysis, 'Recommendations'),
        contentSuggestions: this.extractList(analysis, 'Content Suggestions'),
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('AI Page SEO Analysis Error:', error);
      throw new Error('Failed to analyze page SEO');
    }
  }

  /**
   * Generate meta description from content
   * @param {string} title - Page title
   * @param {string} content - Page content
   * @returns {Promise<string>} Generated meta description
   */
  async generateMetaDescription(title, content) {
    try {
      const prompt = `Generate a compelling meta description (max 155 characters) for this page:

Title: ${title}
Content: ${content.substring(0, 500)}...

The meta description should:
- Be engaging and click-worthy
- Include relevant keywords naturally
- Stay under 155 characters
- Accurately describe the page content`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO copywriter specializing in meta descriptions that drive clicks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0].message.content.trim().replace(/['"]/g, '');
    } catch (error) {
      logger.error('AI Meta Description Generation Error:', error);
      throw new Error('Failed to generate meta description');
    }
  }

  /**
   * Suggest alt text for images
   * @param {string} imageUrl - Image URL
   * @param {string} context - Page context
   * @returns {Promise<string>} Suggested alt text
   */
  async suggestAltText(imageUrl, context) {
    try {
      const prompt = `Suggest descriptive alt text for an image on this page:

Image URL: ${imageUrl}
Page Context: ${context}

The alt text should:
- Be descriptive and specific
- Include relevant keywords naturally
- Be under 125 characters
- Help with accessibility`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in web accessibility and SEO image optimization.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 50,
      });

      return completion.choices[0].message.content.trim().replace(/['"]/g, '');
    } catch (error) {
      logger.error('AI Alt Text Suggestion Error:', error);
      throw new Error('Failed to suggest alt text');
    }
  }

  extractSEOScore(text) {
    const match = text.match(/SEO\s*Score[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) : 50;
  }

  extractIssuesFromAnalysis(text) {
    const issuesSection = this.extractSection(text, 'Critical Issues');
    const issuesList = this.extractList(text, 'Critical Issues');
    
    return issuesList.map(issue => ({
      type: 'error',
      category: 'seo',
      message: issue,
      severity: 'high',
    }));
  }

  // Helper methods
  extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\s]+(.*?)(?=\\n\\n|\\d+\\.|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  extractList(text, sectionName) {
    const section = this.extractSection(text, sectionName);
    const items = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./));
    return items.map(item => item.replace(/^[-\d.]\s*/, '').trim());
  }

  extractDifficultyScore(text) {
    const match = text.match(/difficulty\s*score[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) : 50;
  }

  extractImpact(text) {
    if (text.toLowerCase().includes('high impact')) return 'High';
    if (text.toLowerCase().includes('medium impact')) return 'Medium';
    if (text.toLowerCase().includes('low impact')) return 'Low';
    return 'Medium';
  }

  /**
   * Generate comprehensive SEO fix suggestions for a page
   * @param {Object} pageData - Current page data
   * @param {Object} seoReport - SEO analysis report
   * @returns {Promise<Array>} Array of fix suggestions
   */
  async generateSEOFixSuggestions(pageData, seoReport) {
    try {
      // Extract current SEO data
      // Detect if title/h1/meta look like URL slugs/paths and treat them as "Not set"
      // Pattern: contains " / " or looks like a path (e.g., "services / wordpress-development-kochi")
      const isSlugLike = (text) => {
        if (!text || text === 'Not set') return false;
        // Check if it contains " / " pattern (typical of converted URL paths)
        if (text.includes(' / ')) return true;
        // Check if it looks like a path (contains multiple hyphens and no spaces except " / ")
        if (text.match(/^[a-z0-9-]+(\s\/\s[a-z0-9-]+)+$/i)) return true;
        return false;
      };
      
      let currentTitle = pageData.title || 'Not set';
      let currentH1 = pageData.h1 || 'Not set';
      const currentMeta = pageData.metaDescription || 'Not set';
      
      // Clean up slug-like titles and h1s
      if (isSlugLike(currentTitle)) {
        console.log(`⚠️ Detected slug-like title: "${currentTitle}" - treating as "Not set"`);
        currentTitle = 'Not set';
      }
      if (isSlugLike(currentH1)) {
        console.log(`⚠️ Detected slug-like H1: "${currentH1}" - treating as "Not set"`);
        currentH1 = 'Not set';
      }
      
      const focusKeyword = pageData.seo?.focusKeyword || 'Not set';
      const wordCount = pageData.content?.wordCount || 0;
      const internalLinks = pageData.content?.links?.internal || 0;
      const externalLinks = pageData.content?.links?.external || 0;
      const totalImages = Array.isArray(pageData.images) ? pageData.images.length : 0;
      const imagesWithoutAlt = totalImages > 0 ? pageData.images?.filter(img => !img.alt || img.alt.trim() === '').length : 0;
      const canonical = pageData.seo?.canonical || 'Not set';
      const robots = pageData.seo?.robots || 'index,follow';
      const hasOG = pageData.openGraph?.title && pageData.openGraph?.description;
      const hasTwitterCard = pageData.twitter?.card && pageData.twitter?.title;
      const hasStructuredData = pageData.structuredData?.schema && Object.keys(pageData.structuredData.schema).length > 0;

      const prompt = `You are a world-class SEO specialist and technical SEO expert. Analyze this page and provide ACTUAL, READY-TO-USE content fixes - NOT instructions.

Page Information:
- Current Title (SEO <title> tag): "${currentTitle}" (Length: ${currentTitle.length} chars)
- URL Slug: ${pageData.slug || pageData.url || 'Not set'}
- Full URL: ${pageData.url || 'Not set'}
- Current Meta Description: "${currentMeta}" (Length: ${currentMeta.length} chars)
- Current H1 Heading: "${currentH1}"
- Focus Keyword: ${focusKeyword}
- Secondary Keywords: ${pageData.seo?.secondaryKeywords?.join(', ') || 'None'}
- Word Count: ${wordCount} words
- Internal Links: ${internalLinks}
- External Links: ${externalLinks}
- Images: ${totalImages} total, ${imagesWithoutAlt} without alt tags
- Canonical URL: ${canonical}
- Robots Meta: ${robots}
- Open Graph Tags: ${hasOG ? 'Present' : 'Missing'}
- Twitter Card: ${hasTwitterCard ? 'Present' : 'Missing'}
- Structured Data: ${hasStructuredData ? 'Present' : 'Missing'}
- Current SEO Score: ${seoReport.score}/100

IMPORTANT - When providing currentValue:
- For Title issues: Use the EXACT current title text from <title> tag: "${currentTitle}"
- For Meta issues: Use the EXACT current meta description: "${currentMeta}"
- For H1 issues: Use the EXACT current H1 text: "${currentH1}"
- DO NOT use the URL slug as currentValue
- DO NOT confuse URL path with page title or H1

Content Sample:
${pageData.content?.sample ? pageData.content.sample.substring(0, 500) + '...' : 'Not available'}

SEO Analysis Results:
Issues Found: ${JSON.stringify(seoReport.issues, null, 2)}
Passed Checks: ${JSON.stringify(seoReport.checks, null, 2)}
Recommendations: ${JSON.stringify(seoReport.recommendations, null, 2)}

CRITICAL INSTRUCTIONS:
- DO NOT give instructions like "Include keyword in content" or "Add alt text to images"
- INSTEAD provide the ACTUAL rewritten content, the EXACT new title, the SPECIFIC alt text, etc.
- For titles: Write the complete optimized title ready to copy-paste (30-60 chars, include focus keyword)
- For meta descriptions: Write the complete optimized meta description ready to use (120-160 chars, include focus keyword)
- For H1s: Write the complete optimized H1 heading (include focus keyword naturally)
- For content: Write the actual rewritten paragraph or section with keywords included naturally (aim for 0.5-2.5% keyword density)
- For images: Write the exact alt text for each image (descriptive, includes keyword where relevant)
- For internal links: Provide exact anchor text with target URLs (3-10 links recommended)
- For external links: Suggest authoritative sources with exact anchor text
- For technical SEO: Provide exact canonical URL, robots meta values, viewport meta tag
- For structured data: Write the complete JSON-LD schema markup ready to implement
- For social meta: Write exact Open Graph and Twitter Card meta tag values

SEO OPTIMIZATION CHECKLIST - Address these if failing:
✅ Title optimization: 30-60 chars, contains focus keyword near the beginning
✅ Meta description: 120-160 chars, contains focus keyword, compelling call-to-action
✅ H1 heading: One H1 per page, contains focus keyword, clear and descriptive
✅ Content quality: 300+ words minimum, focus keyword density 0.5-2.5%, natural language
✅ Images with alt tags: All images must have descriptive alt text, include keyword where relevant
✅ Internal links: 3-10 contextual internal links with descriptive anchor text
✅ External links: 2-5 links to authoritative sources for credibility
✅ Technical SEO: HTTPS enabled, mobile-friendly viewport, canonical URL set, robots meta allows indexing
✅ Structured data: JSON-LD schema markup appropriate for page type (Article, Product, etc.)
✅ Social meta tags: Open Graph (og:title, og:description, og:image) and Twitter Card tags

Example of GOOD suggestions (notice currentValue uses ACTUAL title/meta/h1, NOT the URL slug):
- Title: {"category": "Title", "issue": "Title does not include focus keyword", "currentValue": "Welcome to Our Insurance Site", "suggestedValue": "Comprehensive Insurance Coverage Plans | Get Quotes 2024", "reasoning": "Optimized to 56 chars, includes focus keyword at start, adds value proposition and year for freshness", "impact": "High", "estimatedTime": "5min", "priority": 10}
- Meta: {"category": "Meta", "issue": "Meta description missing", "currentValue": "Not set", "suggestedValue": "Compare insurance plans and get instant quotes online. Expert guidance on health, auto, and life insurance coverage. Save up to 40% on premiums today.", "reasoning": "150 chars, includes focus keyword early, highlights benefits with call-to-action", "impact": "High", "estimatedTime": "5min", "priority": 9}
- H1: {"category": "Content", "issue": "Focus keyword not in H1", "currentValue": "Welcome to Our Site", "suggestedValue": "Affordable Insurance Plans for Every Need", "reasoning": "Includes focus keyword naturally, clear value proposition, engages readers", "impact": "High", "estimatedTime": "5min", "priority": 9}

For EACH issue, recommendation, or optimization opportunity found, provide a fix in this exact JSON format:
{
  "category": "Title|Meta|Content|H1|Images|Links|Technical|Keywords",
  "issue": "Brief description of the issue",
  "currentValue": "The exact current text/content (use the actual title/meta/h1 text shown above, NOT the URL slug)",
  "suggestedValue": "The COMPLETE ready-to-use replacement text (not instructions)",
  "reasoning": "Why this fix improves SEO (1-2 sentences)",
  "impact": "High|Medium|Low",
  "estimatedTime": "5min|15min|30min|1hr|2hr",
  "priority": 1-10 (10 being highest)
}

Provide 5-15 specific fixes with ACTUAL content, not instructions. Focus on the focus keyword "${pageData.seo?.focusKeyword || ''}" throughout.

Return ONLY a valid JSON array of fix objects, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an elite SEO copywriter and technical SEO expert with 15+ years of experience. You write actual optimized content, not instructions. When asked to fix a title, you write the complete optimized title. When asked to fix meta descriptions, you write the complete meta description. When asked to optimize content, you rewrite the actual content with keywords naturally included. You provide ready-to-use content that can be immediately copy-pasted. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 3000,
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Extract JSON from response (in case it's wrapped in markdown code blocks)
      let jsonText = responseText;
      if (responseText.includes('```json')) {
        jsonText = responseText.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || responseText;
      } else if (responseText.includes('```')) {
        jsonText = responseText.match(/```\s*([\s\S]*?)\s*```/)?.[1] || responseText;
      }

      const suggestions = JSON.parse(jsonText);
      
      // Sort by priority
      return suggestions.sort((a, b) => (b.priority || 5) - (a.priority || 5));
    } catch (error) {
      logger.error('AI SEO Fix Suggestions Error:', error);
      throw new Error('Failed to generate SEO fix suggestions: ' + error.message);
    }
  }
}

module.exports = new AIService();
