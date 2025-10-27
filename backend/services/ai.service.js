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
      const prompt = `You are a world-class SEO specialist and technical SEO expert. Analyze this page and provide ACTUAL, READY-TO-USE content fixes - NOT instructions.

Page Information:
- Title: ${pageData.title || 'Not set'}
- URL: ${pageData.url || 'Not set'}
- Meta Description: ${pageData.metaDescription || 'Not set'}
- H1: ${pageData.content?.headings?.h1 || 'Not set'}
- Focus Keyword: ${pageData.seo?.focusKeyword || 'Not set'}
- Secondary Keywords: ${pageData.seo?.secondaryKeywords?.join(', ') || 'None'}
- Content Sample: ${pageData.content?.sample || 'Not available'}
- Content Length: ${pageData.content?.wordCount || 0} words
- Current SEO Score: ${seoReport.score}/100

SEO Analysis Issues:
${JSON.stringify(seoReport.issues, null, 2)}

CRITICAL INSTRUCTIONS:
- DO NOT give instructions like "Include keyword in content" or "Add alt text to images"
- INSTEAD provide the ACTUAL rewritten content, the EXACT new title, the SPECIFIC alt text, etc.
- For titles: Write the complete optimized title ready to copy-paste
- For meta descriptions: Write the complete optimized meta description ready to use
- For H1s: Write the complete optimized H1 heading
- For content: Write the actual rewritten paragraph or section with keywords included
- For images: Write the exact alt text for each image
- For links: Provide the exact anchor text to use

Example of GOOD suggestions:
- Title: "currentValue": "Insurance", "suggestedValue": "Comprehensive Insurance Coverage Plans | Get Quotes Online 2024"
- Meta: "currentValue": "Learn about insurance", "suggestedValue": "Compare insurance plans and get instant quotes. Expert guidance on health, auto, and life insurance coverage. Save up to 40% on premiums."
- Content: "currentValue": "We offer various plans", "suggestedValue": "We offer comprehensive insurance plans tailored to your needs, including health insurance, auto insurance, and life insurance coverage with competitive rates."

For EACH issue found, provide a fix in this exact JSON format:
{
  "category": "Title|Meta|Content|H1|Images|Links|Technical|Keywords",
  "issue": "Brief description of the issue",
  "currentValue": "The exact current text/content",
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
