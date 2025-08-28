/**
 * Rate limiting module for MCP Job Matcher Server
 * Implements per-user rate limiting with 10 requests per minute
 */

class RateLimiter {
  constructor(requestsPerMinute = 10, windowSizeMs = 60000) {
    this.requestsPerMinute = requestsPerMinute;
    this.windowSizeMs = windowSizeMs;
    this.users = new Map(); // sessionId -> { requests: [], resetTime: timestamp }
  }

  /**
   * Check if a user can make a request
   * @param {string} sessionId - User session identifier
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: Date }
   */
  checkLimit(sessionId) {
    const now = Date.now();
    const userData = this.getUserData(sessionId);
    
    // Clean old requests outside the current window
    this.cleanOldRequests(userData, now);
    
    // Check if user has exceeded the limit
    if (userData.requests.length >= this.requestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(userData.resetTime),
        requestCount: userData.requests.length,
        limit: this.requestsPerMinute
      };
    }

    // Add current request
    userData.requests.push(now);
    userData.resetTime = now + this.windowSizeMs;

    return {
      allowed: true,
      remaining: this.requestsPerMinute - userData.requests.length,
      resetTime: new Date(userData.resetTime),
      requestCount: userData.requests.length,
      limit: this.requestsPerMinute
    };
  }

  /**
   * Get or create user data
   * @param {string} sessionId - User session identifier
   * @returns {Object} - User data object
   */
  getUserData(sessionId) {
    if (!this.users.has(sessionId)) {
      this.users.set(sessionId, {
        requests: [],
        resetTime: Date.now() + this.windowSizeMs
      });
    }
    return this.users.get(sessionId);
  }

  /**
   * Clean requests older than the current window
   * @param {Object} userData - User data object
   * @param {number} now - Current timestamp
   */
  cleanOldRequests(userData, now) {
    const cutoff = now - this.windowSizeMs;
    userData.requests = userData.requests.filter(timestamp => timestamp > cutoff);
    
    // Update reset time if no recent requests
    if (userData.requests.length === 0) {
      userData.resetTime = now + this.windowSizeMs;
    }
  }

  /**
   * Get current status for a user
   * @param {string} sessionId - User session identifier
   * @returns {Object} - Current rate limit status
   */
  getStatus(sessionId) {
    const userData = this.getUserData(sessionId);
    const now = Date.now();
    
    this.cleanOldRequests(userData, now);
    
    return {
      requestCount: userData.requests.length,
      remaining: this.requestsPerMinute - userData.requests.length,
      resetTime: new Date(userData.resetTime),
      limit: this.requestsPerMinute,
      windowSizeMs: this.windowSizeMs
    };
  }

  /**
   * Reset rate limit for a specific user (admin function)
   * @param {string} sessionId - User session identifier
   */
  resetUser(sessionId) {
    if (this.users.has(sessionId)) {
      this.users.delete(sessionId);
    }
  }

  /**
   * Reset all rate limits (admin function)
   */
  resetAll() {
    this.users.clear();
  }

  /**
   * Get statistics about all users
   * @returns {Object} - Statistics object
   */
  getStats() {
    const now = Date.now();
    const stats = {
      totalUsers: this.users.size,
      activeUsers: 0,
      totalRequests: 0,
      usersAtLimit: 0,
      configuration: {
        requestsPerMinute: this.requestsPerMinute,
        windowSizeMs: this.windowSizeMs
      }
    };

    for (const [sessionId, userData] of this.users) {
      this.cleanOldRequests(userData, now);
      
      if (userData.requests.length > 0) {
        stats.activeUsers++;
        stats.totalRequests += userData.requests.length;
        
        if (userData.requests.length >= this.requestsPerMinute) {
          stats.usersAtLimit++;
        }
      }
    }

    return stats;
  }

  /**
   * Clean up inactive users (housekeeping)
   * Removes users who haven't made requests in the last window
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs;
    
    for (const [sessionId, userData] of this.users) {
      this.cleanOldRequests(userData, now);
      
      // Remove users with no recent requests
      if (userData.requests.length === 0 && userData.resetTime < now) {
        this.users.delete(sessionId);
      }
    }
  }

  /**
   * Check if a specific request would be allowed without recording it
   * @param {string} sessionId - User session identifier
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: Date }
   */
  wouldAllow(sessionId) {
    const now = Date.now();
    const userData = this.getUserData(sessionId);
    
    // Create a copy to avoid modifying the original
    const tempUserData = {
      requests: [...userData.requests],
      resetTime: userData.resetTime
    };
    
    this.cleanOldRequests(tempUserData, now);
    
    return {
      allowed: tempUserData.requests.length < this.requestsPerMinute,
      remaining: Math.max(0, this.requestsPerMinute - tempUserData.requests.length),
      resetTime: new Date(tempUserData.resetTime),
      requestCount: tempUserData.requests.length,
      limit: this.requestsPerMinute
    };
  }

  /**
   * Get time until next request is allowed
   * @param {string} sessionId - User session identifier
   * @returns {number} - Milliseconds until next request allowed, 0 if already allowed
   */
  getTimeUntilReset(sessionId) {
    const status = this.wouldAllow(sessionId);
    
    if (status.allowed) {
      return 0;
    }
    
    return Math.max(0, status.resetTime.getTime() - Date.now());
  }

  /**
   * Format time remaining as human-readable string
   * @param {string} sessionId - User session identifier
   * @returns {string} - Human-readable time remaining
   */
  getTimeUntilResetFormatted(sessionId) {
    const timeMs = this.getTimeUntilReset(sessionId);
    
    if (timeMs === 0) {
      return 'Available now';
    }
    
    const seconds = Math.ceil(timeMs / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
}

// Export singleton instance with default value
// In Workers, environment variables are passed differently
export const rateLimiter = new RateLimiter(
  10, // Default rate limit
  60000 // 1 minute window
);

// Also export the class for testing
export { RateLimiter };
