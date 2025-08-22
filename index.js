import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { tools } from './tools.js';
import { rateLimiter } from './rateLimiter.js';
import { validateInputs } from './validator.js';
import { formatMarkdownResponse, formatTableOnlyMarkdownResponse } from './markdownFormatter.js';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'https://job-board-aggregator.onrender.com',
  BACKEND_ENDPOINT: process.env.BACKEND_ENDPOINT || '/server/match-resume-upload',
  API_TOKEN: process.env.API_AUTH_TOKEN || (() => {
    throw new Error('API_AUTH_TOKEN environment variable is required. Please set it in your .env file or environment.');
  })(),
  RATE_LIMIT_PER_MINUTE: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 10,
  PORT: parseInt(process.env.PORT) || 3000,
  TRANSPORT: process.env.TRANSPORT || 'stdio', // 'stdio' or 'http'
  MAX_FILE_SIZE: 50000, // 50K characters to match validator.js
  MIN_FILE_SIZE: 50, // 50 chars to match validator.js
  TIMEOUT: 30000 // 30 seconds
};

/**
 * MCP Server for Job Matching Backend
 * Acts as a proxy between Claude Desktop and the job matching backend
 */
class JobMatcherMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'job-matcher',
        version: '1.0.0',
        description: 'MCP server for job matching backend proxy'
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP server handlers
   */
  setupHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.values(tools)
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'match_resume') {
        try {
          return await this.handleMatchResumeCall(args);
        } catch (error) {
          console.error('Tool call error:', error);
          throw error;
        }
      } else if (name === 'match_jobs_to_apply') {
        try {
          return await this.handleMatchJobsToApplyCall(args);
        } catch (error) {
          console.error('Tool call error:', error);
          throw error;
        }
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Handle match_resume tool call
   */
  async handleMatchResumeCall(args) {
    const sessionId = this.getSessionId();
    
    try {
      // Apply rate limiting
      const rateLimitResult = rateLimiter.checkLimit(sessionId);
      if (!rateLimitResult.allowed) {
        return {
          content: [{
            type: 'text',
            text: this.formatRateLimitError(rateLimitResult)
          }]
        };
      }

      // Validate inputs
      const validation = validateInputs(args);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: this.formatValidationError(validation.errors)
          }]
        };
      }

      // Call backend API
      const backendResponse = await this.callBackendAPI(args);
      
      // Format response as Markdown artifact - return all jobs from backend directly
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
          text: this.formatError(error)
        }]
      };
    }
  }

  /**
   * Handle match_jobs_to_apply tool call - returns only the job index table
   */
  async handleMatchJobsToApplyCall(args) {
    const sessionId = this.getSessionId();
    
    try {
      // Apply rate limiting
      const rateLimitResult = rateLimiter.checkLimit(sessionId);
      if (!rateLimitResult.allowed) {
        return {
          content: [{
            type: 'text',
            text: this.formatRateLimitError(rateLimitResult)
          }]
        };
      }

      // Validate inputs
      const validation = validateInputs(args);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: this.formatValidationError(validation.errors)
          }]
        };
      }

      // Call backend API (same backend call as match_resume)
      const backendResponse = await this.callBackendAPI(args);
      
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
          text: this.formatError(error)
        }]
      };
    }
  }

  /**
   * Call backend API with resume text
   */
  async callBackendAPI(args) {
    const formData = new FormData();
    
    // Handle resume text by creating a text file
    const resumeBuffer = Buffer.from(args.resume_text, 'utf8');
    formData.append('file', resumeBuffer, {
      filename: 'resume.txt',
      contentType: 'text/plain'
    });

    // Add optional parameters - pass directly to backend
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
        'Authorization': CONFIG.API_TOKEN,
        'Accept': 'application/json',
        ...formData.getHeaders()
      },
      body: formData,
      timeout: CONFIG.TIMEOUT
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }

      throw new BackendError(response.status, errorData);
    }

    return await response.json();
  }

  /**
   * Get session ID for rate limiting
   */
  getSessionId() {
    // In a real implementation, this would come from the MCP context
    // For now, use a default session ID
    return 'claude-desktop-session';
  }

  /**
   * Format rate limit error as Markdown artifact
   */
  formatRateLimitError(rateLimitResult) {
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

*Job Matcher v1.0 - Powered by MCP Server*`;

    return JSON.stringify({
      // Explicit artifact creation flags
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      
      // Artifact specification
      artifact_type: "text/markdown",
      artifact_id: `rate-limit-error-${Date.now()}`,
      artifact_title: "Rate Limit Exceeded",
      content: markdownContent,
      
      // Validation and performance indicators
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

  /**
   * Format validation error as Markdown artifact
   */
  formatValidationError(errors) {
    const errorData = {
      type: 'validation',
      errors: errors
    };

    const markdownContent = `# ❌ Input Validation Failed

Please fix the following issues and try again:

## Validation Errors

${errorData.errors.map(error => `- ${error}`).join('\n')}

Please correct these issues and retry your request.

---

*Job Matcher v1.0 - Powered by MCP Server*`;

    return JSON.stringify({
      // Explicit artifact creation flags
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      
      // Artifact specification
      artifact_type: "text/markdown",
      artifact_id: `validation-error-${Date.now()}`,
      artifact_title: "Input Validation Failed",
      content: markdownContent,
      
      // Validation and performance indicators
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

  /**
   * Format general error as Markdown artifact
   */
  formatError(error) {
    let title = 'Request Failed';
    let message = 'An unexpected error occurred while processing your request.';
    let suggestions = [];
    let technicalDetails = '';

    if (error instanceof BackendError) {
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

    const errorData = {
      title,
      message,
      suggestions,
      technicalDetails,
      status: error instanceof BackendError ? error.status : 'unknown'
    };

    let markdownContent = `# ⚠️ ${errorData.title}\n\n`;
    markdownContent += `${errorData.message}\n\n`;
    
    if (errorData.suggestions.length > 0) {
      markdownContent += `## 💡 Troubleshooting Tips\n\n`;
      errorData.suggestions.forEach(suggestion => {
        markdownContent += `- ✓ ${suggestion}\n`;
      });
      markdownContent += `\n`;
    }
    
    if (errorData.technicalDetails) {
      markdownContent += `## 🔧 Technical Details\n\n`;
      markdownContent += `\`\`\`\n${errorData.technicalDetails}\n\`\`\`\n\n`;
    }
    
    markdownContent += `**Status Code:** ${errorData.status}\n\n`;
    markdownContent += `---\n\n`;
    markdownContent += `*Job Matcher v1.0 - Powered by MCP Server*`;

    return JSON.stringify({
      // Explicit artifact creation flags
      please_render_as_artifact: true,
      artifact_required: true,
      artifact_command: "create",
      response_type: "artifact_only",
      instruction: "MUST_CREATE_MARKDOWN_ARTIFACT",
      fallback_behavior: "error_if_no_artifact",
      
      // Artifact specification
      artifact_type: "text/markdown",
      artifact_id: `error-${Date.now()}`,
      artifact_title: title,
      content: markdownContent,
      
      // Validation and performance indicators
      validation: {
        artifact_creation_required: true,
        content_type_validation: "markdown",
        error_handling_mode: "readable"
      },
      performance: {
        size_optimized: true,
        readable_format: true,
        error_type: errorData.status
      }
    }, null, 2);
  }

  /**
   * Start the MCP server
   */
  async start() {
    // Only stdio transport for now - HTTP handled by separate Express server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✅ Job Matcher MCP Server running (stdio transport)');
  }
}

/**
 * Custom error class for backend API errors
 */
class BackendError extends Error {
  constructor(status, data) {
    super(`Backend API error: ${status}`);
    this.name = 'BackendError';
    this.status = status;
    this.data = data;
  }
}

// Start the server if this file is run directly
// Use pathToFileURL for proper Windows path handling
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = new JobMatcherMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Handle process signals
  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

export { JobMatcherMCPServer };
