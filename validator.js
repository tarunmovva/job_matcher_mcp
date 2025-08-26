/**
 * Input validation module for the MCP Job Matcher Server
 * Validates resume text and parameters before forwarding to backend
 */

// Configuration
const CONFIG = {
  MIN_RESUME_LENGTH: 500, // Minimum characters for full resume text
  MAX_RESUME_LENGTH: 15000, // Maximum characters for full resume text (15K)
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  VALID_SORT_OPTIONS: ['similarity', 'date']
};

/**
 * Validate all inputs for the match_resume tool
 * @param {Object} args - Tool arguments
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateInputs(args) {
  const errors = [];
  
  try {
    // Validate required parameters
    const requiredValidation = validateRequiredParameters(args);
    if (!requiredValidation.valid) {
      errors.push(...requiredValidation.errors);
    }

    // Validate resume text if present
    if (args.resume_text) {
      const textValidation = validateResumeText(args.resume_text);
      if (!textValidation.valid) {
        errors.push(...textValidation.errors);
      }
    }

    // Validate optional parameters
    const paramValidation = validateOptionalParameters(args);
    if (!paramValidation.valid) {
      errors.push(...paramValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      errors: ['Internal validation error occurred']
    };
  }
}

/**
 * Validate required parameters
 */
function validateRequiredParameters(args) {
  const errors = [];

  // Check resume_text parameter
  if (!args.resume_text || args.resume_text === '') {
    errors.push('Resume text is required');
  } else if (typeof args.resume_text !== 'string') {
    errors.push('Resume text must be provided as a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate resume text content
 */
function validateResumeText(resumeText) {
  const errors = [];

  try {
    // Check length
    if (resumeText.length < CONFIG.MIN_RESUME_LENGTH) {
      errors.push(`Resume text is too short. Minimum ${CONFIG.MIN_RESUME_LENGTH} characters required`);
    }

    if (resumeText.length > CONFIG.MAX_RESUME_LENGTH) {
      errors.push(`Resume text is too long. Maximum ${CONFIG.MAX_RESUME_LENGTH} characters allowed`);
    }

    // Check if text contains meaningful content
    const meaningfulValidation = validateMeaningfulContent(resumeText);
    if (!meaningfulValidation.valid) {
      errors.push(...meaningfulValidation.errors);
    }

  } catch (error) {
    console.error('Resume text validation error:', error);
    errors.push('Unable to validate resume text content');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate that resume text contains meaningful content
 */
function validateMeaningfulContent(text) {
  const errors = [];
  
  // Remove excessive whitespace and normalize
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Check if text is mostly whitespace
  if (normalizedText.length < CONFIG.MIN_RESUME_LENGTH) {
    errors.push('Resume text contains insufficient content (too much whitespace)');
    return { valid: false, errors };
  }

  // Check for repeated characters (spam detection)
  const repeatedCharRegex = /(.)\1{20,}/; // Same character repeated 20+ times
  if (repeatedCharRegex.test(text)) {
    errors.push('Resume text contains suspicious repeated characters');
  }

  // Check for minimum word count
  const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
  if (words.length < 10) {
    errors.push('Resume text must contain at least 10 words');
  }

  // Check for some common resume sections (basic content validation)
  const commonSections = [
    'experience', 'education', 'skill', 'work', 'job', 'employment',
    'university', 'college', 'degree', 'project', 'achievement', 'responsibility'
  ];
  
  const lowerText = normalizedText.toLowerCase();
  const foundSections = commonSections.filter(section => lowerText.includes(section));
  
  if (foundSections.length === 0) {
    console.warn('Resume text may not contain typical resume content');
    // This is a warning, not an error - sometimes resumes might not contain these exact words
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate optional parameters
 */
function validateOptionalParameters(args) {
  const errors = [];

  // Validate user_experience
  if (args.user_experience !== undefined && args.user_experience !== '') {
    const experienceValidation = validateUserExperience(args.user_experience);
    if (!experienceValidation.valid) {
      errors.push(...experienceValidation.errors);
    }
  }

  // Validate keywords
  if (args.keywords !== undefined && args.keywords !== '') {
    const keywordsValidation = validateKeywords(args.keywords);
    if (!keywordsValidation.valid) {
      errors.push(...keywordsValidation.errors);
    }
  }

  // Validate location
  if (args.location !== undefined && args.location !== '') {
    const locationValidation = validateLocation(args.location);
    if (!locationValidation.valid) {
      errors.push(...locationValidation.errors);
    }
  }

  // Validate start_date
  if (args.start_date !== undefined && args.start_date !== '') {
    const startDateValidation = validateDate(args.start_date, 'start_date');
    if (!startDateValidation.valid) {
      errors.push(...startDateValidation.errors);
    }
  }

  // Validate end_date
  if (args.end_date !== undefined && args.end_date !== '') {
    const endDateValidation = validateDate(args.end_date, 'end_date');
    if (!endDateValidation.valid) {
      errors.push(...endDateValidation.errors);
    }
  }

  // Validate date range
  if (args.start_date && args.end_date && args.start_date !== '' && args.end_date !== '') {
    const dateRangeValidation = validateDateRange(args.start_date, args.end_date);
    if (!dateRangeValidation.valid) {
      errors.push(...dateRangeValidation.errors);
    }
  }

  // Validate page
  if (args.page !== undefined) {
    const pageValidation = validatePage(args.page);
    if (!pageValidation.valid) {
      errors.push(...pageValidation.errors);
    }
  }

  // Validate sort_by
  if (args.sort_by !== undefined && args.sort_by !== '') {
    const sortValidation = validateSortBy(args.sort_by);
    if (!sortValidation.valid) {
      errors.push(...sortValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user experience
 */
function validateUserExperience(experience) {
  const errors = [];
  
  if (typeof experience !== 'string') {
    errors.push('User experience must be a string');
    return { valid: false, errors };
  }

  const experienceNum = parseInt(experience);
  
  if (isNaN(experienceNum)) {
    errors.push('User experience must be a valid number');
  } else if (experienceNum < 0) {
    errors.push('User experience cannot be negative');
  } else if (experienceNum > 50) {
    errors.push('User experience seems unusually high (maximum 50 years)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate keywords
 */
function validateKeywords(keywords) {
  const errors = [];
  
  if (typeof keywords !== 'string') {
    errors.push('Keywords must be a string');
    return { valid: false, errors };
  }

  // Check length
  if (keywords.length > 500) {
    errors.push('Keywords string is too long (maximum 500 characters)');
  }

  // Validate format (comma-separated)
  const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (keywordList.length === 0) {
    errors.push('At least one keyword is required when keywords parameter is provided');
  } else if (keywordList.length > 50) {
    errors.push('Too many keywords (maximum 50)');
  }

  // Check individual keywords
  for (const keyword of keywordList) {
    if (keyword.length < 2) {
      errors.push(`Keyword "${keyword}" is too short (minimum 2 characters)`);
    } else if (keyword.length > 50) {
      errors.push(`Keyword "${keyword}" is too long (maximum 50 characters)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate location
 */
function validateLocation(location) {
  const errors = [];
  
  if (typeof location !== 'string') {
    errors.push('Location must be a string');
    return { valid: false, errors };
  }

  // Check length - increased for comprehensive location expansion
  if (location.length > 5000) {
    errors.push('Location string is too long (maximum 5000 characters)');
  }

  // Validate format (comma-separated cities)
  const locationList = location.split(',').map(l => l.trim()).filter(l => l.length > 0);
  
  if (locationList.length === 0) {
    errors.push('At least one location is required when location parameter is provided');
  } else if (locationList.length > 100) {
    errors.push('Too many locations (maximum 100)');
  }

  // Check individual locations
  for (const loc of locationList) {
    if (loc.length < 2) {
      errors.push(`Location "${loc}" is too short (minimum 2 characters)`);
    } else if (loc.length > 50) {
      errors.push(`Location "${loc}" is too long (maximum 50 characters)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date format
 */
function validateDate(dateString, fieldName) {
  const errors = [];
  
  if (typeof dateString !== 'string') {
    errors.push(`${fieldName} must be a string`);
    return { valid: false, errors };
  }

  // Check format
  if (!CONFIG.DATE_REGEX.test(dateString)) {
    errors.push(`${fieldName} must be in YYYY-MM-DD format (e.g., "2025-01-15")`);
    return { valid: false, errors };
  }

  // Check if it's a valid date
  const date = new Date(dateString + 'T00:00:00.000Z');
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (isNaN(date.getTime()) || 
      date.getUTCFullYear() !== year || 
      date.getUTCMonth() !== month - 1 || 
      date.getUTCDate() !== day) {
    errors.push(`${fieldName} is not a valid date`);
  }

  // Check reasonable date range
  const now = new Date();
  const minDate = new Date(2020, 0, 1);
  const maxDate = new Date(now.getFullYear() + 2, 11, 31);

  if (date < minDate) {
    errors.push(`${fieldName} is too far in the past (minimum: 2020-01-01)`);
  } else if (date > maxDate) {
    errors.push(`${fieldName} is too far in the future (maximum: ${maxDate.getFullYear()}-12-31)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date range
 */
function validateDateRange(startDate, endDate) {
  const errors = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start >= end) {
    errors.push('Start date must be before end date');
  }

  // Check if range is reasonable (not too long)
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    errors.push('Date range is too long (maximum 1 year)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate page number
 */
function validatePage(page) {
  const errors = [];
  
  const pageNum = parseInt(page);
  
  if (isNaN(pageNum)) {
    errors.push('Page must be a valid number');
  } else if (pageNum < 1) {
    errors.push('Page must be 1 or greater');
  } else if (pageNum > 1000) {
    errors.push('Page number is too high (maximum 1000)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate sort_by parameter
 */
function validateSortBy(sortBy) {
  const errors = [];
  
  if (typeof sortBy !== 'string') {
    errors.push('Sort_by must be a string');
    return { valid: false, errors };
  }

  if (!CONFIG.VALID_SORT_OPTIONS.includes(sortBy.toLowerCase())) {
    errors.push(`Sort_by must be one of: ${CONFIG.VALID_SORT_OPTIONS.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper functions
 */

function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot) : '';
}

function getExtensionForMimeType(mimeType) {
  const mimeToExt = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt'
  };
  return mimeToExt[mimeType] || null;
}

function isValidTextFile(buffer) {
  try {
    // Try to decode as UTF-8
    const text = buffer.toString('utf8');
    
    // Check for null bytes (indicates binary file)
    if (text.includes('\0')) {
      return false;
    }
    
    // Check if it contains mostly printable characters
    const printableChars = text.replace(/[\r\n\t]/g, '').length;
    const totalChars = text.length;
    const printableRatio = printableChars / totalChars;
    
    return printableRatio > 0.95; // At least 95% printable characters
  } catch {
    return false;
  }
}

/**
 * Sanitize and normalize parameters
 */
export function sanitizeParameters(args) {
  const sanitized = { ...args };

  // Trim string parameters
  const stringParams = ['filename', 'user_experience', 'keywords', 'location', 'start_date', 'end_date', 'sort_by'];
  stringParams.forEach(param => {
    if (sanitized[param] && typeof sanitized[param] === 'string') {
      sanitized[param] = sanitized[param].trim();
    }
  });

  // Normalize empty strings to undefined
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '') {
      sanitized[key] = undefined;
    }
  });

  // Normalize sort_by to lowercase
  if (sanitized.sort_by) {
    sanitized.sort_by = sanitized.sort_by.toLowerCase();
  }

  // Convert page to number
  if (sanitized.page) {
    sanitized.page = parseInt(sanitized.page);
  }

  return sanitized;
}

/**
 * Get validation summary
 */
export function getValidationSummary() {
  return {
    fileRequirements: {
      formats: CONFIG.SUPPORTED_EXTENSIONS,
      maxSize: `${Math.round(CONFIG.MAX_FILE_SIZE / (1024 * 1024))}MB`,
      minSize: `${CONFIG.MIN_FILE_SIZE} bytes`
    },
    parameterRequirements: {
      required: ['file', 'filename'],
      optional: ['user_experience', 'keywords', 'location', 'start_date', 'end_date', 'page', 'sort_by'],
      dateFormat: 'YYYY-MM-DD',
      sortOptions: CONFIG.VALID_SORT_OPTIONS
    }
  };
}
