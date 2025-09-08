#!/usr/bin/env node

/**
 * Security Configuration Validator
 * Validates that the MCP server is properly configured with secure environment variables
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

console.log('🔒 MCP Job Matcher Server - Security Configuration Validator\n');

let hasIssues = false;

// Check 1: API Token Configuration
console.log('1. Checking API Token Configuration...');
if (!process.env.API_AUTH_TOKEN) {
  console.log('   ❌ API_AUTH_TOKEN environment variable is not set');
  console.log('   💡 Fix: Add API_AUTH_TOKEN=Bearer your_token_here to your .env file');
  hasIssues = true;
} else if (!process.env.API_AUTH_TOKEN.startsWith('Bearer ')) {
  console.log('   ⚠️  API_AUTH_TOKEN should start with "Bearer "');
  console.log('   💡 Fix: Ensure your token format is: Bearer your_token_here');
  hasIssues = true;
} else {
  console.log('   ✅ API_AUTH_TOKEN is properly configured');
}

// Check 2: .gitignore file
console.log('\n2. Checking .gitignore configuration...');
try {
  const gitignore = readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('.env')) {
    console.log('   ✅ .env file is properly ignored in .gitignore');
  } else {
    console.log('   ❌ .env file is not in .gitignore');
    console.log('   💡 Fix: Add ".env" to your .gitignore file');
    hasIssues = true;
  }
} catch (error) {
  console.log('   ⚠️  Could not read .gitignore file');
  console.log('   💡 Recommendation: Create a .gitignore file that includes .env');
}

// Check 3: Source code validation
console.log('\n3. Checking source code for hardcoded secrets...');
try {
  const indexJs = readFileSync('index.js', 'utf8');
  const workerJs = readFileSync('src/worker.js', 'utf8');
  
  const hasHardcodedSecrets = [indexJs, workerJs].some(content => 
    content.includes('tarun_rachana') || 
    content.match(/Bearer\s+[a-zA-Z0-9_]{10,}/) ||
    content.includes('api_key') ||
    content.includes('password')
  );
  
  if (hasHardcodedSecrets) {
    console.log('   ❌ Found potential hardcoded secrets in source code');
    console.log('   💡 Fix: Remove any hardcoded tokens and use environment variables');
    hasIssues = true;
  } else {
    console.log('   ✅ No hardcoded secrets found in source code');
  }
} catch (error) {
  console.log('   ⚠️  Could not validate source code files');
}

// Check 4: Environment file safety
console.log('\n4. Checking environment file configuration...');
try {
  const envExample = readFileSync('.env.example', 'utf8');
  if (envExample.includes('tarun_rachana')) {
    console.log('   ⚠️  .env.example contains actual tokens (should use placeholders)');
    hasIssues = true;
  } else {
    console.log('   ✅ .env.example properly uses placeholders');
  }
} catch (error) {
  console.log('   ⚠️  Could not read .env.example file');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasIssues) {
  console.log('❌ SECURITY ISSUES FOUND - Please fix the issues above before deployment');
  console.log('\n📚 For detailed help, see: SECURITY.md');
  process.exit(1);
} else {
  console.log('✅ ALL SECURITY CHECKS PASSED - Server is properly configured');
  console.log('\n🚀 Your MCP server is ready for secure deployment!');
  console.log('\n📚 For deployment instructions, see: README.md');
}