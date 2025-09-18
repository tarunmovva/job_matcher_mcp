# 🔧 Technical Architecture Documentation

## 🏗️ System Architecture Deep Dive

### Core Components Architecture

```mermaid
graph TB
    subgraph "MCP Protocol Layer"
        MCP_CORE[MCP Server Core]
        TRANSPORT[Transport Layer]
        PROTOCOL[JSON-RPC Handler]
    end
    
    subgraph "Business Logic Layer"
        TOOL_REGISTRY[Tool Registry]
        VALIDATION[Input Validation]
        PROCESSING[Request Processing]
        FORMATTING[Response Formatting]
    end
    
    subgraph "Infrastructure Layer"
        RATE_LIMIT[Rate Limiting]
        SECURITY[Security Validation]
        LOGGING[Logging & Monitoring]
        ERROR_HANDLING[Error Handling]
    end
    
    subgraph "Integration Layer"
        HTTP_CLIENT[HTTP Client]
        API_WRAPPER[Backend API Wrapper]
        DATA_TRANSFORM[Data Transformation]
    end
    
    subgraph "External Dependencies"
        JOB_BACKEND[Job Board Backend]
        AI_ENGINE[AI Matching Engine]
        JOB_DATABASE[(Job Database)]
    end
    
    MCP_CORE --> TRANSPORT
    MCP_CORE --> PROTOCOL
    PROTOCOL --> TOOL_REGISTRY
    TOOL_REGISTRY --> VALIDATION
    VALIDATION --> PROCESSING
    PROCESSING --> RATE_LIMIT
    RATE_LIMIT --> SECURITY
    SECURITY --> HTTP_CLIENT
    HTTP_CLIENT --> API_WRAPPER
    API_WRAPPER --> JOB_BACKEND
    JOB_BACKEND --> AI_ENGINE
    AI_ENGINE --> JOB_DATABASE
    JOB_BACKEND --> DATA_TRANSFORM
    DATA_TRANSFORM --> FORMATTING
    FORMATTING --> PROTOCOL
    
    style MCP_CORE fill:#e1f5fe
    style TOOL_REGISTRY fill:#f3e5f5
    style JOB_BACKEND fill:#fff3e0
    style AI_ENGINE fill:#e8f5e8
```

## 🔄 Request Processing Pipeline

### Full Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> RequestReceived
    RequestReceived --> ProtocolValidation
    ProtocolValidation --> ToolIdentification
    
    ToolIdentification --> match_resume : Tool: match_resume
    ToolIdentification --> match_jobs_to_apply : Tool: match_jobs_to_apply
    
    match_resume --> ParameterValidation
    match_jobs_to_apply --> ParameterValidation
    
    ParameterValidation --> ValidationFailed : Invalid Parameters
    ParameterValidation --> RateLimitCheck : Valid Parameters
    
    ValidationFailed --> ErrorResponse
    
    RateLimitCheck --> RateLimitExceeded : Limit Exceeded
    RateLimitCheck --> RequestProcessing : Within Limit
    
    RateLimitExceeded --> ErrorResponse
    
    RequestProcessing --> BackendAPICall
    BackendAPICall --> APISuccess : 200 OK
    BackendAPICall --> APIError : 4xx/5xx
    
    APIError --> ErrorResponse
    
    APISuccess --> DataTransformation
    DataTransformation --> MarkdownFormatting
    
    MarkdownFormatting --> FullJobListings : match_resume
    MarkdownFormatting --> TableOnlyIndex : match_jobs_to_apply
    
    FullJobListings --> ArtifactCreation
    TableOnlyIndex --> ArtifactCreation
    
    ArtifactCreation --> SuccessResponse
    
    ErrorResponse --> [*]
    SuccessResponse --> [*]
```

## 🛠️ Tool Implementation Details

### Tool Schema Architecture

```mermaid
classDiagram
    class Tool {
        +string name
        +string description
        +Object inputSchema
        +Object responseSchema
        +Object claudeInstructions
        +validateParameters()
        +execute()
    }
    
    class MatchResumeTool {
        +string name = "match_resume"
        +Object paginationInstructions
        +Object claudeBehavior
        +handleRequest()
        +formatFullResponse()
    }
    
    class MatchJobsToApplyTool {
        +string name = "match_jobs_to_apply"
        +Object paginationInstructions
        +Object claudeBehavior
        +handleRequest()
        +formatTableResponse()
    }
    
    class InputValidator {
        +validateResumeText()
        +validateOptionalParams()
        +validateDateRange()
        +sanitizeInputs()
    }
    
    class RateLimiter {
        +Map requests
        +checkLimit(sessionId)
        +getStatus(sessionId)
        +cleanup()
    }
    
    Tool <|-- MatchResumeTool
    Tool <|-- MatchJobsToApplyTool
    Tool --> InputValidator
    Tool --> RateLimiter
```

### Parameter Validation Flow

```mermaid
flowchart TD
    A[Raw Parameters] --> B{Required Params Present?}
    B -->|No| C[Missing Required Error]
    B -->|Yes| D[Validate Resume Text]
    
    D --> E{Text Length Valid?}
    E -->|No| F[Length Validation Error]
    E -->|Yes| G{Meaningful Content?}
    
    G -->|No| H[Content Validation Error]
    G -->|Yes| I[Validate Optional Params]
    
    I --> J{Location Format Valid?}
    J -->|No| K[Location Format Error]
    J -->|Yes| L{Keywords Format Valid?}
    
    L -->|No| M[Keywords Format Error]
    L -->|Yes| N{Date Range Valid?}
    
    N -->|No| O[Date Range Error]
    N -->|Yes| P{Sort Option Valid?}
    
    P -->|No| Q[Sort Option Error]
    P -->|Yes| R[Sanitize Parameters]
    
    R --> S[Validation Success]
    
    C --> T[Return Validation Errors]
    F --> T
    H --> T
    K --> T
    M --> T
    O --> T
    Q --> T
    
    style S fill:#e8f5e8
    style T fill:#ffebee
```

## 🎯 Backend Integration Architecture

### API Communication Pattern

```mermaid
sequenceDiagram
    participant MCP as MCP Server
    participant VAL as Validator
    participant RL as Rate Limiter
    participant HTTP as HTTP Client
    participant BACKEND as Job Board API
    participant AI as AI Engine
    participant DB as Job Database
    
    MCP->>VAL: Validate resume_text + params
    VAL-->>MCP: Validation result
    
    MCP->>RL: Check rate limit for session
    RL-->>MCP: Rate limit status
    
    MCP->>HTTP: Create FormData request
    Note over HTTP: Convert resume_text to file blob<br/>Add optional parameters
    
    HTTP->>BACKEND: POST /server/match-resume-upload
    Note over BACKEND: Authorization: Bearer token<br/>Content-Type: multipart/form-data
    
    BACKEND->>AI: Process resume content
    AI->>DB: Query job matches
    DB-->>AI: Job candidates
    AI-->>BACKEND: Scored matches
    
    BACKEND-->>HTTP: JSON response
    Note over BACKEND: {<br/>  matches: [...],<br/>  total_matches: 150,<br/>  extracted_skills: [...],<br/>  resume_processing: {...}<br/>}
    
    HTTP-->>MCP: Parsed JSON data
    MCP->>MCP: Transform to Markdown artifact
    MCP-->>VAL: Formatted response
```

### Data Transformation Pipeline

```mermaid
flowchart LR
    A[Raw Backend JSON] --> B[Parse Response]
    B --> C[Extract Metadata]
    C --> D[Transform Job Objects]
    D --> E[Calculate Display Fields]
    E --> F[Apply Formatting Rules]
    F --> G{Tool Type}
    
    G -->|match_resume| H[Full Job Descriptions]
    G -->|match_jobs_to_apply| I[Table Index Only]
    
    H --> J[Generate Comprehensive Markdown]
    I --> K[Generate Table-Only Markdown]
    
    J --> L[Create Artifact JSON]
    K --> L
    
    L --> M[Return to Client]
    
    style A fill:#fff3e0
    style D fill:#e3f2fd
    style L fill:#e8f5e8
```

## 🌐 Deployment Architecture

### Multi-Environment Deployment

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_NODE[Node.js stdio]
        DEV_HTTP[Express HTTP Server]
        DEV_ENV[.env config]
    end
    
    subgraph "Testing Environment"
        TEST_HTTP[HTTP Server]
        TEST_MCP[MCP Remote Testing]
        TEST_ENV[Test .env]
    end
    
    subgraph "Production Environments"
        PROD_STDIO[Claude Desktop stdio]
        PROD_HTTP[Production HTTP]
        PROD_WORKERS[Cloudflare Workers]
    end
    
    subgraph "Configuration Management"
        ENV_VARS[Environment Variables]
        SECRETS[Secret Management]
        CONFIG_VAL[Configuration Validation]
    end
    
    subgraph "External Services"
        JOB_API[Job Board API]
        CDN[Global CDN]
        MONITORING[Monitoring Services]
    end
    
    DEV_NODE --> DEV_ENV
    DEV_HTTP --> DEV_ENV
    
    TEST_HTTP --> TEST_ENV
    TEST_MCP --> TEST_HTTP
    
    PROD_STDIO --> ENV_VARS
    PROD_HTTP --> ENV_VARS
    PROD_WORKERS --> SECRETS
    
    ENV_VARS --> CONFIG_VAL
    SECRETS --> CONFIG_VAL
    CONFIG_VAL --> JOB_API
    
    PROD_WORKERS --> CDN
    CDN --> MONITORING
    
    style PROD_WORKERS fill:#ff6f00,color:#fff
    style JOB_API fill:#4caf50,color:#fff
    style SECRETS fill:#f44336,color:#fff
```

## 🔒 Security Architecture

### Security Layers

```mermaid
graph TD
    subgraph "Input Security"
        INPUT_VAL[Input Validation]
        PARAM_CLEAN[Parameter Sanitization]
        CONTENT_VAL[Content Validation]
    end
    
    subgraph "Authentication & Authorization"
        API_AUTH[API Token Authentication]
        BEARER_VAL[Bearer Token Validation]
        SECRET_MGMT[Secret Management]
    end
    
    subgraph "Rate Limiting & DDoS Protection"
        RATE_LIMIT[Per-User Rate Limiting]
        SESSION_TRACK[Session Tracking]
        ABUSE_DETECT[Abuse Detection]
    end
    
    subgraph "Data Security"
        DATA_ENCRYPT[Data Encryption in Transit]
        NO_PERSIST[No Data Persistence]
        TEMP_CLEAN[Temporary Data Cleanup]
    end
    
    subgraph "Infrastructure Security"
        CORS_POLICY[CORS Policy]
        HEADER_SEC[Security Headers]
        ENV_ISOLATION[Environment Isolation]
    end
    
    INPUT_VAL --> PARAM_CLEAN
    PARAM_CLEAN --> CONTENT_VAL
    CONTENT_VAL --> RATE_LIMIT
    
    API_AUTH --> BEARER_VAL
    BEARER_VAL --> SECRET_MGMT
    
    RATE_LIMIT --> SESSION_TRACK
    SESSION_TRACK --> ABUSE_DETECT
    
    DATA_ENCRYPT --> NO_PERSIST
    NO_PERSIST --> TEMP_CLEAN
    
    CORS_POLICY --> HEADER_SEC
    HEADER_SEC --> ENV_ISOLATION
    
    style API_AUTH fill:#f44336,color:#fff
    style RATE_LIMIT fill:#ff9800,color:#fff
    style DATA_ENCRYPT fill:#2196f3,color:#fff
```

## 📊 Performance Architecture

### Performance Optimization Strategy

```mermaid
flowchart TB
    subgraph "Request Optimization"
        REQ_CACHE[Request Caching]
        PARAM_OPT[Parameter Optimization]
        BATCH_PROC[Batch Processing]
    end
    
    subgraph "Response Optimization"
        RESP_COMPRESS[Response Compression]
        MARKDOWN_OPT[Markdown Optimization]
        ARTIFACT_CACHE[Artifact Caching]
    end
    
    subgraph "Backend Optimization"
        CONN_POOL[Connection Pooling]
        TIMEOUT_MGMT[Timeout Management]
        RETRY_LOGIC[Retry Logic]
    end
    
    subgraph "Infrastructure Optimization"
        EDGE_CACHE[Edge Caching]
        CDN_DIST[CDN Distribution]
        REGIONAL_DEPLOY[Regional Deployment]
    end
    
    subgraph "Monitoring & Metrics"
        PERF_METRICS[Performance Metrics]
        RESPONSE_TIME[Response Time Tracking]
        ERROR_RATES[Error Rate Monitoring]
    end
    
    REQ_CACHE --> PARAM_OPT
    PARAM_OPT --> BATCH_PROC
    
    RESP_COMPRESS --> MARKDOWN_OPT
    MARKDOWN_OPT --> ARTIFACT_CACHE
    
    CONN_POOL --> TIMEOUT_MGMT
    TIMEOUT_MGMT --> RETRY_LOGIC
    
    EDGE_CACHE --> CDN_DIST
    CDN_DIST --> REGIONAL_DEPLOY
    
    PERF_METRICS --> RESPONSE_TIME
    RESPONSE_TIME --> ERROR_RATES
    
    style EDGE_CACHE fill:#4caf50,color:#fff
    style RESP_COMPRESS fill:#2196f3,color:#fff
    style PERF_METRICS fill:#ff9800,color:#fff
```

## 🧩 Component Integration Matrix

### Inter-Component Dependencies

| Component | Dependencies | Provides | Consumers |
|-----------|-------------|----------|-----------|
| **MCP Server Core** | Transport, Protocol | Tool Registry, Request Routing | Claude Desktop, HTTP Clients |
| **Tool Registry** | Validation Schemas | Tool Definitions, Execution | MCP Server Core |
| **Input Validator** | Validation Rules | Parameter Validation | Tool Handlers |
| **Rate Limiter** | Session Storage | Rate Limit Enforcement | Tool Handlers |
| **Markdown Formatter** | Template Engine | Artifact Generation | Tool Handlers |
| **HTTP Client** | Fetch API, FormData | Backend Communication | Tool Handlers |
| **Security Validator** | Environment Config | Security Validation | Deployment Process |

### Data Flow Integration

```mermaid
graph LR
    subgraph "Input Processing"
        A[Raw Request] --> B[Protocol Parser]
        B --> C[Tool Router]
        C --> D[Parameter Validator]
    end
    
    subgraph "Business Logic"
        D --> E[Rate Limiter]
        E --> F[Tool Handler]
        F --> G[Backend Client]
    end
    
    subgraph "Output Processing"
        G --> H[Response Parser]
        H --> I[Data Transformer]
        I --> J[Markdown Formatter]
        J --> K[Artifact Builder]
    end
    
    subgraph "Response Delivery"
        K --> L[Protocol Encoder]
        L --> M[Transport Layer]
        M --> N[Client Response]
    end
    
    style A fill:#ffcdd2
    style F fill:#c8e6c9
    style K fill:#bbdefb
    style N fill:#d1c4e9
```

## 🔄 Scalability Considerations

### Horizontal Scaling Architecture

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Load Balancer]
        HEALTH[Health Checks]
    end
    
    subgraph "Application Layer"
        APP1[MCP Server Instance 1]
        APP2[MCP Server Instance 2]
        APP3[MCP Server Instance N]
    end
    
    subgraph "Shared Services"
        RATE_STORE[Rate Limit Store]
        CONFIG_STORE[Configuration Store]
        METRICS_STORE[Metrics Collection]
    end
    
    subgraph "Backend Services"
        BACKEND_LB[Backend Load Balancer]
        BACKEND1[Job API Instance 1]
        BACKEND2[Job API Instance 2]
    end
    
    LB --> HEALTH
    LB --> APP1
    LB --> APP2
    LB --> APP3
    
    APP1 --> RATE_STORE
    APP2 --> RATE_STORE
    APP3 --> RATE_STORE
    
    APP1 --> CONFIG_STORE
    APP2 --> CONFIG_STORE
    APP3 --> CONFIG_STORE
    
    APP1 --> METRICS_STORE
    APP2 --> METRICS_STORE
    APP3 --> METRICS_STORE
    
    APP1 --> BACKEND_LB
    APP2 --> BACKEND_LB
    APP3 --> BACKEND_LB
    
    BACKEND_LB --> BACKEND1
    BACKEND_LB --> BACKEND2
    
    style LB fill:#ff9800,color:#fff
    style RATE_STORE fill:#2196f3,color:#fff
    style BACKEND_LB fill:#4caf50,color:#fff
```

This technical architecture documentation provides a comprehensive deep-dive into the system's design, implementation patterns, and deployment strategies. The diagrams illustrate the complex interactions between components and help developers understand the system's behavior at scale.