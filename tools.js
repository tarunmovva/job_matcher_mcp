/**
 * Tool definitio        resume_text: {
          type: 'string',
          description: 'WELL-FORMATTED FULL resume text (2,000-15,000 characters) - Claude should format the complete resume text with total experience at the start, removing ONLY special characters, excessive formatting symbols, and contact information while preserving ALL job-relevant content. START with "[Name] - [Title] ([Total Years] years total experience)". Keep complete work history, detailed responsibilities, technical skills, education, projects, and achievements. Remove: contact details, special characters (!@#$%^&*), excessive bullets/dashes, redundant formatting. Preserve: all job descriptions, complete skill lists, full project details, education information, certifications.',
          title: 'Resume Text (Full & Clean)',
          minLength: 500,
          maxLength: 15000
        },the Job Matcher MCP Server
 */

export const tools = {
  match_resume: {
    name: 'match_resume',
    description: 'ARTIFACT-ONLY TOOL: Find matching job opportunities and ALWAYS render results as Markdown artifact without additional commentary. PAGINATION INSTRUCTIONS: Claude must implement CLIENT-SIDE PAGINATION - show only the FIRST 15 jobs from the full response initially, then add CLIENT-SIDE text before jobs saying "Showing jobs 1-15 of [total] total matches. Type \"more jobs\" or \"next page\" to see additional opportunities." Show additional jobs only when user explicitly asks for "more jobs", "next page", "page 2", etc. USE THIS TOOL when user asks to "match jobs", "find jobs", "search jobs", or similar job matching requests WITHOUT mentioning applying. FULL RESUME FORMATTING: Claude should format the complete resume text with total experience at start, removing only special characters and contact info while preserving ALL content for better matching. LOCATION FILTERING: If user specified location constraints, Claude MUST apply client-side filtering to remove jobs that do not match the specified locations. NEVER include remote jobs unless user explicitly requested remote work. Claude must create artifact directly using the returned content and suppress all text responses. CRITICAL: This tool requires immediate artifact creation - no summaries, no explanations, just render the Markdown document with full job descriptions.',
    
    // MANDATORY PAGINATION BEHAVIOR - CLAUDE MUST FOLLOW
    PAGINATION_INSTRUCTIONS: {
      CRITICAL_RULE: "ALWAYS IMPLEMENT CLIENT-SIDE PAGINATION",
      INITIAL_DISPLAY: "Show ONLY the first 15 jobs from the full response",
      TOTAL_JOBS_DISPLAY: "Display total number of jobs and calculate total pages (total ÷ 15)",
      CLIENT_SIDE_PAGE_INFO: "Generate client-side text BEFORE the jobs content: 'Showing jobs 1-15 of [total] total matches. Type \"more jobs\" or \"next page\" to see additional opportunities.'",
      NEXT_PAGE_TRIGGER: "Show more jobs ONLY when user asks for 'more', 'next page', 'page 2', etc.",
      DO_NOT: "NEVER show all jobs at once - always paginate to 15 jobs per page",
      CLIENT_SIDE_TEXT_REQUIRED: "Claude must add pagination text before job content, not in backend data"
    },
    inputSchema: {
      type: 'object',
      properties: {
        resume_text: {
          type: 'string',
          description: 'WELL-FORMATTED FULL resume text (2,000-15,000 characters) - Claude should format the complete resume text with total experience at the start, removing ONLY special characters, excessive formatting symbols, and contact information while preserving ALL job-relevant content. START with "[Name] - [Title] ([Total Years] years total experience)". Keep complete work history, detailed responsibilities, technical skills, education, projects, and achievements. Remove: contact details, special characters (!@#$%^&*), excessive bullets/dashes, redundant formatting. Preserve: all job descriptions, complete skill lists, full project details, education information, certifications.',
          title: 'Resume Text (Full & Clean)',
          minLength: 500,
          maxLength: 15000
        },
        user_experience: {
          type: 'string',
          description: 'Years of experience (OPTIONAL - only use if explicitly mentioned by user, otherwise auto-extracted from resume)',
          title: 'Experience Years (Optional Override)'
        },
        keywords: {
          type: 'string',
          description: 'Comma-separated skills/technologies (OPTIONAL - only use if explicitly mentioned by user, otherwise auto-extracted from resume)',
          title: 'Skills & Keywords (Optional Override)',
          examples: ['python,django,react', 'java,spring,microservices', 'aws,docker,kubernetes']
        },
        location: {
          type: 'string',
          description: 'Comma-separated city names for job location preferences (OPTIONAL - only use if user explicitly requests location filtering). CRITICAL EXPANSION RULE: If user mentions a state, country, or region instead of specific cities, Claude MUST expand it to include ALL major cities, metropolitan areas, and tech hubs in that location. Include area codes and short forms when relevant. LOCATION VARIATIONS DIRECTIVE: ALWAYS include the originally mentioned term plus ALL common alternatives for ANY location type: COUNTRIES (USA/US/United States/America, UK/United Kingdom/Britain), STATES (CA/California/Cali, NY/New York State/New York, TX/Texas/Lone Star State), CITIES (SF/San Francisco/San Fran, NYC/New York City/New York/The Big Apple, LA/Los Angeles/City of Angels), REGIONS (Bay Area/SF Bay/Silicon Valley, DMV/DC Metro/Washington Area, SoCal/Southern California). Include original user term + all variations + expanded cities.',
          title: 'Preferred Locations (Optional Filter)',
          maxLength: 5000,
          examples: ['San Francisco, Austin, New York', 'London, Berlin, Amsterdam', 'Remote', 'California → CA, California, Cali + San Francisco, Los Angeles, San Diego, Sacramento, San Jose, Oakland', 'Texas → TX, Texas, Lone Star State + Austin, Dallas, Houston, San Antonio, Fort Worth', 'NYC → NYC, New York City, New York, The Big Apple + Manhattan, Brooklyn, Queens, Bronx', 'Bay Area → Bay Area, SF Bay, Silicon Valley + San Francisco, Oakland, San Jose, Palo Alto', 'USA → USA, US, United States, America + all major US cities', 'UK → UK, United Kingdom, Britain + London, Manchester, Birmingham']
        },
        start_date: {
          type: 'string',
          description: 'Start date for job search in YYYY-MM-DD format (OPTIONAL - only use if user explicitly mentions date filtering). IMPORTANT: If start_date is provided, end_date MUST also be provided to create a complete date range.',
          title: 'Search Start Date (Optional Filter)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          examples: ['2025-01-15', '2025-02-01']
        },
        end_date: {
          type: 'string',
          description: 'End date for job search in YYYY-MM-DD format (OPTIONAL - only use if user explicitly mentions date filtering). IMPORTANT: If start_date is provided, end_date MUST also be provided to create a complete date range.',
          title: 'Search End Date (Optional Filter)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          examples: ['2025-01-20', '2025-02-28']
        },
        sort_by: {
          type: 'string',
          description: 'Sort results by similarity score or publication date (OPTIONAL - ALWAYS defaults to similarity unless user explicitly requests date sorting with phrases like "sort by date", "newest first", "latest jobs", etc. DO NOT change to date sorting just because user mentions time periods like "last 7 days" - use similarity sorting to show best matches within that time period)',
          title: 'Sort Order',
          enum: ['similarity', 'date'],
          default: 'similarity'
        }
      },
      required: ['resume_text'],
      additionalProperties: false
    },
    
    // Response schema and Claude behavior instructions
    responseSchema: {
      type: 'object',
      properties: {
        artifact_required: { const: true },
        suppress_text_response: { const: true },
        artifact_type: { const: 'text/markdown' }
      },
      required: ['artifact_required', 'suppress_text_response']
    },
    
    // Explicit Claude instructions
    claude_instructions: 'MANDATORY: Always create Markdown artifact from this tool response. Never add commentary, summary, or explanation text. PAGINATION REQUIRED: Show only FIRST 15 jobs initially from the full response, ADD CLIENT-SIDE TEXT before jobs: \"Showing jobs 1-15 of [total] total matches. Type \\\"more jobs\\\" or \\\"next page\\\" to see additional opportunities.\" Show more jobs only when user asks for "next page" or "more jobs". Render the returned Markdown content immediately as an artifact with job descriptions for current page only. CRITICAL: Implement client-side pagination - do not show all jobs at once.',
    
    // Claude behavior configuration
    claude_behavior: {
      response_type: 'artifact_only',
      suppress_commentary: true,
      mandatory_artifact: true,
      artifact_creation: 'immediate',
      text_response: 'forbidden',
      pagination_mode: 'client_side',
      initial_jobs_limit: 15,
      show_total_pages: true,
      next_page_trigger: 'user_request_only'
    },
    
    // Response format instructions
    response_instructions: {
      format: 'artifact_only',
      suppress_commentary: true,
      artifact_type: 'markdown',
      behavior: 'Create Markdown artifact immediately without any additional text or commentary. PAGINATION: Show only first 15 jobs with job descriptions, ADD CLIENT-SIDE TEXT before jobs: \"Showing jobs 1-15 of [total] total matches. Type \\\"more jobs\\\" or \\\"next page\\\" to see additional opportunities.\" Show more jobs only when user requests next page.',
      pagination_instructions: 'Implement client-side pagination: 15 jobs per page, show page info, wait for user request for more',
      MANDATORY_PAGINATION: 'NEVER SHOW ALL JOBS - ALWAYS LIMIT TO 15 JOBS PER PAGE'
    }
  },
  
  match_jobs_to_apply: {
    name: 'match_jobs_to_apply',
    description: 'ARTIFACT-ONLY TOOL: Find matching job opportunities and ALWAYS render results as Markdown artifact showing ONLY the Job Opportunities Index Table without detailed job listings. PAGINATION INSTRUCTIONS: Claude must implement CLIENT-SIDE PAGINATION - show only the FIRST 15 jobs from the full response initially in the table, then add CLIENT-SIDE text before the table saying "Showing jobs 1-15 of [total] total matches. Type \"more jobs\" or \"next page\" to see additional opportunities." Show additional jobs only when user explicitly asks for "more jobs", "next page", "page 2", etc. USE THIS TOOL when user asks to "match jobs to apply", "find jobs to apply", "jobs ready to apply", or mentions applying/applying to jobs after matching. FULL RESUME FORMATTING: Claude should format the complete resume text with total experience at start, removing only special characters and contact info while preserving ALL content for better matching. LOCATION FILTERING: If user specified location constraints, Claude MUST apply client-side filtering to remove jobs that do not match the specified locations. NEVER include remote jobs unless user explicitly requested remote work. Claude must create artifact directly using the returned content and suppress all text responses. CRITICAL: This tool requires immediate artifact creation - no summaries, no explanations, just render the Markdown document with the job index table only.',
    
    // MANDATORY PAGINATION BEHAVIOR - CLAUDE MUST FOLLOW
    PAGINATION_INSTRUCTIONS: {
      CRITICAL_RULE: "ALWAYS IMPLEMENT CLIENT-SIDE PAGINATION IN TABLE",
      INITIAL_DISPLAY: "Show ONLY the first 15 jobs in the index table from the full response",
      TOTAL_JOBS_DISPLAY: "Display total number of jobs and calculate total pages (total ÷ 15)",
      CLIENT_SIDE_PAGE_INFO: "Generate client-side text BEFORE the jobs table: 'Showing jobs 1-15 of [total] total matches. Type \"more jobs\" or \"next page\" to see additional opportunities.'",
      NEXT_PAGE_TRIGGER: "Show more jobs in table ONLY when user asks for 'more', 'next page', 'page 2', etc.",
      DO_NOT: "NEVER show all jobs at once in table - always paginate to 15 jobs per page",
      CLIENT_SIDE_TEXT_REQUIRED: "Claude must add pagination text before jobs table, not in backend data"
    },
    inputSchema: {
      type: 'object',
      properties: {
        resume_text: {
          type: 'string',
          description: 'WELL-FORMATTED FULL resume text (2,000-15,000 characters) - Claude should format the complete resume text with total experience at the start, removing ONLY special characters, excessive formatting symbols, and contact information while preserving ALL job-relevant content. START with "[Name] - [Title] ([Total Years] years total experience)". Keep complete work history, detailed responsibilities, technical skills, education, projects, and achievements. Remove: contact details, special characters (!@#$%^&*), excessive bullets/dashes, redundant formatting. Preserve: all job descriptions, complete skill lists, full project details, education information, certifications.',
          title: 'Resume Text (Full & Clean)',
          minLength: 500,
          maxLength: 15000
        },
        user_experience: {
          type: 'string',
          description: 'Years of experience (OPTIONAL - only use if explicitly mentioned by user, otherwise auto-extracted from resume)',
          title: 'Experience Years (Optional Override)'
        },
        keywords: {
          type: 'string',
          description: 'Comma-separated skills/technologies (OPTIONAL - only use if explicitly mentioned by user, otherwise auto-extracted from resume)',
          title: 'Skills & Keywords (Optional Override)',
          examples: ['python,django,react', 'java,spring,microservices', 'aws,docker,kubernetes']
        },
        location: {
          type: 'string',
          description: 'Comma-separated city names for job location preferences (OPTIONAL - only use if user explicitly requests location filtering). CRITICAL EXPANSION RULE: If user mentions a state, country, or region instead of specific cities, Claude MUST expand it to include ALL major cities, metropolitan areas, and tech hubs in that location. Include area codes and short forms when relevant. LOCATION VARIATIONS DIRECTIVE: ALWAYS include the originally mentioned term plus ALL common alternatives for ANY location type: COUNTRIES (USA/US/United States/America, UK/United Kingdom/Britain), STATES (CA/California/Cali, NY/New York State/New York, TX/Texas/Lone Star State), CITIES (SF/San Francisco/San Fran, NYC/New York City/New York/The Big Apple, LA/Los Angeles/City of Angels), REGIONS (Bay Area/SF Bay/Silicon Valley, DMV/DC Metro/Washington Area, SoCal/Southern California). Include original user term + all variations + expanded cities.',
          title: 'Preferred Locations (Optional Filter)',
          maxLength: 5000,
          examples: ['San Francisco, Austin, New York', 'London, Berlin, Amsterdam', 'Remote', 'California → CA, California, Cali + San Francisco, Los Angeles, San Diego, Sacramento, San Jose, Oakland', 'Texas → TX, Texas, Lone Star State + Austin, Dallas, Houston, San Antonio, Fort Worth', 'NYC → NYC, New York City, New York, The Big Apple + Manhattan, Brooklyn, Queens, Bronx', 'Bay Area → Bay Area, SF Bay, Silicon Valley + San Francisco, Oakland, San Jose, Palo Alto', 'USA → USA, US, United States, America + all major US cities', 'UK → UK, United Kingdom, Britain + London, Manchester, Birmingham']
        },
        start_date: {
          type: 'string',
          description: 'Start date for job search in YYYY-MM-DD format (OPTIONAL - only use if user explicitly mentions date filtering). IMPORTANT: If start_date is provided, end_date MUST also be provided to create a complete date range.',
          title: 'Search Start Date (Optional Filter)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          examples: ['2025-01-15', '2025-02-01']
        },
        end_date: {
          type: 'string',
          description: 'End date for job search in YYYY-MM-DD format (OPTIONAL - only use if user explicitly mentions date filtering). IMPORTANT: If start_date is provided, end_date MUST also be provided to create a complete date range.',
          title: 'Search End Date (Optional Filter)',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          examples: ['2025-01-20', '2025-02-28']
        },
        sort_by: {
          type: 'string',
          description: 'Sort results by similarity score or publication date (OPTIONAL - ALWAYS defaults to similarity unless user explicitly requests date sorting with phrases like "sort by date", "newest first", "latest jobs", etc. DO NOT change to date sorting just because user mentions time periods like "last 7 days" - use similarity sorting to show best matches within that time period)',
          title: 'Sort Order',
          enum: ['similarity', 'date'],
          default: 'similarity'
        }
      },
      required: ['resume_text'],
      additionalProperties: false
    },
    
    // Response schema and Claude behavior instructions
    responseSchema: {
      type: 'object',
      properties: {
        artifact_required: { const: true },
        suppress_text_response: { const: true },
        artifact_type: { const: 'text/markdown' }
      },
      required: ['artifact_required', 'suppress_text_response']
    },
    
    // Explicit Claude instructions
    claude_instructions: 'MANDATORY: Always create Markdown artifact from this tool response. Never add commentary, summary, or explanation text. PAGINATION REQUIRED: Show only FIRST 15 jobs initially from the full response in the table, ADD CLIENT-SIDE TEXT before table: \"Showing jobs 1-15 of [total] total matches. Type \\\"more jobs\\\" or \\\"next page\\\" to see additional opportunities.\" Show more jobs only when user asks for "next page" or "more jobs". Render the returned Markdown content immediately as an artifact with ONLY the Job Opportunities Index Table for current page - no detailed job listings. CRITICAL: Implement client-side pagination in table - do not show all jobs at once.',
    
    // Claude behavior configuration
    claude_behavior: {
      response_type: 'artifact_only',
      suppress_commentary: true,
      mandatory_artifact: true,
      artifact_creation: 'immediate',
      text_response: 'forbidden',
      table_only: true,
      pagination_mode: 'client_side',
      initial_jobs_limit: 15,
      show_total_pages: true,
      next_page_trigger: 'user_request_only'
    },
    
    // Response format instructions
    response_instructions: {
      format: 'artifact_only',
      suppress_commentary: true,
      artifact_type: 'markdown',
      behavior: 'Create Markdown artifact immediately without any additional text or commentary. PAGINATION: Show only first 15 jobs in the index table, ADD CLIENT-SIDE TEXT before table: \"Showing jobs 1-15 of [total] total matches. Type \\\"more jobs\\\" or \\\"next page\\\" to see additional opportunities.\" Show more jobs only when user requests next page.',
      pagination_instructions: 'Implement client-side pagination: 15 jobs per page in table format, show page info, wait for user request for more',
      MANDATORY_PAGINATION: 'NEVER SHOW ALL JOBS IN TABLE - ALWAYS LIMIT TO 15 JOBS PER PAGE'
    }
  }
};

/**
 * Get tool metadata for a specific tool
 */
export function getToolMetadata(toolName) {
  return tools[toolName] || null;
}

/**
 * Validate tool parameters against schema
 */
export function validateToolParameters(toolName, params) {
  const tool = tools[toolName];
  if (!tool) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] };
  }

  const schema = tool.inputSchema;
  const errors = [];

  // Check required parameters
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in params) || params[required] === undefined || params[required] === null) {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
  }

  // Check logical dependencies for date range
  if (toolName === 'match_resume' || toolName === 'match_jobs_to_apply') {
    const hasStartDate = params.start_date && params.start_date.trim() !== '';
    const hasEndDate = params.end_date && params.end_date.trim() !== '';
    
    if (hasStartDate && !hasEndDate) {
      errors.push('When start_date is provided, end_date must also be provided to create a complete date range');
    }
    if (hasEndDate && !hasStartDate) {
      errors.push('When end_date is provided, start_date must also be provided to create a complete date range');
    }
    
    // Validate date order if both are provided
    if (hasStartDate && hasEndDate) {
      const startDate = new Date(params.start_date);
      const endDate = new Date(params.end_date);
      
      if (startDate >= endDate) {
        errors.push('start_date must be before end_date');
      }
    }
  }

  // Validate parameter types and constraints
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue; // Skip empty values for optional parameters
    }

    const propSchema = schema.properties[key];
    if (!propSchema) {
      if (!schema.additionalProperties) {
        errors.push(`Unknown parameter: ${key}`);
      }
      continue;
    }

    // Type validation
    switch (propSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter ${key} must be a string`);
          break;
        }
        
        // Pattern validation
        if (propSchema.pattern) {
          const regex = new RegExp(propSchema.pattern);
          if (!regex.test(value)) {
            errors.push(`Parameter ${key} format is invalid. Expected format: ${propSchema.pattern}`);
          }
        }
        
        // Enum validation
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`Parameter ${key} must be one of: ${propSchema.enum.join(', ')}`);
        }
        break;

      case 'integer':
        const intValue = parseInt(value);
        if (isNaN(intValue)) {
          errors.push(`Parameter ${key} must be an integer`);
          break;
        }
        
        // Minimum validation
        if (propSchema.minimum !== undefined && intValue < propSchema.minimum) {
          errors.push(`Parameter ${key} must be at least ${propSchema.minimum}`);
        }
        
        // Maximum validation
        if (propSchema.maximum !== undefined && intValue > propSchema.maximum) {
          errors.push(`Parameter ${key} must be at most ${propSchema.maximum}`);
        }
        break;

      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push(`Parameter ${key} must be a number`);
          break;
        }
        
        // Minimum validation
        if (propSchema.minimum !== undefined && numValue < propSchema.minimum) {
          errors.push(`Parameter ${key} must be at least ${propSchema.minimum}`);
        }
        
        // Maximum validation
        if (propSchema.maximum !== undefined && numValue > propSchema.maximum) {
          errors.push(`Parameter ${key} must be at most ${propSchema.maximum}`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter ${key} must be a boolean`);
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get examples for a tool
 */
export function getToolExamples(toolName) {
  const examples = {
    match_resume: [
      {
        name: 'PREFERRED: Well-Formatted Full Resume Text',
        description: 'Default approach - use ONLY well-formatted full resume text (recommended unless user explicitly requests filters)',
        parameters: {
          resume_text: 'John Doe - Senior Software Engineer (8 years total experience)\n\nPROFESSIONAL EXPERIENCE\n\nSenior Software Engineer at TechCorp (January 2020 - Present)\n- Developed and maintained scalable web applications using React, Node.js, and AWS\n- Led a cross-functional team of 5 developers in implementing microservices architecture\n- Improved application performance by 40% through code optimization and caching strategies\n- Implemented CI/CD pipelines using Docker, Jenkins, and AWS CodePipeline\n- Collaborated with product managers and designers to deliver user-centric features\n- Technologies: JavaScript, TypeScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL\n\nSoftware Engineer at StartupXYZ (March 2018 - December 2019)\n- Built robust backend services using Python, Django, and PostgreSQL\n- Designed and implemented RESTful APIs serving 10,000+ daily active users\n- Integrated third-party payment processing systems and APIs\n- Wrote comprehensive unit and integration tests achieving 90% code coverage\n- Technologies: Python, Django, PostgreSQL, Redis, Celery, REST APIs\n\nEDUCATION\nBachelor of Science in Computer Science\nUniversity of California, Berkeley\nGraduation: May 2018\n\nTECHNICAL SKILLS\nProgramming Languages: JavaScript, TypeScript, Python, Java, SQL\nFrameworks: React, Node.js, Django, Spring Boot, Express.js\nDatabases: PostgreSQL, MySQL, MongoDB, Redis\nCloud & DevOps: AWS, Docker, Kubernetes, Jenkins, CI/CD\nTools: Git, JIRA, Slack, VS Code\n\nPROJECTS\nE-commerce Platform (React/Node.js/AWS)\n- Built full-stack e-commerce application with payment processing\n- Implemented real-time inventory management and order tracking\n- Deployed on AWS with auto-scaling capabilities\n\nMachine Learning Recommendation System (Python/TensorFlow)\n- Developed collaborative filtering recommendation engine\n- Processed large datasets using pandas and scikit-learn\n- Achieved 15% improvement in user engagement metrics'
        }
      },
      {
        name: 'Well-Formatted Full Resume with Location Filter',
        description: 'Use additional parameters ONLY when user explicitly requests them',
        parameters: {
          resume_text: 'Jane Smith - Data Scientist (6 years total experience)\n\nPROFESSIONAL EXPERIENCE\n\nSenior Data Scientist at DataCorp (June 2019 - Present)\n- Built and deployed machine learning models using Python, TensorFlow, and scikit-learn\n- Analyzed large datasets with SQL, Pandas, and Apache Spark for business insights\n- Led data science initiatives resulting in 25% improvement in customer retention\n- Collaborated with engineering teams to productionize ML models at scale\n- Mentored junior data scientists and established best practices for model development\n- Technologies: Python, TensorFlow, PyTorch, SQL, Pandas, AWS, Spark, Kubernetes\n\nJunior Data Analyst at StartupABC (March 2018 - May 2019)\n- Performed statistical analysis and data visualization using Python and R\n- Created automated reporting dashboards using Tableau and PowerBI\n- Conducted A/B testing and experimental design for product features\n- Technologies: Python, R, SQL, Tableau, PowerBI, Excel\n\nEDUCATION\nMaster of Science in Data Science\nStanford University\nGraduation: December 2017\n\nTECHNICAL SKILLS\nProgramming: Python, R, SQL, Scala\nMachine Learning: TensorFlow, PyTorch, scikit-learn, Keras\nData Processing: Pandas, NumPy, Apache Spark, Dask\nVisualization: Matplotlib, Seaborn, Plotly, Tableau\nCloud: AWS, Google Cloud, Azure\n\nPROJECTS\nCustomer Churn Prediction Model\n- Developed ensemble model achieving 92% accuracy\n- Implemented feature engineering and model interpretability\n- Deployed model to production serving 1M+ predictions daily\n\nReal-time Analytics Pipeline\n- Built streaming data pipeline using Kafka and Spark\n- Processed 100K+ events per second with sub-second latency\n- Integrated with existing data warehouse and BI tools',
          location: 'San Francisco, Seattle'
        }
      },
      {
        name: 'Structured Resume with Date Range',
        description: 'Include BOTH start_date AND end_date when user specifically mentions date filtering (both are required)',
        parameters: {
          resume_text: 'Alex Johnson - Recent Computer Science Graduate\n\nEDUCATION:\nBachelor of Science in Computer Science, MIT (2024)\nGPA: 3.8/4.0\n\nPROJECTS:\nBuilt full-stack web application using React and Express. Created mobile app with React Native.\n\nSKILLS:\nJavaScript, React, Node.js, Python, Git',
          start_date: '2025-01-15',
          end_date: '2025-02-15'
        }
      }
    ],
    match_jobs_to_apply: [
      {
        name: 'PREFERRED: Job Index Table with Well-Formatted Full Resume',
        description: 'Default approach - use ONLY well-formatted full resume to get jobs table for quick application overview (recommended unless user explicitly requests filters)',
        parameters: {
          resume_text: 'John Doe - Senior Software Engineer (8 years total experience)\n\nPROFESSIONAL EXPERIENCE\n\nSenior Software Engineer at TechCorp (January 2020 - Present)\n- Developed and maintained scalable web applications using React, Node.js, and AWS\n- Led a cross-functional team of 5 developers in implementing microservices architecture\n- Improved application performance by 40% through code optimization and caching strategies\n- Implemented CI/CD pipelines using Docker, Jenkins, and AWS CodePipeline\n- Collaborated with product managers and designers to deliver user-centric features\n- Technologies: JavaScript, TypeScript, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL\n\nSoftware Engineer at StartupXYZ (March 2018 - December 2019)\n- Built robust backend services using Python, Django, and PostgreSQL\n- Designed and implemented RESTful APIs serving 10,000+ daily active users\n- Integrated third-party payment processing systems and APIs\n- Wrote comprehensive unit and integration tests achieving 90% code coverage\n- Technologies: Python, Django, PostgreSQL, Redis, Celery, REST APIs\n\nEDUCATION\nBachelor of Science in Computer Science\nUniversity of California, Berkeley\nGraduation: May 2018\n\nTECHNICAL SKILLS\nProgramming Languages: JavaScript, TypeScript, Python, Java, SQL\nFrameworks: React, Node.js, Django, Spring Boot, Express.js\nDatabases: PostgreSQL, MySQL, MongoDB, Redis\nCloud & DevOps: AWS, Docker, Kubernetes, Jenkins, CI/CD\nTools: Git, JIRA, Slack, VS Code\n\nPROJECTS\nE-commerce Platform (React/Node.js/AWS)\n- Built full-stack e-commerce application with payment processing\n- Implemented real-time inventory management and order tracking\n- Deployed on AWS with auto-scaling capabilities\n\nMachine Learning Recommendation System (Python/TensorFlow)\n- Developed collaborative filtering recommendation engine\n- Processed large datasets using pandas and scikit-learn\n- Achieved 15% improvement in user engagement metrics'
        }
      },
      {
        name: 'Job Index Table with Location Filter',
        description: 'Use additional parameters ONLY when user explicitly requests them - shows only the jobs table',
        parameters: {
          resume_text: 'Jane Smith - Data Scientist\n\nEXPERIENCE:\nData Scientist at DataCorp (2019-2025): Built machine learning models using Python and TensorFlow. Analyzed large datasets with SQL and Pandas. Led data science initiatives.\n\nEDUCATION:\nMaster of Science in Data Science, Stanford University\n\nSKILLS:\nPython, TensorFlow, SQL, Pandas, AWS, Machine Learning',
          location: 'San Francisco, Seattle'
        }
      },
      {
        name: 'Job Index Table with Date Range',
        description: 'Include BOTH start_date AND end_date when user specifically mentions date filtering (both are required) - shows only the jobs table',
        parameters: {
          resume_text: 'Alex Johnson - Recent Computer Science Graduate\n\nEDUCATION:\nBachelor of Science in Computer Science, MIT (2024)\nGPA: 3.8/4.0\n\nPROJECTS:\nBuilt full-stack web application using React and Express. Created mobile app with React Native.\n\nSKILLS:\nJavaScript, React, Node.js, Python, Git',
          start_date: '2025-01-15',
          end_date: '2025-02-15'
        }
      }
    ]
  };

  return examples[toolName] || [];
}

// ... rest of the helper functions remain the same