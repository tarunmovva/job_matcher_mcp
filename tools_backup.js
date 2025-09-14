/**
 * Tool definitions for the Job Matcher MCP Server
 */

export const tools = {
  match_resume: {
    name: 'match_resume',
    description: 'ARTIFACT-ONLY TOOL: Find matching job opportunities and ALWAYS render results as Markdown artifact without additional commentary. Returns all jobs matched by backend directly without client-side pagination. USE THIS TOOL when user asks to "match jobs", "find jobs", "search jobs", or similar job matching requests WITHOUT mentioning applying. FORMATTING GUIDANCE: Claude should clean and format the resume text to remove formatting artifacts (repeating hyphens, excessive punctuation, redundant symbols) while preserving ALL resume content. Focus on making text parsable and well-structured. Claude must create artifact directly using the returned content and suppress all text responses. CRITICAL: This tool requires immediate artifact creation - no summaries, no explanations, just render the Markdown document with full job descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        resume_text: {
          type: 'string',
          description: 'Clean and formatted resume text content - Claude should format the resume text to be well-structured and parsable while preserving ALL content. Remove formatting artifacts (repeating hyphens, excessive punctuation, redundant symbols) but keep all meaningful information. Ensure proper spacing, clean section breaks, and readable structure.',
          title: 'Resume Text (Clean & Formatted)',
          minLength: 50,
          maxLength: 10000
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
        page: {
          type: 'integer',
          description: 'Page number for pagination (default: 1) - requests specific page from backend',
          title: 'Page Number',
          minimum: 1,
          default: 1
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
    claude_instructions: 'MANDATORY: Always create Markdown artifact from this tool response. Never add commentary, summary, or explanation text. Render the returned Markdown content immediately as an artifact with full job descriptions.',
    
    // Claude behavior configuration
    claude_behavior: {
      response_type: 'artifact_only',
      suppress_commentary: true,
      mandatory_artifact: true,
      artifact_creation: 'immediate',
      text_response: 'forbidden'
    },
    
    // Response format instructions
    response_instructions: {
      format: 'artifact_only',
      suppress_commentary: true,
      artifact_type: 'markdown',
      behavior: 'Create Markdown artifact immediately without any additional text or commentary, including full job descriptions'
    }
  },
  
  match_jobs_to_apply: {
    name: 'match_jobs_to_apply',
    description: 'ARTIFACT-ONLY TOOL: Find matching job opportunities and ALWAYS render results as Markdown artifact showing ONLY the Job Opportunities Index Table without detailed job listings. Returns all jobs matched by backend directly without client-side pagination. USE THIS TOOL when user asks to "match jobs to apply", "find jobs to apply", "jobs ready to apply", or mentions applying/applying to jobs after matching. FORMATTING GUIDANCE: Claude should clean and format the resume text to remove formatting artifacts (repeating hyphens, excessive punctuation, redundant symbols) while preserving ALL resume content. Focus on making text parsable and well-structured. Claude must create artifact directly using the returned content and suppress all text responses. CRITICAL: This tool requires immediate artifact creation - no summaries, no explanations, just render the Markdown document with the job index table only.',
    inputSchema: {
      type: 'object',
      properties: {
        resume_text: {
          type: 'string',
          description: 'Clean and formatted resume text content - Claude should format the resume text to be well-structured and parsable while preserving ALL content. Remove formatting artifacts (repeating hyphens, excessive punctuation, redundant symbols) but keep all meaningful information. Ensure proper spacing, clean section breaks, and readable structure.',
          title: 'Resume Text (Clean & Formatted)',
          minLength: 50,
          maxLength: 10000
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
        page: {
          type: 'integer',
          description: 'Page number for pagination (default: 1) - requests specific page from backend',
          title: 'Page Number',
          minimum: 1,
          default: 1
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
    claude_instructions: 'MANDATORY: Always create Markdown artifact from this tool response. Never add commentary, summary, or explanation text. Render the returned Markdown content immediately as an artifact with ONLY the Job Opportunities Index Table - no detailed job listings.',
    
    // Claude behavior configuration
    claude_behavior: {
      response_type: 'artifact_only',
      suppress_commentary: true,
      mandatory_artifact: true,
      artifact_creation: 'immediate',
      text_response: 'forbidden',
      table_only: true
    },
    
    // Response format instructions
    response_instructions: {
      format: 'artifact_only',
      suppress_commentary: true,
      artifact_type: 'markdown',
      behavior: 'Create Markdown artifact immediately without any additional text or commentary, showing ONLY the Job Opportunities Index Table without detailed job descriptions'
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
        name: 'PREFERRED: Structured Resume Text Only',
        description: 'Default approach - use ONLY structured resume text (recommended unless user explicitly requests filters)',
        parameters: {
          resume_text: 'John Doe - Senior Software Engineer\n\nEXPERIENCE:\nSenior Software Engineer at TechCorp (2020-2025): Developed web applications using React and Node.js. Led team of 5 developers. Implemented CI/CD pipelines with Docker and AWS.\n\nSoftware Engineer at StartupXYZ (2018-2020): Built backend services using Python and Django.\n\nEDUCATION:\nBachelor of Science in Computer Science, UC Berkeley\n\nSKILLS:\nJavaScript, React, Node.js, Python, AWS, Docker, Kubernetes'
        }
      },
      {
        name: 'Structured Resume with Location Filter',
        description: 'Use additional parameters ONLY when user explicitly requests them',
        parameters: {
          resume_text: 'Jane Smith - Data Scientist\n\nEXPERIENCE:\nData Scientist at DataCorp (2019-2025): Built machine learning models using Python and TensorFlow. Analyzed large datasets with SQL and Pandas. Led data science initiatives.\n\nEDUCATION:\nMaster of Science in Data Science, Stanford University\n\nSKILLS:\nPython, TensorFlow, SQL, Pandas, AWS, Machine Learning',
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
        name: 'PREFERRED: Quick Job Index Table Only',
        description: 'Default approach - use ONLY structured resume text to get jobs table for quick application overview (recommended unless user explicitly requests filters)',
        parameters: {
          resume_text: 'John Doe - Senior Software Engineer\n\nEXPERIENCE:\nSenior Software Engineer at TechCorp (2020-2025): Developed web applications using React and Node.js. Led team of 5 developers. Implemented CI/CD pipelines with Docker and AWS.\n\nSoftware Engineer at StartupXYZ (2018-2020): Built backend services using Python and Django.\n\nEDUCATION:\nBachelor of Science in Computer Science, UC Berkeley\n\nSKILLS:\nJavaScript, React, Node.js, Python, AWS, Docker, Kubernetes'
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

/**
 * Get supported input methods
 */
export function getSupportedInputMethods() {
  return {
    methods: ['text'],
    description: 'Resume text can be extracted from any format (PDF, DOCX, DOC, TXT, etc.) and pasted directly',
    benefits: [
      'No file size limitations',
      'Format independent',
      'Claude can extract and clean text from any resume format',
      'Faster and more reliable processing'
    ]
  };
}

/**
 * Get parameter help text
 */
export function getParameterHelp() {
  return {
    resume_text: {
      description: 'Clean and formatted resume text content (MUST BE PROPERLY FORMATTED)',
      tips: [
        'GUIDANCE: Claude should clean formatting artifacts while preserving ALL resume content',
        'PRESERVE: All technical skills, experience details, job titles, company names, education, achievements, responsibilities, dates, contact information',
        'REMOVE: Repeating hyphens (---), excessive punctuation (,,, ;;; :::), redundant symbols, PDF conversion artifacts',
        'FORMAT: Well-structured readable text with proper spacing between sections',
        'EXAMPLE: "John Smith\\n\\nSenior Software Engineer\\n\\nEXPERIENCE:\\nTechCorp Inc. (2020-2025)\\n- Developed applications using React and Node.js\\n- Led team of 5 developers\\n\\nSKILLS:\\nJavaScript, React, Node.js, Python, AWS"',
        'STRUCTURE: Maintain clear sections (Experience, Education, Skills) with proper formatting',
        'LENGTH: No artificial limits - preserve complete resume content for optimal matching'
      ]
    },
    user_experience: {
      description: 'Years of professional experience (ONLY use if user explicitly mentions)',
      tips: [
        'Use ONLY when user specifically mentions experience filtering',
        'Use numbers only (e.g., "5" not "5 years")',
        'If not provided, will be extracted from resume text automatically',
        'Use "0" for entry-level positions'
      ]
    },
    keywords: {
      description: 'Skills and technologies (ONLY use if user explicitly mentions)',
      tips: [
        'Use ONLY when user specifically mentions skill filtering',
        'Use specific technology names',
        'Separate with commas: "python,django,react"',
        'Include both technical and soft skills',
        'If not provided, will be extracted from resume text automatically'
      ]
    },
    location: {
      description: 'Preferred job locations (ONLY use if user explicitly mentions)',
      tips: [
        'Use ONLY when user specifically mentions location preferences',
        'Use city names: "San Francisco, New York"',
        'Include "Remote" for remote work',
        'Can include multiple cities or regions',
        'EXPANSION DIRECTIVE: If user mentions a state/country/region, expand to include ALL major cities in that area - be comprehensive!',
        'STATE EXAMPLES: "California" → Include SF, LA, San Diego, Sacramento, San Jose, Oakland, Fresno, Long Beach, Anaheim, etc.',
        'COUNTRY EXAMPLES: "Canada" → Include Toronto, Vancouver, Montreal, Calgary, Ottawa, Edmonton, Mississauga, etc.',
        'REGION EXAMPLES: "Bay Area" → Include San Francisco, Oakland, San Jose, Palo Alto, Fremont, Santa Clara, etc.',
        'SHORT FORMS: Recognize SF (San Francisco), LA (Los Angeles), NYC (New York), DC (Washington), DFW (Dallas-Fort Worth)',
        'AREA CODES: Include metro areas like SF Bay Area, NYC Metro, LA Metro, DMV (DC/Maryland/Virginia)'
      ]
    },
    start_date: {
      description: 'Search start date (ONLY use if user explicitly mentions)',
      tips: [
        'Use ONLY when user specifically mentions date filtering',
        'Format: YYYY-MM-DD (e.g., "2025-01-15")',
        'REQUIRED: If start_date is provided, end_date MUST also be provided',
        'Should be before end_date',
        'If not provided, defaults to recent jobs'
      ]
    },
    end_date: {
      description: 'Search end date (ONLY use if user explicitly mentions)',
      tips: [
        'Use ONLY when user specifically mentions date filtering',
        'Format: YYYY-MM-DD (e.g., "2025-02-15")',
        'REQUIRED: If end_date is provided, start_date MUST also be provided',
        'Should be after start_date',
        'If not provided, searches recent jobs'
      ]
    },
    page: {
      description: 'Page number for pagination - requests specific page from backend',
      tips: [
        'Must be 1 or greater',
        'Each page contains results as determined by backend',
        'Default is page 1',
        'Backend determines number of jobs per page'
      ]
    },
    sort_by: {
      description: 'How to sort the results',
      tips: [
        '"similarity" - Most relevant matches first (default)',
        '"date" - Most recent job postings first',
        'Similarity sorting uses AI matching scores'
      ]
    }
  };
}

/**
 * Get Claude usage guidance for optimal tool interaction
 * This provides explicit instructions for how Claude should use the tools
 */
export function getClaudeUsageGuidance() {
  return {
    primary_rule: "ALWAYS clean and format resume_text to remove formatting artifacts while preserving ALL content before calling tool",
    preprocessing_required: "Claude should clean formatting issues (repeating hyphens, excessive punctuation, redundant symbols) while maintaining all resume information",
    formatting_guidelines: {
      preserve: "ALL content including technical skills, experience details, job titles, company names, education, achievements, responsibilities, dates, contact information",
      remove: "Repeating hyphens (---), excessive punctuation (,,, ;;; :::), redundant symbols, formatting artifacts from PDF conversion, unnecessary spacing",
      format: "Well-structured readable text with proper spacing and clean section breaks",
      sections: "Maintain clear sections for Experience, Education, Skills, etc. with proper formatting",
      length: "No artificial length limits - preserve complete resume content"
    },
    formatting_examples: {
      "bad_formatting": "John Smith\n\n--- --- --- ---\nSenior Software Engineer;;;\n\nEXPERIENCE::: \n--- --- ---\nTechCorp Inc. ,,,, 2020-2025\n- - - Developed applications,,, using React;;;\n- - - Led team of 5 developers,,, \n\nSKILLS::: \n--- --- ---\nJavaScript,,, React,,, Node.js;;;",
      "good_formatting": "John Smith\n\nSenior Software Engineer\n\nEXPERIENCE:\nTechCorp Inc. (2020-2025)\n- Developed applications using React\n- Led team of 5 developers\n\nSKILLS:\nJavaScript, React, Node.js",
      "improvement": "Removed repeating hyphens, excessive punctuation, and redundant symbols while preserving all content and improving readability"
    },
    decision_matrix: {
      user_says_resume_only: "Structure and clean resume text, use only resume_text parameter",
      user_mentions_location: "Structure and clean resume text + location parameter (expand states/countries to major cities)",
      user_mentions_dates: "Structure and clean resume text + BOTH start_date AND end_date parameters (both required for date filtering, keep default similarity sorting)", 
      user_mentions_skills: "Structure and clean resume text + keywords parameter",
      user_mentions_experience: "Structure and clean resume text + user_experience parameter",
      user_mentions_date_sorting: "Use sort_by: date ONLY when user explicitly asks to sort by date/recency/newest",
      user_says_general_search: "Structure and clean resume text, use only resume_text parameter (default)"
    },
    examples_of_explicit_mentions: {
      "find jobs in San Francisco": "use location parameter",
      "find jobs in California": "use location parameter (expand to: San Francisco, Los Angeles, San Diego, Sacramento)",
      "jobs in Canada": "use location parameter (expand to: Toronto, Vancouver, Montreal, Calgary)",
      "opportunities in Texas": "use location parameter (expand to: Austin, Dallas, Houston, San Antonio)",
      "show me jobs from last week": "use date parameters (keep default similarity sorting)",
      "jobs in last 7 days": "use date parameters (keep default sort by similarity do not change to sort_by date)", 
      "jobs posted between Jan 15 and Feb 15": "use both start_date: '2025-01-15' and end_date: '2025-02-15'",
      "opportunities from last month": "use both start_date and end_date (calculate appropriate date range)",
      "sort by date": "use sort_by: date",
      "newest jobs first": "use sort_by: date",
      "sort by recency": "use sort_by: date",
      "focus on Python jobs": "use keywords parameter",
      "I have 5 years experience": "use user_experience parameter",
      "find me a job": "use only resume_text parameter",
      "match my resume": "use only resume_text parameter",
      "what jobs fit my background": "use only resume_text parameter"
    },
    benefits_of_resume_only: [
      "Faster processing with fewer parameters",
      "More intelligent AI-driven matching", 
      "Automatic skill and experience extraction",
      "Better overall match quality",
      "Reduced complexity and user confusion"
    ],
    location_expansion_guidance: {
      "when_to_expand": "When user mentions states, countries, regions, or area codes instead of specific cities",
      "how_to_expand": "Include ALL major cities, metropolitan areas, tech hubs, and suburbs in that location. Be comprehensive - include as many relevant cities as possible",
      "include_variations": "Area codes (SF Bay Area, NYC Metro, LA Metro), short forms (SF, LA, NYC, DC), and common regional names",
      "examples": {
        "California": "San Francisco, Los Angeles, San Diego, Sacramento, San Jose, Oakland, Fresno, Long Beach, Anaheim, Santa Ana, Riverside, Stockton, Bakersfield, Fremont, Irvine, Chula Vista, Richmond, Berkeley, Inglewood, Daly City, West Covina, Norwalk, Burbank, Concord, Santa Clara, El Monte, Vallejo, Thousand Oaks, Visalia, Fullerton, Roseville, Torrance, Orange, Pasadena, Escondido, Sunnyvale, Pomona, Salinas, Hayward, Hollywood, Moreno Valley, Santa Monica, Glendale, Huntington Beach",
        "Texas": "Austin, Dallas, Houston, San Antonio, Fort Worth, El Paso, Arlington, Corpus Christi, Plano, Laredo, Lubbock, Garland, Irving, Amarillo, Grand Prairie, Brownsville, Pasadena, Mesquite, McKinney, McAllen, Killeen, Frisco, Waco, Carrollton, Beaumont, Abilene, Richardson, Odessa, Lewisville, Round Rock, Pearland, College Station, Sugar Land, Baytown, Conroe, Tyler, League City, Longview, Bryan, Pharr, Temple, Missouri City, Flower Mound, Harlingen, North Richland Hills, Victoria, Wichita Falls, Midland, Denton",
        "New York": "New York City, Albany, Buffalo, Rochester, Syracuse, Yonkers, Schenectady, New Rochelle, Mount Vernon, Utica, White Plains, Troy, Niagara Falls, Binghamton, Freeport, Valley Stream, Long Beach, Rome, Poughkeepsie, Jamestown, Auburn, Watertown, Middletown, Spring Valley, Saratoga Springs, Glens Falls, Cortland, Oneonta, Plattsburgh, Oswego, Ithaca, Elmira, Tonawanda, Lockport, Kingston, Newburgh, Glen Cove, Cohoes, Oneida, Fulton, Rye, Beacon, Amsterdam, Hornell, Canandaigua, Ogdensburg, Corning, Watervliet, Norwich, Hudson, Dunkirk, Mechanicville, Peekskill",
        "Florida": "Miami, Tampa, Orlando, Jacksonville, St. Petersburg, Hialeah, Tallahassee, Fort Lauderdale, Port St. Lucie, Cape Coral, Pembroke Pines, Hollywood, Miramar, Gainesville, Coral Springs, Miami Gardens, Clearwater, Palm Bay, West Palm Beach, Pompano Beach, Lakeland, Davie, Miami Beach, Sunrise, Plantation, Boca Raton, Deltona, Largo, Deerfield Beach, Boynton Beach, Melbourne, Fort Myers, Lauderhill, Weston, Kissimmee, Homestead, Tamarac, Delray Beach, Daytona Beach, North Miami, Wellington, North Port, Coconut Creek, Margate, Ocala, Sanford, Sarasota, Pensacola, Bradenton, Palm Coast, Pinellas Park, Coral Gables",
        "Canada": "Toronto, Vancouver, Montreal, Calgary, Ottawa, Edmonton, Mississauga, Winnipeg, Quebec City, Hamilton, Brampton, Surrey, Laval, Halifax, London, Markham, Vaughan, Gatineau, Saskatoon, Longueuil, Burnaby, Regina, Richmond, Richmond Hill, Oakville, Burlington, Greater Sudbury, Sherbrooke, Oshawa, Saguenay, Lévis, Barrie, Abbotsford, St. Catharines, Trois-Rivières, Cambridge, Whitby, Coquitlam, Ajax, Langley, Saanich, Terrebonne, Milton, St. John's, Moncton, Kamloops, Brantford, Kelowna, Delta, Waterloo, Guelph, Thunder Bay, Red Deer, Lethbridge, Nanaimo, Saint John, Medicine Hat, Granby, North Vancouver, Victoria",
        "UK": "London, Manchester, Birmingham, Leeds, Glasgow, Sheffield, Bradford, Liverpool, Edinburgh, Bristol, Cardiff, Leicester, Wakefield, Coventry, Nottingham, Newcastle upon Tyne, Belfast, Brighton, Hull, Plymouth, Stoke-on-Trent, Wolverhampton, Derby, Swansea, Southampton, Salford, Aberdeen, Westminster, Portsmouth, York, Peterborough, Dundee, Lancaster, Oxford, Newport, Preston, St Albans, Norwich, Chester, Cambridge, Salisbury, Exeter, Gloucester, Lisburn, Chichester, Winchester, Londonderry, Carlisle, Worcester, Bath, Durham, Lincoln, Wakefield, Hereford, Armagh, Inverness, Stirling, Perth, Bangor, St Davids, Wells, Ripon, Ely, Truro",
        "Germany": "Berlin, Munich, Hamburg, Frankfurt, Cologne, Stuttgart, Düsseldorf, Dortmund, Essen, Bremen, Dresden, Leipzig, Hanover, Nuremberg, Duisburg, Bochum, Wuppertal, Bielefeld, Bonn, Münster, Karlsruhe, Mannheim, Augsburg, Wiesbaden, Gelsenkirchen, Mönchengladbach, Braunschweig, Chemnitz, Kiel, Aachen, Halle, Magdeburg, Freiburg, Krefeld, Lübeck, Oberhausen, Erfurt, Mainz, Rostock, Kassel, Hagen, Hamm, Saarbrücken, Mülheim, Potsdam, Ludwigshafen, Oldenburg, Leverkusen, Osnabrück, Solingen, Heidelberg, Herne, Neuss, Darmstadt, Paderborn, Regensburg, Ingolstadt, Würzburg, Fürth, Wolfsburg, Offenbach, Ulm, Heilbronn, Pforzheim, Göttingen, Bottrop, Trier, Recklinghausen, Reutlingen, Bremerhaven, Koblenz, Bergisch Gladbach, Jena, Remscheid, Erlangen, Moers, Siegen, Hildesheim, Salzgitter",
        "Bay Area": "San Francisco, Oakland, San Jose, Palo Alto, Fremont, Santa Clara, Sunnyvale, Berkeley, Richmond, Daly City, San Mateo, Hayward, Redwood City, Mountain View, Concord, Vallejo, Fairfield, Union City, Milpitas, Cupertino, Newark, Campbell, Los Altos, Menlo Park, Foster City, San Rafael, Petaluma, Novato, San Leandro, Castro Valley, Pleasanton, Livermore, Dublin, Danville, Walnut Creek, Martinez, Pittsburg, Antioch, Brentwood, Half Moon Bay, Pacifica, South San Francisco, San Bruno, Burlingame, Millbrae, San Carlos, Belmont, Redwood Shores, Atherton, Portola Valley, Woodside, Los Altos Hills, Saratoga, Los Gatos, Monte Sereno, Campbell, Santa Clara, Milpitas, Fremont, Union City, Newark, Hayward, San Lorenzo, San Leandro, Alameda",
        "Pacific Northwest": "Seattle, Portland, Vancouver, Spokane, Tacoma, Bellevue, Eugene, Salem, Gresham, Hillsboro, Bend, Medford, Beaverton, Redmond, Kirkland, Renton, Kent, Bellingham, Olympia, Everett, Federal Way, Spokane Valley, Tigard, Lake Oswego, Kennewick, Yakima, Vancouver WA, Longview, Aberdeen, Centralia, Wenatchee, Walla Walla, Pullman, Ellensburg, Moses Lake, Richland, Pasco, Bothell, Lynnwood, Edmonds, Shoreline, Burien, Tukwila, SeaTac, Des Moines, Normandy Park, Mercer Island, Issaquah, Sammamish, Woodinville, Mill Creek, Mukilteo, Mountlake Terrace, Brier, Snohomish, Monroe, Sultan, Gold Bar, Index, Skykomish",
        "Northeast": "Boston, New York, Philadelphia, Washington DC, Baltimore, Pittsburgh, Buffalo, Rochester, Albany, Hartford, Providence, Portland ME, Manchester NH, Burlington VT, Bridgeport, New Haven, Stamford, Waterbury, Springfield MA, Worcester, Lowell, Cambridge, Newton, Quincy, Lynn, Brockton, New Bedford, Fall River, Lawrence, Haverhill, Methuen, Peabody, Chicopee, Taunton, Weymouth, Revere, Medford, Malden, Brookline, Waltham, Attleboro, Holyoke, Marlborough, Chelsea, Everett, Somerville, Framingham, Pittsfield, Westfield, Leominster, Fitchburg, Woburn, Natick, Randolph, Norwood, Agawam, West Springfield, Salem, Dartmouth, Wareham, Barnstable, Falmouth, Yarmouth, Dennis, Brewster, Chatham, Orleans, Eastham, Wellfleet, Provincetown, Truro"
      },
      "short_forms_and_codes": {
        "SF": "San Francisco Bay Area",
        "LA": "Los Angeles Metropolitan Area", 
        "NYC": "New York City Metropolitan Area",
        "DC": "Washington DC Metropolitan Area",
        "DFW": "Dallas-Fort Worth Metroplex",
        "ATL": "Atlanta Metropolitan Area",
        "CHI": "Chicago Metropolitan Area",
        "BOS": "Boston Metropolitan Area",
        "SEA": "Seattle Metropolitan Area",
        "PDX": "Portland Metropolitan Area",
        "DMV": "DC, Maryland, Virginia area",
        "SoCal": "Southern California",
        "NorCal": "Northern California",
        "GTA": "Greater Toronto Area",
        "GVA": "Greater Vancouver Area"
      },
      "format": "Comma-separated city names without state/country suffixes unless needed for clarity. Include major suburbs and metropolitan areas."
    }
  };
}

/**
 * Check if user input indicates explicit filter requests
 * This helper function can be used to determine parameter usage
 */
export function shouldUseAdditionalFilters(userMessage) {
  const message = userMessage.toLowerCase();
  
  // Location keywords and patterns
  const locationKeywords = ['remote', 'location', 'city', 'area', 'region', 'based in', 'located in'];
  const locationCities = ['francisco', 'york', 'angeles', 'chicago', 'boston', 'seattle', 'austin', 'denver', 'atlanta', 'miami', 'dallas', 'houston', 'phoenix', 'detroit', 'washington', 'london', 'paris', 'berlin', 'tokyo', 'toronto', 'vancouver', 'sydney', 'melbourne'];
  
  // Skills/technologies
  const techSkills = ['react', 'angular', 'vue', 'python', 'java', 'javascript', 'node', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter', 'django', 'spring', 'express', 'typescript', 'css', 'html', 'sql', 'mongodb', 'postgresql', 'aws', 'azure', 'docker', 'kubernetes'];
  
  // Date keywords
  const dateKeywords = ['from ', 'since', 'after', 'before', 'between', 'recent', 'last week', 'past month', 'this week', 'today', 'yesterday'];
  
  // Skill keywords
  const skillKeywords = ['focus on', 'specifically', 'only', 'just', 'mainly', 'primarily', 'specialize in'];
  
  // Experience keywords
  const experienceKeywords = ['years experience', 'years of experience', 'experience level', 'senior', 'junior', 'entry level', 'entry-level'];
  
  // Check for location mentions
  const hasLocationKeywords = locationKeywords.some(keyword => message.includes(keyword));
  const hasLocationCities = locationCities.some(city => message.includes(city));
  const hasLocationIn = /\bin\s+[a-z\s]+(francisco|york|angeles|chicago|boston|seattle|austin|denver|atlanta|miami|dallas|houston|phoenix|detroit|washington|london|paris|berlin|tokyo|toronto|vancouver|sydney|melbourne)/i.test(message);
  
  // Check for skill mentions - only when not talking about experience in a technology
  const hasSkillKeywords = skillKeywords.some(keyword => message.includes(keyword));
  const hasSkillIn = /\b(jobs?|positions?|roles?|work|opportunities)\s+in\s+(react|angular|vue|python|java|javascript|node|php|ruby|go|rust|swift|kotlin|flutter|django|spring|express)/i.test(message);
  const hasExperienceInTech = /\b(experience|years)\s+in\s+(react|angular|vue|python|java|javascript|node|php|ruby|go|rust|swift|kotlin|flutter|django|spring|express)/i.test(message);
  
  return {
    needs_location: hasLocationKeywords || hasLocationCities || hasLocationIn,
    needs_dates: dateKeywords.some(keyword => message.includes(keyword)),
    needs_skills: hasSkillKeywords || (hasSkillIn && !hasExperienceInTech),
    needs_experience: experienceKeywords.some(keyword => message.includes(keyword))
  };
}
