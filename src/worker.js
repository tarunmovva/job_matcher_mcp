/**
 * Cloudflare Workers Entry Point for MCP Job Matcher Server
 * Adapts the Express.js HTTP server for Cloudflare Workers environment
 */

import { tools, validateToolParameters, getToolMetadata } from '../tools.js';
import { formatMarkdownResponse, formatTableOnlyMarkdownResponse } from '../markdownFormatter.js';
import { validateInputs } from '../validator.js';

// Configuration from environment variables with fallbacks
const CONFIG = {
  BACKEND_URL: globalThis.BACKEND_URL || 'https://job-board-aggregator.onrender.com',
  BACKEND_ENDPOINT: globalThis.BACKEND_ENDPOINT || '/server/match-resume-upload',
  // API_TOKEN will be accessed from env during request handling, not at module load time
  RATE_LIMIT_PER_MINUTE: parseInt(globalThis.RATE_LIMIT_PER_MINUTE) || 10,
  MAX_FILE_SIZE: parseInt(globalThis.MAX_FILE_SIZE) || 15000, // 15K characters for full resume
  MIN_FILE_SIZE: parseInt(globalThis.MIN_FILE_SIZE) || 500, // 500 chars for full resume
  TIMEOUT: parseInt(globalThis.TIMEOUT) || 30000, // 30 seconds
  LOG_LEVEL: globalThis.LOG_LEVEL || 'info',
  NODE_ENV: globalThis.NODE_ENV || 'production'
};

// Log configuration on startup (only in development or when LOG_LEVEL is debug)
if (CONFIG.NODE_ENV !== 'production' || CONFIG.LOG_LEVEL === 'debug') {
  console.log('🔧 Worker Configuration:', {
    BACKEND_URL: CONFIG.BACKEND_URL,
    BACKEND_ENDPOINT: CONFIG.BACKEND_ENDPOINT,
    RATE_LIMIT_PER_MINUTE: CONFIG.RATE_LIMIT_PER_MINUTE,
    MAX_FILE_SIZE: `${(CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
    MIN_FILE_SIZE: `${CONFIG.MIN_FILE_SIZE} bytes`,
    TIMEOUT: `${CONFIG.TIMEOUT}ms`,
    LOG_LEVEL: CONFIG.LOG_LEVEL,
    NODE_ENV: CONFIG.NODE_ENV
  });
}

// Simple in-memory rate limiter for Cloudflare Workers
class WorkersRateLimiter {
  constructor(limitPerMinute = 10) {
    this.limitPerMinute = limitPerMinute;
    this.requests = new Map();
  }

  checkLimit(sessionId) {
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window
    
    // Get existing requests for this session
    const sessionRequests = this.requests.get(sessionId) || [];
    
    // Filter out requests older than 1 minute
    const recentRequests = sessionRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.limitPerMinute) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + (60 * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        total: this.limitPerMinute
      };
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(sessionId, recentRequests);
    
    return {
      allowed: true,
      remaining: this.limitPerMinute - recentRequests.length,
      resetTime: now + (60 * 1000),
      total: this.limitPerMinute
    };
  }
}

// Job matcher server class for Workers
class WorkersJobMatcherServer {
  constructor() {
    this.rateLimiter = new WorkersRateLimiter(CONFIG.RATE_LIMIT_PER_MINUTE);
  }

  async handleMatchResumeCall(args, sessionId, env) {
    try {
      // Apply rate limiting
      const rateLimitResult = this.rateLimiter.checkLimit(sessionId);
      if (!rateLimitResult.allowed) {
        return {
          content: [{
            type: 'text',
            text: await this.formatRateLimitError(rateLimitResult)
          }]
        };
      }

      // Validate inputs
      const validation = validateInputs(args);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: await this.formatValidationError(validation.errors)
          }]
        };
      }

      // Call backend API
      const backendResponse = await this.callBackendAPI(args, env);
      
      // Format response as Markdown artifact
      const markdownResponse = formatMarkdownResponse(backendResponse, rateLimitResult.remaining);

      return {
        content: [{
          type: 'text',
          text: markdownResponse
        }]
      };

    } catch (error) {
      console.error('Match resume error:', error);
      return {
        content: [{
          type: 'text',
          text: await this.formatError(error)
        }]
      };
    }
  }

  async handleMatchJobsToApplyCall(args, sessionId, env) {
    try {
      // Apply rate limiting
      const rateLimitResult = this.rateLimiter.checkLimit(sessionId);
      if (!rateLimitResult.allowed) {
        return {
          content: [{
            type: 'text',
            text: await this.formatRateLimitError(rateLimitResult)
          }]
        };
      }

      // Validate inputs (same validation as match_resume)
      const validation = validateInputs(args);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: await this.formatValidationError(validation.errors)
          }]
        };
      }

      // Call backend API (same backend call as match_resume)
      const backendResponse = await this.callBackendAPI(args, env);
      
      // Format response as table-only Markdown artifact
      const markdownResponse = formatTableOnlyMarkdownResponse(backendResponse, rateLimitResult.remaining);

      return {
        content: [{
          type: 'text',
          text: markdownResponse
        }]
      };

    } catch (error) {
      console.error('Match jobs to apply error:', error);
      return {
        content: [{
          type: 'text',
          text: await this.formatError(error)
        }]
      };
    }
  }

  async callBackendAPI(args, env) {
    // Get API token from environment (secrets are available during request handling)
    const apiToken = env.API_AUTH_TOKEN;
    if (!apiToken) {
      throw new Error('API_AUTH_TOKEN environment variable is required. Please set it using: wrangler secret put API_AUTH_TOKEN');
    }

    // Create FormData equivalent for Workers
    const formData = new FormData();
    
    // Handle resume text by creating a blob
    const resumeBlob = new Blob([args.resume_text], { type: 'text/plain' });
    formData.append('file', resumeBlob, 'resume.txt');

    // Add optional parameters
    formData.append('user_experience', args.user_experience || '');
    formData.append('keywords', args.keywords || '');
    formData.append('location', args.location || '');
    formData.append('start_date', args.start_date || '');
    formData.append('end_date', args.end_date || '');
    formData.append('page', (args.page || 1).toString());
    formData.append('sort_by', args.sort_by || 'similarity');

    const url = `${CONFIG.BACKEND_URL}${CONFIG.BACKEND_ENDPOINT}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Accept': 'application/json'
      },
      body: formData,
      signal: AbortSignal.timeout(CONFIG.TIMEOUT)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }

      throw new WorkersBackendError(response.status, errorData);
    }

    return await response.json();
  }

  async formatRateLimitError(rateLimitResult) {
    const errorData = {
      type: 'rate_limit',
      quota: CONFIG.RATE_LIMIT_PER_MINUTE,
      resetTime: new Date(rateLimitResult.resetTime).toLocaleTimeString(),
      remaining: rateLimitResult.remaining
    };

    const markdownContent = `# ⏱️ Rate Limit Exceeded

You've reached the maximum number of requests allowed per minute. Please wait a moment before trying again.

## Rate Limit Information

**Quota:** ${errorData.quota} requests per minute
**Reset Time:** ${errorData.resetTime}
**Remaining:** ${errorData.remaining}

Please try again after the reset time.

---

*Job Matcher v1.0 - Powered by Cloudflare Workers*`;

    return JSON.stringify({
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      artifact_type: "text/markdown",
      artifact_id: `rate-limit-error-${Date.now()}`,
      artifact_title: "Rate Limit Exceeded",
      content: markdownContent,
      validation: {
        artifact_creation_required: true,
        content_type_validation: "markdown"
      },
      performance: {
        size_optimized: true,
        readable_format: true
      }
    }, null, 2);
  }

  async formatValidationError(errors) {
    const markdownContent = `# ❌ Input Validation Failed

Please fix the following issues and try again:

## Validation Errors

${errors.map(error => `- ${error}`).join('\n')}

Please correct these issues and retry your request.

---

*Job Matcher v1.0 - Powered by Cloudflare Workers*`;

    return JSON.stringify({
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      artifact_type: "text/markdown",
      artifact_id: `validation-error-${Date.now()}`,
      artifact_title: "Input Validation Failed",
      content: markdownContent,
      validation: {
        artifact_creation_required: true,
        content_type_validation: "markdown"
      },
      performance: {
        size_optimized: true,
        readable_format: true
      }
    }, null, 2);
  }

  async formatError(error) {
    let title = 'Request Failed';
    let message = 'An unexpected error occurred while processing your request.';
    let suggestions = [];
    let technicalDetails = '';

    if (error instanceof WorkersBackendError) {
      switch (error.status) {
        case 401:
          title = 'Authentication Error';
          message = 'Invalid API authentication. Please check your configuration.';
          suggestions.push('Contact support if this issue persists');
          break;
        case 400:
          title = 'File Processing Error';
          message = error.data.detail || 'Unable to process the uploaded file.';
          suggestions.push('Try uploading a different file format (PDF, DOCX, DOC, TXT)');
          suggestions.push('Ensure your file is not corrupted');
          break;
        case 413:
          title = 'File Too Large';
          message = 'The uploaded file exceeds the maximum size limit of 10MB.';
          suggestions.push('Try compressing your resume');
          suggestions.push('Use a different file format');
          break;
        case 422:
          title = 'Invalid Parameters';
          message = 'Some parameters are invalid.';
          if (error.data.detail) {
            technicalDetails = JSON.stringify(error.data.detail, null, 2);
          }
          break;
        case 500:
          title = 'Server Error';
          message = 'The backend server encountered an error.';
          suggestions.push('Please try again in a few moments');
          suggestions.push('Contact support if the issue persists');
          break;
      }
    }

    let markdownContent = `# ⚠️ ${title}\n\n`;
    markdownContent += `${message}\n\n`;
    
    if (suggestions.length > 0) {
      markdownContent += `## 💡 Troubleshooting Tips\n\n`;
      suggestions.forEach(suggestion => {
        markdownContent += `- ✓ ${suggestion}\n`;
      });
      markdownContent += `\n`;
    }
    
    if (technicalDetails) {
      markdownContent += `## 🔧 Technical Details\n\n`;
      markdownContent += `\`\`\`\n${technicalDetails}\n\`\`\`\n\n`;
    }
    
    markdownContent += `**Status Code:** ${error instanceof WorkersBackendError ? error.status : 'unknown'}\n\n`;
    markdownContent += `---\n\n`;
    markdownContent += `*Job Matcher v1.0 - Powered by Cloudflare Workers*`;

    return JSON.stringify({
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      fallback_behavior: "error_if_no_artifact",
      artifact_type: "text/markdown",
      artifact_id: `error-${Date.now()}`,
      artifact_title: title,
      content: markdownContent,
      validation: {
        artifact_creation_required: true,
        content_type_validation: "markdown",
        error_handling_mode: "readable"
      },
      performance: {
        size_optimized: true,
        readable_format: true,
        error_type: error instanceof WorkersBackendError ? error.status : 'unknown'
      }
    }, null, 2);
  }
}

// Custom error class for backend API errors
class WorkersBackendError extends Error {
  constructor(status, data) {
    super(`Backend API error: ${status}`);
    this.name = 'WorkersBackendError';
    this.status = status;
    this.data = data;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Main worker export
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // Get session ID from headers or IP
    const sessionId = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     'worker-client';

    // Create server instance
    const server = new WorkersJobMatcherServer();

    try {
      // Health check endpoint
      if (path === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'Job Matcher MCP Server',
          version: '1.0.0',
          transport: 'Cloudflare Workers',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // MCP tools listing endpoint
      if (path === '/mcp/tools' && request.method === 'GET') {
        return new Response(JSON.stringify({
          tools: Object.values(tools),
          count: Object.keys(tools).length,
          metadata: {
            server: 'job-matcher-mcp-server',
            version: '1.0.0',
            transport: 'Cloudflare Workers'
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Enhanced tool metadata endpoint - individual tool details
      if (path.startsWith('/mcp/tools/') && path !== '/mcp/tools/call' && request.method === 'GET') {
        try {
          const toolName = path.split('/mcp/tools/')[1];
          const toolMetadata = getToolMetadata(toolName);
          
          if (!toolMetadata) {
            return new Response(JSON.stringify({
              error: 'Tool not found',
              available: Object.keys(tools)
            }), {
              status: 404,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
          return new Response(JSON.stringify({
            tool: toolMetadata,
            metadata: {
              server: 'job-matcher-mcp-server',
              version: '1.0.0',
              transport: 'Cloudflare Workers'
            }
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          console.error('Tool metadata error:', error);
          return new Response(JSON.stringify({
            error: 'Failed to get tool metadata',
            details: error.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // MCP tool execution endpoint
      if (path === '/mcp/tools/call' && request.method === 'POST') {
        const body = await request.json();
        const { name, arguments: args } = body;

        // Validate tool exists
        if (!tools[name]) {
          return new Response(JSON.stringify({
            error: 'Unknown tool',
            details: `Tool '${name}' not found`,
            available: Object.keys(tools)
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Use existing validation from tools.js
        const validation = validateToolParameters(name, args || {});
        if (!validation.valid) {
          return new Response(JSON.stringify({
            error: 'Tool validation failed',
            details: validation.errors,
            tool: name,
            received_args: Object.keys(args || {})
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        // Execute the tool
        let result;
        if (name === 'match_resume') {
          result = await server.handleMatchResumeCall(args, sessionId, env);
        } else if (name === 'match_jobs_to_apply') {
          result = await server.handleMatchJobsToApplyCall(args, sessionId, env);
        } else {
          return new Response(JSON.stringify({
            error: 'Tool execution not implemented',
            details: `Tool '${name}' handler not found`,
            available: Object.keys(tools)
          }), {
            status: 501,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // Extract the content from MCP response format
        const content = result.content?.[0]?.text || result.content || result;
        
        return new Response(JSON.stringify({
          result: content,
          tool: name,
          metadata: {
            server: 'job-matcher-mcp-server',
            version: '1.0.0',
            transport: 'Cloudflare Workers'
          },
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // MCP Protocol endpoint (main endpoint for mcp-remote)
      if (path === '/' && request.method === 'POST') {
        const body = await request.json();
        const { method, params, jsonrpc, id } = body;
        
        console.log(`[MCP] Received ${method} request:`, { method, params: params ? Object.keys(params) : 'none', id });
        
        let result;
        
        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {}
              },
              serverInfo: {
                name: 'job-matcher-mcp-server',
                version: '1.0.0',
                description: 'MCP server for job matching backend proxy'
              }
            };
            console.log('[MCP] Server initialized successfully');
            break;
            
          case 'notifications/initialized':
            // No response needed for notifications
            console.log('[MCP] Client initialized successfully');
            return new Response('', {
              status: 200,
              headers: corsHeaders
            });
            
          case 'tools/list':
            result = { 
              tools: Object.values(tools)
            };
            console.log(`[MCP] Listed ${Object.keys(tools).length} tools`);
            break;
            
          case 'tools/call':
            const { name, arguments: args } = params;
            
            // Validate tool exists
            if (!tools[name]) {
              throw new Error(`Unknown tool: ${name}. Available tools: ${Object.keys(tools).join(', ')}`);
            }
            
            console.log(`[MCP] Calling tool ${name} with args:`, Object.keys(args || {}));
            
            // Use existing validation from tools.js
            const validation = validateToolParameters(name, args || {});
            if (!validation.valid) {
              throw new Error(`Tool validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Execute the tool using the server logic
            if (name === 'match_resume') {
              const toolResult = await server.handleMatchResumeCall(args, sessionId, env);
              result = toolResult; // Already in proper MCP format
              console.log(`[MCP] Tool ${name} executed successfully`);
            } else if (name === 'match_jobs_to_apply') {
              const toolResult = await server.handleMatchJobsToApplyCall(args, sessionId, env);
              result = toolResult; // Already in proper MCP format
              console.log(`[MCP] Tool ${name} executed successfully`);
            } else {
              throw new Error(`Tool execution not implemented for: ${name}`);
            }
            break;
            
          case 'resources/list':
            result = { resources: [] };
            break;
            
          case 'prompts/list':
            result = { prompts: [] };
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }
        
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // SSE endpoint for Server-Sent Events
      if (path === '/' && request.method === 'GET') {
        // Create a readable stream for SSE
        const stream = new ReadableStream({
          start(controller) {
            // Send initial connection event
            controller.enqueue(new TextEncoder().encode('event: connected\ndata: {"type": "connected"}\n\n'));
            
            // Send ping every 30 seconds
            const interval = setInterval(() => {
              try {
                controller.enqueue(new TextEncoder().encode('event: ping\ndata: {"type": "ping"}\n\n'));
              } catch (e) {
                clearInterval(interval);
              }
            }, 30000);
            
            // Clean up on close
            request.signal.addEventListener('abort', () => {
              clearInterval(interval);
              controller.close();
            });
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders
          }
        });
      }

      // 404 for other paths
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'The requested endpoint was not found',
        available_endpoints: [
          'GET /health - Health check',
          'GET /mcp/tools - List available tools',
          'GET /mcp/tools/:name - Get specific tool metadata',
          'POST /mcp/tools/call - Execute a tool',
          'POST / - MCP Protocol endpoint',
          'GET / - SSE endpoint'
        ]
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('[Worker] Error handling request:', error);
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error.message
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};
