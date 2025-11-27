/**
 * Chat Functions - Allowed AI function definitions for OpenAI function calling
 * These are the ONLY operations the chatbot can perform
 */

const chatFunctions = [
  // ==================== TASK MANAGEMENT ====================
  {
    name: "getTasks",
    description: "Get tasks based on filters like status, priority, client, or assignee. Use this when user asks about their tasks, pending work, or task lists.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Pending", "In Progress", "Review", "Completed", "Cancelled"],
          description: "Filter by task status"
        },
        priority: {
          type: "string",
          enum: ["Critical", "High", "Medium", "Low"],
          description: "Filter by task priority"
        },
        clientId: {
          type: "string",
          description: "Filter by client ID"
        },
        clientName: {
          type: "string",
          description: "Filter by client name (will search)"
        },
        assignedTo: {
          type: "string",
          description: "Filter by assignee. Use 'me' for current user"
        },
        dueWithin: {
          type: "string",
          enum: ["today", "week", "month", "overdue"],
          description: "Filter by due date"
        },
        limit: {
          type: "number",
          description: "Max number of tasks to return",
          default: 10
        }
      }
    }
  },
  {
    name: "createTask",
    description: "Create a new task. Use this when user wants to create, add, or make a new task.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Task title (required)"
        },
        description: {
          type: "string",
          description: "Task description"
        },
        clientId: {
          type: "string",
          description: "Client ID this task is for"
        },
        clientName: {
          type: "string",
          description: "Client name (will be resolved to ID)"
        },
        type: {
          type: "string",
          enum: ["Site Audit Fix", "Content Optimization", "Content Writing", "Meta Update", "Alt Text", "Page Speed", "Technical SEO", "Schema Markup", "Internal Linking", "Keyword Research", "Backlink Building", "Client Communication", "Other"],
          description: "Type of task"
        },
        priority: {
          type: "string",
          enum: ["Critical", "High", "Medium", "Low"],
          default: "Medium"
        },
        assignedTo: {
          type: "string",
          description: "User ID to assign to, or 'me' for current user"
        },
        assignedToName: {
          type: "string",
          description: "User name to assign to (will be resolved)"
        },
        dueDate: {
          type: "string",
          description: "Due date in YYYY-MM-DD format"
        },
        relatedUrl: {
          type: "string",
          description: "Related URL or page"
        }
      },
      required: ["title"]
    }
  },
  {
    name: "updateTaskStatus",
    description: "Update the status of a task. Use when user wants to complete, start, or change task status.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task ID to update"
        },
        taskTitle: {
          type: "string",
          description: "Task title to search for (if ID not known)"
        },
        status: {
          type: "string",
          enum: ["Pending", "In Progress", "Review", "Completed", "Cancelled"],
          description: "New status"
        }
      },
      required: ["status"]
    }
  },
  {
    name: "assignTask",
    description: "Assign a task to a team member",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task ID to assign"
        },
        taskTitle: {
          type: "string",
          description: "Task title to search for"
        },
        userId: {
          type: "string",
          description: "User ID to assign to"
        },
        userName: {
          type: "string",
          description: "User name to assign to"
        }
      }
    }
  },

  // ==================== CLIENT DATA (READ ONLY) ====================
  {
    name: "getClients",
    description: "Get list of clients with optional filters. Use when user asks about clients.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Active", "Inactive", "On Hold"],
          description: "Filter by client status"
        },
        search: {
          type: "string",
          description: "Search by client name"
        },
        limit: {
          type: "number",
          default: 10
        }
      }
    }
  },
  {
    name: "getClientMetrics",
    description: "Get SEO metrics and performance data for a specific client",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string",
          description: "Client ID"
        },
        clientName: {
          type: "string",
          description: "Client name to search for"
        }
      }
    }
  },

  // ==================== PAGE & AUDIT DATA (READ ONLY) ====================
  {
    name: "getPageIssues",
    description: "Get SEO issues for client pages. Use when user asks about issues, problems, or what needs fixing.",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string"
        },
        clientName: {
          type: "string"
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Filter by issue severity"
        },
        limit: {
          type: "number",
          default: 10
        }
      }
    }
  },
  {
    name: "getAuditSummary",
    description: "Get the latest audit summary for a client (does NOT run a new audit)",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string"
        },
        clientName: {
          type: "string"
        }
      }
    }
  },

  // ==================== KEYWORDS (READ ONLY) ====================
  {
    name: "getKeywordRankings",
    description: "Get keyword rankings for a client",
    parameters: {
      type: "object",
      properties: {
        clientId: {
          type: "string"
        },
        clientName: {
          type: "string"
        },
        keyword: {
          type: "string",
          description: "Specific keyword to check"
        },
        limit: {
          type: "number",
          default: 10
        }
      }
    }
  },

  // ==================== REPORTS & SUMMARIES ====================
  {
    name: "getDailySummary",
    description: "Get a summary of today's work, tasks, and priorities. Use for 'what should I work on' type questions.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getOverdueTasks",
    description: "Get tasks that are past their due date",
    parameters: {
      type: "object",
      properties: {
        assignedTo: {
          type: "string",
          description: "Filter by assignee, 'me' for current user"
        }
      }
    }
  },
  {
    name: "getTeamMembers",
    description: "Get list of team members for task assignment (Manager/Boss only)",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  
  // ==================== ADMIN/MANAGER FUNCTIONS ====================
  {
    name: "getTeamWorkload",
    description: "Get team workload summary showing tasks per team member (Manager/Boss only)",
    parameters: {
      type: "object",
      properties: {
        includeCompleted: {
          type: "boolean",
          description: "Include completed tasks in count",
          default: false
        }
      }
    }
  },
  {
    name: "getExecutiveSummary",
    description: "Get executive summary with overview of all clients, tasks, and team performance (Boss only)",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
          description: "Time period for summary",
          default: "today"
        }
      }
    }
  },
  {
    name: "getTeamPerformance",
    description: "Get team performance metrics like tasks completed, average completion time (Manager/Boss only)",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
          default: "week"
        },
        userId: {
          type: "string",
          description: "Specific team member ID, or omit for all"
        }
      }
    }
  },
  {
    name: "getAllOverdueTasks",
    description: "Get all overdue tasks across the entire team (Manager/Boss only)",
    parameters: {
      type: "object",
      properties: {
        groupBy: {
          type: "string",
          enum: ["assignee", "client", "priority"],
          description: "How to group the results"
        }
      }
    }
  },
  {
    name: "getClientNeedingAttention",
    description: "Get clients that need attention based on issues, overdue tasks, or poor SEO scores (Manager/Boss only)",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          default: 5
        }
      }
    }
  },
  {
    name: "searchTasks",
    description: "Search tasks by title, description, or notes",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        limit: {
          type: "number",
          default: 10
        }
      },
      required: ["query"]
    }
  }
];

// ==================== BLOCKED PATTERNS ====================
const BLOCKED_PATTERNS = [
  // Non-work related
  /write.*(poem|story|essay|joke|song|lyrics)/i,
  /tell me a (joke|story|riddle)/i,
  /play.*(game|music|song)/i,
  /generate.*(image|video|picture|photo|art|drawing)/i,
  /create.*(art|drawing|illustration|meme)/i,
  /compose.*(music|song)/i,
  
  // Privacy/Security
  /password|secret|api.?key|token|credential/i,
  /hack|exploit|bypass|inject|vulnerability/i,
  /personal.*(data|information|details)/i,
  /credit.?card|bank.?account|ssn|social.?security/i,
  /private.*(info|data|key)/i,
  
  // Protected admin operations (create/delete/update users/clients)
  /create.*(user|admin|staff|account|client|customer)/i,
  /delete.*(user|admin|staff|account|client|customer)/i,
  /remove.*(user|admin|staff|account|client|customer)/i,
  /update.*(user|admin|staff).*(password|role|permission|email)/i,
  /change.*(user|admin|staff).*(password|role|permission)/i,
  /add.*(user|admin|staff|member)/i,
  
  // Audit operations
  /run.*(audit|scan|crawl)/i,
  /start.*(audit|scan|crawl)/i,
  /trigger.*(audit|scan|crawl)/i,
  /execute.*(audit|scan)/i,
  /perform.*(audit|scan)/i,
  
  // Harmful content
  /how to (hack|steal|cheat|scam)/i,
  /illegal|criminal/i
];

const BLOCKED_RESPONSE = `I can only help with SEO task management, client metrics, and work-related queries.

**I cannot:**
• Run audits or scans
• Create/delete/modify clients or users
• Generate images or videos
• Access passwords or sensitive data
• Help with non-work related requests

**I can help with:**
• Managing your tasks (create, update, view)
• Viewing client metrics and SEO data
• Checking page issues and rankings
• Getting daily summaries and reports`;

/**
 * Check if a message contains blocked content
 */
function isBlockedQuery(message) {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Get the system prompt for the AI
 */
function getSystemPrompt(user, context = {}) {
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
  
  return `You are Echo5 AI, an intelligent assistant for Echo5 Digital's SEO Operations platform.

CURRENT USER:
- Name: ${user.name}
- Role: ${user.role}
- Time: Good ${timeOfDay}! It's ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

${context.currentPage ? `USER IS CURRENTLY VIEWING: ${context.currentPage}` : ''}
${context.currentClientId ? `CURRENT CLIENT CONTEXT: ${context.currentClientId}` : ''}

YOUR CAPABILITIES:
✅ Task Management: Create tasks, update status, view tasks, assign tasks
✅ Client Data: View client list, SEO metrics, performance data
✅ Page Issues: View SEO issues, audit results (but NOT run audits)
✅ Keywords: View keyword rankings
✅ Reports: Daily summaries, overdue tasks

YOUR LIMITATIONS (NEVER DO THESE):
❌ Cannot run/trigger/start audits or scans
❌ Cannot create/delete/modify users, admins, or clients
❌ Cannot generate images, videos, or media
❌ Cannot access passwords, API keys, or sensitive data
❌ Cannot help with non-work related requests

RESPONSE GUIDELINES:
1. Be concise and action-oriented
2. Use markdown formatting for readability
3. Include relevant action buttons in responses
4. Suggest follow-up actions when appropriate
5. If user asks something you can't do, politely explain and suggest alternatives
6. Format lists and data clearly
7. Use emoji sparingly for visual clarity (📋 ✅ ⚠️ 📊)

PERMISSION RULES:
- Staff can only see their own tasks
- Managers can see team tasks
- Boss/Admin can see everything

When showing tasks or data, respect these permissions based on user role: ${user.role}`;
}

module.exports = {
  chatFunctions,
  BLOCKED_PATTERNS,
  BLOCKED_RESPONSE,
  isBlockedQuery,
  getSystemPrompt
};
