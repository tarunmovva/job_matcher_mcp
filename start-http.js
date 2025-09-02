#!/usr/bin/env node

/**
 * HTTP Server Starter for Job Matcher MCP Server
 * Creates an HTTP API wrapper around the MCP server
 */

import express from 'express';
import cors from 'cors';
import { JobMatcherMCPServer } from './index.js';
import { tools, validateToolParameters, getToolMetadata } from './tools.js';
import { rateLimiter } from './rateLimiter.js';
import { validateInputs } from './validator.js';

// Set environment variables for HTTP mode
process.env.TRANSPORT = 'http';
process.env.PORT = process.env.PORT || '3000';

const app = express();
const port = parseInt(process.env.PORT);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Create MCP server instance
const mcpServer = new JobMatcherMCPServer();

// MCP Protocol Handler - enhanced with existing tooling
async function handleMCPRequest(req, res) {
  try {
    const { method, params, jsonrpc, id } = req.body;
    
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
        return res.status(200).end();
        
      case 'tools/list':
        // Use the tools from tools.js with all metadata
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
        
        // Rate limiting check (use IP as session ID for HTTP)
        const sessionId = req.ip || req.connection.remoteAddress || 'http-client';
        const rateLimitResult = rateLimiter.checkLimit(sessionId);
        if (!rateLimitResult.allowed) {
          // Return rate limit error directly from the server
          const errorResult = await mcpServer.formatRateLimitError(rateLimitResult);
          result = {
            content: [{
              type: 'text',
              text: errorResult
            }]
          };
          break;
        }
        
        // Execute the tool using the existing server logic
        if (name === 'match_resume') {
          const toolResult = await mcpServer.handleMatchResumeCall(args);
          result = toolResult; // Already in proper MCP format
          console.log(`[MCP] Tool ${name} executed successfully`);
        } else {
          throw new Error(`Tool execution not implemented for: ${name}`);
        }
        break;
        
      case 'resources/list':
        // Return empty resources list
        result = { resources: [] };
        break;
        
      case 'prompts/list':
        // Return empty prompts list  
        result = { prompts: [] };
        break;
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    
    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
    
  } catch (error) {
    console.error('[MCP] Error handling request:', error);
    res.json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
}

// MCP Protocol endpoint - what mcp-remote expects
app.post('/', handleMCPRequest);

// SSE endpoint for Server-Sent Events (alternative transport)
app.get('/', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send initial connection event
  res.write('event: connected\n');
  res.write('data: {"type": "connected"}\n\n');
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write('event: ping\n');
    res.write('data: {"type": "ping"}\n\n');
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

// Health check endpoint (keep existing)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Job Matcher MCP Server',
    version: '1.0.0',
    transport: 'HTTP',
    timestamp: new Date().toISOString()
  });
});

// Enhanced MCP tool listing endpoint with full metadata
app.get('/mcp/tools', async (req, res) => {
  try {
    res.json({
      tools: Object.values(tools),
      count: Object.keys(tools).length,
      metadata: {
        server: 'job-matcher-mcp-server',
        version: '1.0.0',
        transport: 'HTTP'
      }
    });
  } catch (error) {
    console.error('Tools listing error:', error);
    res.status(500).json({ 
      error: 'Failed to list tools',
      details: error.message 
    });
  }
});

// Enhanced tool metadata endpoint
app.get('/mcp/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const toolMetadata = getToolMetadata(toolName);
    
    if (!toolMetadata) {
      return res.status(404).json({
        error: 'Tool not found',
        available: Object.keys(tools)
      });
    }
    
    res.json({
      tool: toolMetadata,
      metadata: {
        server: 'job-matcher-mcp-server',
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Tool metadata error:', error);
    res.status(500).json({ 
      error: 'Failed to get tool metadata',
      details: error.message 
    });
  }
});

// Enhanced MCP tool execution endpoint with validation and rate limiting
app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    
    // Validate tool exists
    if (!tools[name]) {
      return res.status(400).json({ 
        error: 'Unknown tool',
        details: `Tool '${name}' not found`,
        available: Object.keys(tools)
      });
    }

    // Use existing validation from tools.js
    const validation = validateToolParameters(name, args || {});
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Tool validation failed',
        details: validation.errors,
        tool: name,
        received_args: Object.keys(args || {})
      });
    }

    // Rate limiting check (use IP as session ID for HTTP)
    const sessionId = req.ip || req.connection.remoteAddress || 'http-client';
    const rateLimitResult = rateLimiter.checkLimit(sessionId);
    if (!rateLimitResult.allowed) {
      const errorResult = await mcpServer.formatRateLimitError(rateLimitResult);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Too many requests, please wait',
        result: errorResult,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
        remaining: rateLimitResult.remaining
      });
    }

    // Call the MCP server's tool handler directly
    const result = await mcpServer.handleMatchResumeCall(args);
    
    // Extract the content from MCP response format
    const content = result.content?.[0]?.text || result.content || result;
    
    res.json({
      result: content,
      tool: name,
      metadata: {
        server: 'job-matcher-mcp-server',
        version: '1.0.0',
        transport: 'HTTP',
        rateLimitRemaining: rateLimitResult.remaining
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({ 
      error: 'Tool execution failed',
      details: error.message,
      tool: req.body?.name || 'unknown'
    });
  }
});

// Start the HTTP server
app.listen(port, () => {
  console.log(`🚀 Job Matcher MCP HTTP Server started!`);
  console.log(`📡 Server running on: http://localhost:${port}`);
  console.log(`🔗 MCP Protocol Endpoints (for Claude Desktop via mcp-remote):`);
  console.log(`   - POST /                    - MCP JSON-RPC endpoint (initialize, tools/list, tools/call)`);
  console.log(`   - GET  /                    - MCP SSE endpoint (alternative transport)`);
  console.log(`🔗 Enhanced API Endpoints:`);
  console.log(`   - GET  /health              - Health check`);
  console.log(`   - GET  /mcp/tools           - List tools with full metadata`);
  console.log(`   - GET  /mcp/tools/:name     - Get specific tool metadata`);
  console.log(`   - POST /mcp/tools/call      - Execute tool with validation & rate limiting`);
  console.log(`🛡️  Built-in Features:`);
  console.log(`   - ✅ Rate limiting (${process.env.RATE_LIMIT_PER_MINUTE || 10} requests/minute)`);
  console.log(`   - ✅ Input validation using tools.js schemas`);
  console.log(`   - ✅ Error handling with Markdown artifacts`);
  console.log(`   - ✅ CORS support for web clients`);
  console.log(`🧪 Test Commands:`);
  console.log(`   npx mcp-remote http://localhost:${port}  (Claude Desktop integration)`);
  console.log(`   curl http://localhost:${port}/health      (Health check)`);
  console.log(`   curl http://localhost:${port}/mcp/tools   (List available tools)`);
});
