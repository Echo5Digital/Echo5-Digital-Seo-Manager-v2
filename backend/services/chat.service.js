const OpenAI = require('openai');
const { logger } = require('../utils/logger');
const { chatFunctions, isBlockedQuery, BLOCKED_RESPONSE, getSystemPrompt } = require('./chatFunctions');

// Models for function execution
const Task = require('../models/Task.model');
const Client = require('../models/Client.model');
const Page = require('../models/Page.model');
const Audit = require('../models/Audit.model');
const Keyword = require('../models/Keyword.model');
const User = require('../models/User.model');
const RankHistory = require('../models/RankHistory.model');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Token limits
const MAX_CONTEXT_TOKENS = 4000;
const MAX_RESPONSE_TOKENS = 1500;

/**
 * Chat Service - Handles AI chat processing
 */
class ChatService {
  
  /**
   * Process a chat message
   * @param {string} message - User's message
   * @param {Object} user - Current user
   * @param {Array} conversationHistory - Recent messages for context
   * @param {Object} context - Current page/client context
   * @returns {Object} AI response with content, buttons, followUps
   */
  async processMessage(message, user, conversationHistory = [], context = {}) {
    try {
      // Check for blocked content
      if (isBlockedQuery(message)) {
        return {
          content: BLOCKED_RESPONSE,
          buttons: [
            { label: "📋 Show My Tasks", action: "Show my pending tasks", style: "primary" },
            { label: "📊 Client List", action: "Show active clients", style: "secondary" }
          ],
          tokenCount: 0
        };
      }

      // Build messages array
      const messages = [
        { role: 'system', content: getSystemPrompt(user, context) }
      ];

      // Add conversation history (limit to save tokens)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call OpenAI with function calling
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        functions: chatFunctions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: MAX_RESPONSE_TOKENS,
        stream: false // We'll add streaming later
      });

      const responseMessage = response.choices[0].message;
      const tokenCount = response.usage?.total_tokens || 0;

      // Check if AI wants to call a function
      if (responseMessage.function_call) {
        const functionResult = await this.executeFunction(
          responseMessage.function_call.name,
          JSON.parse(responseMessage.function_call.arguments || '{}'),
          user
        );

        // Send function result back to AI for natural language response
        messages.push(responseMessage);
        messages.push({
          role: 'function',
          name: responseMessage.function_call.name,
          content: JSON.stringify(functionResult)
        });

        const finalResponse = await openai.chat.completions.create({
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: MAX_RESPONSE_TOKENS
        });

        const finalMessage = finalResponse.choices[0].message.content;
        const finalTokens = finalResponse.usage?.total_tokens || 0;

        // Generate contextual buttons and follow-ups (role-aware)
        const { buttons, followUps } = this.generateActions(
          responseMessage.function_call.name,
          functionResult,
          user
        );

        return {
          content: finalMessage,
          buttons,
          followUps,
          functionCall: {
            name: responseMessage.function_call.name,
            arguments: JSON.parse(responseMessage.function_call.arguments || '{}'),
            result: functionResult
          },
          tokenCount: tokenCount + finalTokens
        };
      }

      // No function call - direct response (role-aware)
      return {
        content: responseMessage.content,
        buttons: this.getDefaultButtons(message, user),
        followUps: this.getDefaultFollowUps(message, user),
        tokenCount
      };

    } catch (error) {
      logger.error('Chat processing error:', error);
      throw error;
    }
  }

  /**
   * Execute a function call
   */
  async executeFunction(functionName, args, user) {
    logger.info(`Executing function: ${functionName}`, args);

    try {
      switch (functionName) {
        case 'getTasks':
          return await this.getTasks(args, user);
        case 'createTask':
          return await this.createTask(args, user);
        case 'updateTaskStatus':
          return await this.updateTaskStatus(args, user);
        case 'assignTask':
          return await this.assignTask(args, user);
        case 'getClients':
          return await this.getClients(args, user);
        case 'getClientMetrics':
          return await this.getClientMetrics(args, user);
        case 'getPageIssues':
          return await this.getPageIssues(args, user);
        case 'getAuditSummary':
          return await this.getAuditSummary(args, user);
        case 'getKeywordRankings':
          return await this.getKeywordRankings(args, user);
        case 'getDailySummary':
          return await this.getDailySummary(user);
        case 'getOverdueTasks':
          return await this.getOverdueTasks(args, user);
        case 'searchTasks':
          return await this.searchTasks(args, user);
        case 'getTeamMembers':
          return await this.getTeamMembers(user);
        // Admin-only functions
        case 'getTeamWorkload':
          return await this.getTeamWorkload(args, user);
        case 'getExecutiveSummary':
          return await this.getExecutiveSummary(args, user);
        case 'getTeamPerformance':
          return await this.getTeamPerformance(args, user);
        case 'getAllOverdueTasks':
          return await this.getAllOverdueTasks(args, user);
        case 'getClientNeedingAttention':
          return await this.getClientNeedingAttention(args, user);
        default:
          return { error: `Unknown function: ${functionName}` };
      }
    } catch (error) {
      logger.error(`Function execution error: ${functionName}`, error);
      return { error: error.message };
    }
  }

  // ==================== FUNCTION IMPLEMENTATIONS ====================

  async getTasks(args, user) {
    const query = {};
    
    // Permission check - Staff only see their tasks
    if (user.role === 'Staff') {
      query.assignedTo = user._id;
    } else if (args.assignedTo === 'me') {
      query.assignedTo = user._id;
    } else if (args.assignedTo) {
      query.assignedTo = args.assignedTo;
    }

    if (args.status) query.status = args.status;
    if (args.priority) query.priority = args.priority;
    
    // Handle client search
    if (args.clientName) {
      const client = await Client.findOne({ 
        name: new RegExp(args.clientName, 'i') 
      });
      if (client) query.clientId = client._id;
    } else if (args.clientId) {
      query.clientId = args.clientId;
    }

    // Handle due date filters
    if (args.dueWithin) {
      const now = new Date();
      switch (args.dueWithin) {
        case 'today':
          query.dueDate = {
            $gte: new Date(now.setHours(0,0,0,0)),
            $lt: new Date(now.setHours(23,59,59,999))
          };
          break;
        case 'week':
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          query.dueDate = { $lte: weekEnd };
          break;
        case 'overdue':
          query.dueDate = { $lt: new Date() };
          query.status = { $nin: ['Completed', 'Cancelled'] };
          break;
      }
    }

    const tasks = await Task.find(query)
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ priority: -1, dueDate: 1 })
      .limit(args.limit || 10);

    return {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        client: t.clientId?.name || 'No Client',
        assignedTo: t.assignedTo?.name || 'Unassigned',
        dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : null
      }))
    };
  }

  async createTask(args, user) {
    // Resolve client name to ID
    let clientId = args.clientId;
    if (!clientId && args.clientName) {
      const client = await Client.findOne({ 
        name: new RegExp(args.clientName, 'i') 
      });
      if (client) clientId = client._id;
    }

    // Resolve assignee
    let assignedTo = args.assignedTo === 'me' ? user._id : args.assignedTo;
    if (!assignedTo && args.assignedToName) {
      const assignee = await User.findOne({ 
        name: new RegExp(args.assignedToName, 'i') 
      });
      if (assignee) assignedTo = assignee._id;
    }

    const task = await Task.create({
      title: args.title,
      description: args.description || '',
      clientId,
      type: args.type || 'Other',
      priority: args.priority || 'Medium',
      status: 'Pending',
      assignedTo,
      dueDate: args.dueDate ? new Date(args.dueDate) : null,
      relatedUrl: args.relatedUrl,
      createdBy: user._id,
      logs: [{
        action: 'Task created via AI Chat',
        userId: user._id,
        timestamp: new Date()
      }]
    });

    await task.populate('clientId', 'name');
    await task.populate('assignedTo', 'name');

    return {
      success: true,
      task: {
        id: task._id,
        title: task.title,
        client: task.clientId?.name,
        assignedTo: task.assignedTo?.name,
        priority: task.priority,
        status: task.status
      }
    };
  }

  async updateTaskStatus(args, user) {
    let task;
    
    if (args.taskId) {
      task = await Task.findById(args.taskId);
    } else if (args.taskTitle) {
      // Search by title
      const query = { title: new RegExp(args.taskTitle, 'i') };
      if (user.role === 'Staff') {
        query.assignedTo = user._id;
      }
      task = await Task.findOne(query);
    }

    if (!task) {
      return { error: 'Task not found' };
    }

    const oldStatus = task.status;
    task.status = args.status;
    task.logs.push({
      action: `Status changed from ${oldStatus} to ${args.status} via AI Chat`,
      userId: user._id,
      timestamp: new Date()
    });

    await task.save();
    await task.populate('clientId', 'name');

    return {
      success: true,
      task: {
        id: task._id,
        title: task.title,
        oldStatus,
        newStatus: task.status,
        client: task.clientId?.name
      }
    };
  }

  async assignTask(args, user) {
    // Only managers and above can assign
    if (user.role === 'Staff') {
      return { error: 'You do not have permission to assign tasks' };
    }

    let task;
    if (args.taskId) {
      task = await Task.findById(args.taskId);
    } else if (args.taskTitle) {
      task = await Task.findOne({ title: new RegExp(args.taskTitle, 'i') });
    }

    if (!task) {
      return { error: 'Task not found' };
    }

    let assignee;
    if (args.userId) {
      assignee = await User.findById(args.userId);
    } else if (args.userName) {
      assignee = await User.findOne({ name: new RegExp(args.userName, 'i') });
    }

    if (!assignee) {
      return { error: 'User not found' };
    }

    task.assignedTo = assignee._id;
    task.logs.push({
      action: `Assigned to ${assignee.name} via AI Chat`,
      userId: user._id,
      timestamp: new Date()
    });

    await task.save();

    return {
      success: true,
      task: {
        id: task._id,
        title: task.title,
        assignedTo: assignee.name
      }
    };
  }

  async getClients(args, user) {
    const query = {};
    
    if (args.status) query.status = args.status;
    if (args.search) query.name = new RegExp(args.search, 'i');

    const clients = await Client.find(query)
      .select('name domain status')
      .limit(args.limit || 10);

    return {
      count: clients.length,
      clients: clients.map(c => ({
        id: c._id,
        name: c.name,
        domain: c.domain,
        status: c.status
      }))
    };
  }

  async getClientMetrics(args, user) {
    let client;
    
    if (args.clientId) {
      client = await Client.findById(args.clientId);
    } else if (args.clientName) {
      client = await Client.findOne({ name: new RegExp(args.clientName, 'i') });
    }

    if (!client) {
      return { error: 'Client not found' };
    }

    // Get pages with SEO scores
    const pages = await Page.find({ clientId: client._id });
    const avgScore = pages.length > 0 
      ? Math.round(pages.reduce((sum, p) => sum + (p.seo?.seoScore || 0), 0) / pages.length)
      : 0;

    // Get keyword count
    const keywords = await Keyword.countDocuments({ clientId: client._id });

    // Get latest audit
    const latestAudit = await Audit.findOne({ clientId: client._id })
      .sort({ createdAt: -1 });

    // Count issues
    const issuePages = pages.filter(p => (p.seo?.seoScore || 0) < 60);

    return {
      client: {
        name: client.name,
        domain: client.domain,
        status: client.status
      },
      metrics: {
        totalPages: pages.length,
        avgSeoScore: avgScore,
        trackedKeywords: keywords,
        pagesNeedingWork: issuePages.length,
        lastAudit: latestAudit?.createdAt?.toISOString().split('T')[0] || 'Never'
      }
    };
  }

  async getPageIssues(args, user) {
    let clientId = args.clientId;
    
    if (!clientId && args.clientName) {
      const client = await Client.findOne({ name: new RegExp(args.clientName, 'i') });
      if (client) clientId = client._id;
    }

    if (!clientId) {
      return { error: 'Please specify a client' };
    }

    const pages = await Page.find({ clientId })
      .select('url title seo')
      .limit(50);

    const issues = [];
    
    for (const page of pages) {
      const score = page.seo?.seoScore || 0;
      
      if (score < 40) {
        issues.push({
          url: page.url,
          title: page.title,
          score,
          severity: 'critical'
        });
      } else if (score < 60) {
        issues.push({
          url: page.url,
          title: page.title,
          score,
          severity: 'high'
        });
      } else if (score < 80) {
        issues.push({
          url: page.url,
          title: page.title,
          score,
          severity: 'medium'
        });
      }
    }

    // Filter by severity if specified
    const filtered = args.severity 
      ? issues.filter(i => i.severity === args.severity)
      : issues;

    // Sort by severity and limit
    const sorted = filtered
      .sort((a, b) => a.score - b.score)
      .slice(0, args.limit || 10);

    return {
      count: sorted.length,
      totalIssues: issues.length,
      issues: sorted
    };
  }

  async getAuditSummary(args, user) {
    let clientId = args.clientId;
    
    if (!clientId && args.clientName) {
      const client = await Client.findOne({ name: new RegExp(args.clientName, 'i') });
      if (client) clientId = client._id;
    }

    if (!clientId) {
      return { error: 'Please specify a client' };
    }

    const audit = await Audit.findOne({ clientId })
      .sort({ createdAt: -1 });

    if (!audit) {
      return { error: 'No audits found for this client' };
    }

    return {
      auditDate: audit.createdAt.toISOString().split('T')[0],
      status: audit.status,
      overallScore: audit.summary?.overallScore || 0,
      summary: {
        pagesScanned: audit.summary?.totalPages || 0,
        criticalIssues: audit.results?.metaIssues?.filter(i => i.severity === 'critical').length || 0,
        highIssues: audit.results?.metaIssues?.filter(i => i.severity === 'high').length || 0,
        mediumIssues: audit.results?.metaIssues?.filter(i => i.severity === 'medium').length || 0
      }
    };
  }

  async getKeywordRankings(args, user) {
    let clientId = args.clientId;
    
    if (!clientId && args.clientName) {
      const client = await Client.findOne({ name: new RegExp(args.clientName, 'i') });
      if (client) clientId = client._id;
    }

    const query = {};
    if (clientId) query.clientId = clientId;
    if (args.keyword) query.keyword = new RegExp(args.keyword, 'i');

    const keywords = await Keyword.find(query)
      .select('keyword currentRank previousRank keywordType')
      .limit(args.limit || 10);

    return {
      count: keywords.length,
      keywords: keywords.map(k => ({
        keyword: k.keyword,
        currentRank: k.currentRank || 'Not ranked',
        previousRank: k.previousRank || 'N/A',
        change: k.previousRank && k.currentRank 
          ? k.previousRank - k.currentRank 
          : 0,
        type: k.keywordType
      }))
    };
  }

  async getDailySummary(user) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // My tasks
    const taskQuery = { assignedTo: user._id };
    
    const [pendingTasks, inProgressTasks, completedToday, overdueTasks] = await Promise.all([
      Task.countDocuments({ ...taskQuery, status: 'Pending' }),
      Task.countDocuments({ ...taskQuery, status: 'In Progress' }),
      Task.countDocuments({ 
        ...taskQuery, 
        status: 'Completed',
        updatedAt: { $gte: today }
      }),
      Task.countDocuments({
        ...taskQuery,
        dueDate: { $lt: today },
        status: { $nin: ['Completed', 'Cancelled'] }
      })
    ]);

    // High priority tasks due soon
    const urgentTasks = await Task.find({
      ...taskQuery,
      priority: { $in: ['Critical', 'High'] },
      status: { $nin: ['Completed', 'Cancelled'] }
    })
      .populate('clientId', 'name')
      .limit(5);

    return {
      date: today.toISOString().split('T')[0],
      userName: user.name,
      summary: {
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completedToday: completedToday,
        overdue: overdueTasks
      },
      urgentTasks: urgentTasks.map(t => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        client: t.clientId?.name,
        dueDate: t.dueDate?.toISOString().split('T')[0]
      }))
    };
  }

  async getOverdueTasks(args, user) {
    const query = {
      dueDate: { $lt: new Date() },
      status: { $nin: ['Completed', 'Cancelled'] }
    };

    if (user.role === 'Staff' || args.assignedTo === 'me') {
      query.assignedTo = user._id;
    }

    const tasks = await Task.find(query)
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 });

    return {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        client: t.clientId?.name,
        assignedTo: t.assignedTo?.name,
        dueDate: t.dueDate?.toISOString().split('T')[0],
        daysOverdue: Math.ceil((new Date() - t.dueDate) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  async getTeamMembers(user) {
    if (user.role === 'Staff') {
      return { error: 'You do not have permission to view team members' };
    }

    const users = await User.find({ role: { $ne: 'Boss' } })
      .select('name email role');

    return {
      count: users.length,
      members: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    };
  }

  async searchTasks(args, user) {
    const { query: searchQuery, limit = 10 } = args;
    
    const searchConditions = {
      $or: [
        { title: new RegExp(searchQuery, 'i') },
        { description: new RegExp(searchQuery, 'i') },
        { notes: new RegExp(searchQuery, 'i') }
      ]
    };

    // Permission check - Staff only see their tasks
    if (user.role === 'Staff') {
      searchConditions.assignedTo = user._id;
    }

    const tasks = await Task.find(searchConditions)
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .limit(limit);

    return {
      query: searchQuery,
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        client: t.clientId?.name,
        assignedTo: t.assignedTo?.name,
        dueDate: t.dueDate?.toISOString().split('T')[0]
      }))
    };
  }

  // ==================== ADMIN/MANAGER FUNCTIONS ====================

  async getTeamWorkload(args, user) {
    if (!['Boss', 'Manager'].includes(user.role)) {
      return { error: 'You do not have permission to view team workload' };
    }

    const { includeCompleted = false } = args;

    // Get all team members
    const teamMembers = await User.find({ isActive: true, role: { $ne: 'Boss' } })
      .select('name role');

    // Get task counts per team member
    const workload = await Promise.all(teamMembers.map(async (member) => {
      const statusFilter = includeCompleted 
        ? {} 
        : { status: { $nin: ['Completed', 'Cancelled'] } };

      const [pending, inProgress, total, overdue] = await Promise.all([
        Task.countDocuments({ assignedTo: member._id, status: 'Pending', ...statusFilter }),
        Task.countDocuments({ assignedTo: member._id, status: 'In Progress', ...statusFilter }),
        Task.countDocuments({ assignedTo: member._id, ...statusFilter }),
        Task.countDocuments({ 
          assignedTo: member._id, 
          dueDate: { $lt: new Date() },
          status: { $nin: ['Completed', 'Cancelled'] }
        })
      ]);

      return {
        id: member._id,
        name: member.name,
        role: member.role,
        pending,
        inProgress,
        total,
        overdue,
        status: overdue > 0 ? 'overloaded' : total > 10 ? 'busy' : 'available'
      };
    }));

    return {
      teamSize: teamMembers.length,
      workload: workload.sort((a, b) => b.total - a.total)
    };
  }

  async getExecutiveSummary(args, user) {
    if (user.role !== 'Boss') {
      return { error: 'Executive summary is only available to Boss role' };
    }

    const { period = 'today' } = args;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default: // today
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const [
      totalClients,
      activeClients,
      totalTasks,
      completedTasks,
      overdueTasksCount,
      criticalIssues,
      teamMembers
    ] = await Promise.all([
      Client.countDocuments({}),
      Client.countDocuments({ status: 'Active' }),
      Task.countDocuments({}),
      Task.countDocuments({ status: 'Completed', updatedAt: { $gte: startDate } }),
      Task.countDocuments({ dueDate: { $lt: new Date() }, status: { $nin: ['Completed', 'Cancelled'] } }),
      Page.countDocuments({ 'seo.seoScore': { $lt: 40 } }),
      User.countDocuments({ isActive: true, role: { $ne: 'Boss' } })
    ]);

    // Get clients needing attention (low SEO scores)
    const clientsNeedingAttention = await Client.find({ status: 'Active' })
      .select('name domain')
      .limit(5);

    // Calculate team productivity
    const tasksByStatus = await Task.aggregate([
      { $match: { updatedAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
      period,
      overview: {
        totalClients,
        activeClients,
        teamMembers,
        criticalIssues
      },
      tasks: {
        total: totalTasks,
        completedThisPeriod: completedTasks,
        overdue: overdueTasksCount,
        byStatus: tasksByStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {})
      },
      clientsNeedingAttention: clientsNeedingAttention.map(c => ({
        name: c.name,
        domain: c.domain
      }))
    };
  }

  async getTeamPerformance(args, user) {
    if (!['Boss', 'Manager'].includes(user.role)) {
      return { error: 'You do not have permission to view team performance' };
    }

    const { period = 'week', userId } = args;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default: // week
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    const matchQuery = { updatedAt: { $gte: startDate } };
    if (userId) matchQuery.assignedTo = userId;

    // Get performance by team member
    const performance = await Task.aggregate([
      { $match: matchQuery },
      { 
        $group: {
          _id: '$assignedTo',
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { 
        $project: {
          name: '$user.name',
          role: '$user.role',
          completed: 1,
          inProgress: 1,
          total: 1,
          completionRate: { 
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
            ]
          }
        }
      }
    ]);

    return {
      period,
      performance: performance.map(p => ({
        ...p,
        completionRate: Math.round(p.completionRate)
      })).sort((a, b) => b.completionRate - a.completionRate)
    };
  }

  async getAllOverdueTasks(args, user) {
    if (!['Boss', 'Manager'].includes(user.role)) {
      return { error: 'You do not have permission to view all overdue tasks' };
    }

    const { groupBy = 'assignee' } = args;

    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $nin: ['Completed', 'Cancelled'] }
    })
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 });

    // Group tasks based on parameter
    const grouped = {};
    overdueTasks.forEach(task => {
      let key;
      switch (groupBy) {
        case 'client':
          key = task.clientId?.name || 'No Client';
          break;
        case 'priority':
          key = task.priority;
          break;
        default: // assignee
          key = task.assignedTo?.name || 'Unassigned';
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: task._id,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString().split('T')[0],
        daysOverdue: Math.ceil((new Date() - task.dueDate) / (1000 * 60 * 60 * 24)),
        client: task.clientId?.name,
        assignedTo: task.assignedTo?.name
      });
    });

    return {
      totalOverdue: overdueTasks.length,
      groupedBy: groupBy,
      groups: grouped
    };
  }

  async getClientNeedingAttention(args, user) {
    if (!['Boss', 'Manager'].includes(user.role)) {
      return { error: 'You do not have permission to view this data' };
    }

    const { limit = 5 } = args;

    // Get clients with their metrics
    const clients = await Client.find({ status: 'Active' }).select('name domain');
    
    const clientsWithMetrics = await Promise.all(clients.map(async (client) => {
      const [pages, overdueTasks, avgScore] = await Promise.all([
        Page.countDocuments({ clientId: client._id, 'seo.seoScore': { $lt: 50 } }),
        Task.countDocuments({ 
          clientId: client._id, 
          dueDate: { $lt: new Date() },
          status: { $nin: ['Completed', 'Cancelled'] }
        }),
        Page.aggregate([
          { $match: { clientId: client._id } },
          { $group: { _id: null, avgScore: { $avg: '$seo.seoScore' } } }
        ])
      ]);

      const score = avgScore[0]?.avgScore || 0;
      const urgencyScore = (pages * 2) + (overdueTasks * 3) + ((100 - score) / 10);

      return {
        id: client._id,
        name: client.name,
        domain: client.domain,
        issuePages: pages,
        overdueTasks,
        avgSeoScore: Math.round(score),
        urgencyScore: Math.round(urgencyScore)
      };
    }));

    // Sort by urgency and return top N
    const sorted = clientsWithMetrics
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, limit);

    return {
      clients: sorted,
      count: sorted.length
    };
  }

  // ==================== HELPER METHODS ====================

  generateActions(functionName, result, user = {}) {
    const buttons = [];
    const followUps = [];
    const isAdmin = ['Boss', 'Manager'].includes(user.role);

    switch (functionName) {
      case 'getTasks':
        buttons.push(
          { label: "➕ Create Task", action: "Create a new task", style: "primary" },
          { label: "📊 By Priority", action: "Show tasks by priority", style: "secondary" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "👥 Team Tasks", action: "Show all team tasks", style: "secondary" },
            { label: "⏰ Overdue", action: "Show all overdue tasks", style: "danger" }
          );
          followUps.push(
            "Show all team tasks",
            "Tasks by team member",
            "Reassign a task"
          );
        }
        followUps.push(
          "Show overdue tasks",
          "Create a new task",
          "Tasks by client"
        );
        break;

      case 'createTask':
        buttons.push(
          { label: "📋 View All Tasks", action: "Show my tasks", style: "primary" },
          { label: "➕ Create Another", action: "Create another task", style: "secondary" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "👤 Assign Task", action: "Assign a task to team member", style: "primary" }
          );
          followUps.push(
            "Assign this task to someone",
            "Show team workload"
          );
        }
        followUps.push(
          "Show my tasks",
          "Create another task"
        );
        break;

      case 'getClients':
        buttons.push(
          { label: "📊 Client Metrics", action: "Show metrics for a client", style: "primary" },
          { label: "⚠️ Issues", action: "Show client with most issues", style: "secondary" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "📈 All SEO Scores", action: "Show all clients SEO scores", style: "primary" },
            { label: "🔍 Audit Status", action: "Show clients needing audits", style: "warning" }
          );
          followUps.push(
            "Which clients need audits?",
            "Show all SEO scores",
            "Clients by performance"
          );
        }
        followUps.push(
          "Show metrics for [client name]",
          "Which client needs attention?"
        );
        break;

      case 'getClientMetrics':
        buttons.push(
          { label: "⚠️ View Issues", action: "Show page issues", style: "warning" },
          { label: "📈 Keywords", action: "Show keyword rankings", style: "primary" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "📋 Create Tasks", action: "Create tasks for these issues", style: "success" },
            { label: "👤 Assign Staff", action: "Who is assigned to this client?", style: "secondary" }
          );
          followUps.push(
            "Create tasks for critical issues",
            "Assign issues to team",
            "Compare with last month"
          );
        }
        followUps.push(
          "Show page issues",
          "Create task for issues",
          "Show keyword rankings"
        );
        break;

      case 'getDailySummary':
        buttons.push(
          { label: "📋 My Tasks", action: "Show my pending tasks", style: "primary" },
          { label: "⚠️ Overdue", action: "Show overdue tasks", style: "danger" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "👥 Team Summary", action: "Show team workload summary", style: "primary" },
            { label: "📊 Performance", action: "Show team performance today", style: "secondary" }
          );
          followUps.push(
            "How is the team doing?",
            "Who has capacity?",
            "Show blocked tasks"
          );
        }
        followUps.push(
          "Show my pending tasks",
          "What's most urgent?",
          "Show overdue tasks"
        );
        break;

      case 'getAuditSummary':
        buttons.push(
          { label: "⚠️ Critical Issues", action: "Show critical issues", style: "danger" },
          { label: "📋 Create Tasks", action: "Create tasks for issues", style: "success" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "👥 Assign Team", action: "Assign audit issues to team", style: "primary" }
          );
          followUps.push(
            "Assign issues to team members",
            "Schedule follow-up audit"
          );
        }
        followUps.push(
          "Show all issues",
          "Prioritize fixes"
        );
        break;

      case 'getKeywordRankings':
        buttons.push(
          { label: "📈 Improvements", action: "Show keywords that improved", style: "success" },
          { label: "📉 Declined", action: "Show keywords that dropped", style: "danger" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "📊 All Clients", action: "Show keyword overview all clients", style: "primary" }
          );
          followUps.push(
            "Keyword trends all clients",
            "Best performing keywords"
          );
        }
        followUps.push(
          "Keywords to focus on",
          "Create content tasks"
        );
        break;

      case 'getTeamMembers':
        if (isAdmin) {
          buttons.push(
            { label: "📊 Workload", action: "Show team workload", style: "primary" },
            { label: "📈 Performance", action: "Show team performance", style: "secondary" },
            { label: "📋 Assign Tasks", action: "Bulk assign tasks", style: "success" }
          );
          followUps.push(
            "Who has capacity?",
            "Show overloaded team members",
            "Task distribution by member"
          );
        }
        break;

      default:
        buttons.push(
          { label: "📋 My Tasks", action: "Show my tasks", style: "primary" },
          { label: "📊 Summary", action: "Give me today's summary", style: "secondary" }
        );
        if (isAdmin) {
          buttons.push(
            { label: "👥 Team", action: "Show team overview", style: "secondary" }
          );
        }
    }

    return { buttons, followUps };
  }

  getDefaultButtons(message, user = {}) {
    const isAdmin = ['Boss', 'Manager'].includes(user.role);
    const buttons = [
      { label: "📋 Tasks", action: "Show my tasks", style: "secondary" },
      { label: "📊 Summary", action: "Daily summary", style: "secondary" }
    ];

    if (isAdmin) {
      buttons.push(
        { label: "👥 Team", action: "Show team overview", style: "secondary" },
        { label: "📈 Reports", action: "Quick performance report", style: "secondary" }
      );
    }

    return buttons;
  }

  getDefaultFollowUps(message, user = {}) {
    const isAdmin = ['Boss', 'Manager'].includes(user.role);
    const followUps = [
      "Show my pending tasks",
      "What should I work on?",
      "Show active clients"
    ];

    if (isAdmin) {
      followUps.push(
        "Team workload overview",
        "Who needs help?",
        "Show all overdue tasks"
      );
    }

    return followUps;
  }

  /**
   * Get welcome message based on time of day and user role
   */
  getWelcomeMessage(user) {
    const hour = new Date().getHours();
    let greeting;
    let emoji;

    if (hour < 12) {
      greeting = 'Good morning';
      emoji = '☀️';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
      emoji = '👋';
    } else {
      greeting = 'Good evening';
      emoji = '🌙';
    }

    const isAdmin = ['Boss', 'Manager'].includes(user.role);
    
    // Role-specific buttons
    let buttons, followUps, content;

    if (isAdmin) {
      content = `${greeting}, ${user.name}! ${emoji}\n\nI'm your Echo5 AI assistant. As a ${user.role}, I can help you manage your team, track client performance, assign tasks, and get comprehensive reports. What would you like to do?`;
      buttons = [
        { label: "👥 Team Overview", action: "Show team workload summary", style: "primary" },
        { label: "📊 Executive Summary", action: "Give me today's executive summary", style: "primary" },
        { label: "⚠️ Critical Issues", action: "Show all critical issues across clients", style: "danger" },
        { label: "📋 All Tasks", action: "Show all team tasks", style: "secondary" },
        { label: "📈 Performance", action: "Show team performance this week", style: "secondary" },
        { label: "👤 My Tasks", action: "Show my pending tasks", style: "secondary" }
      ];
      followUps = [
        "Who has capacity for new work?",
        "Which clients need attention?",
        "Show overdue tasks across team",
        "Assign tasks to team members",
        "Weekly progress report"
      ];
    } else {
      content = `${greeting}, ${user.name}! ${emoji}\n\nI'm your Echo5 AI assistant. I can help you manage tasks, track client SEO issues, and stay organized. What would you like to do?`;
      buttons = [
        { label: "📋 My Tasks", action: "Show my pending tasks", style: "primary" },
        { label: "📊 Daily Summary", action: "Give me today's summary", style: "primary" },
        { label: "👥 My Clients", action: "Show my assigned clients", style: "secondary" },
        { label: "⚠️ Issues", action: "Show critical SEO issues", style: "secondary" }
      ];
      followUps = [
        "What should I work on today?",
        "Show overdue tasks",
        "Which clients need attention?"
      ];
    }

    return {
      role: 'assistant',
      content,
      buttons,
      followUps,
      timestamp: new Date()
    };
  }
}

module.exports = new ChatService();
