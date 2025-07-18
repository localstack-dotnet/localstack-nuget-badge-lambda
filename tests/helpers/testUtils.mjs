/*──────────────────────────────────────────────────
  Test Utilities - Shared Testing Functions
──────────────────────────────────────────────────*/

import { expectedShieldResponses } from '../fixtures/sampleData.mjs';

export class TestUtils {
  
  // Validate shields.io schema compliance
  static validateShieldsSchema(data) {
    const errors = [];
    
    // Required fields
    if (typeof data.schemaVersion !== 'number' || data.schemaVersion !== 1) {
      errors.push('schemaVersion must be number 1');
    }
    if (typeof data.label !== 'string' || data.label.length === 0) {
      errors.push('label must be non-empty string');
    }
    if (typeof data.message !== 'string' || data.message.length === 0) {
      errors.push('message must be non-empty string');
    }
    if (typeof data.color !== 'string' || data.color.length === 0) {
      errors.push('color must be non-empty string');
    }
    
    // Optional fields validation
    if (data.namedLogo !== undefined && typeof data.namedLogo !== 'string') {
      errors.push('namedLogo must be string if present');
    }
    
    // Color validation (basic check for known values or hex)
    const validColors = ['blue', 'orange', 'lightgrey', 'green', 'red', 'yellow', 'purple', 'pink', 'success', 'critical'];
    const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(data.color);
    if (!validColors.includes(data.color) && !isHexColor) {
      errors.push(`color '${data.color}' should be valid color name or hex`);
    }
    
    return errors;
  }

  // Validate package badge response
  static validatePackageBadge(data) {
    const schemaErrors = this.validateShieldsSchema(data);
    const expected = expectedShieldResponses.packageBadge;
    const errors = [...schemaErrors];

    // Check required fields are present
    for (const field of expected.requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check logo validity
    if (data.namedLogo && !expected.validLogos.includes(data.namedLogo)) {
      errors.push(`Invalid logo: ${data.namedLogo}`);
    }

    return errors;
  }

  // Validate test badge response
  static validateTestBadge(data) {
    const schemaErrors = this.validateShieldsSchema(data);
    const expected = expectedShieldResponses.testBadge;
    const errors = [...schemaErrors];

    // Check required fields
    for (const field of expected.requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check label
    if (data.label !== expected.label) {
      errors.push(`Expected label '${expected.label}', got '${data.label}'`);
    }

    // Check message format
    if (!expected.validMessages.test(data.message)) {
      errors.push(`Invalid message format: '${data.message}'`);
    }

    // Check cache seconds
    if (typeof data.cacheSeconds !== 'number' || data.cacheSeconds < 0) {
      errors.push('cacheSeconds must be non-negative number');
    }

    return errors;
  }

  // Mock console.log to capture output during tests
  static mockConsole() {
    const originalLog = console.log;
    const logs = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    return {
      logs,
      restore: () => { console.log = originalLog; }
    };
  }

  // Run a test and return structured result
  static async runTest(testName, testFunction, expectedStatus = 200, validation = null) {
    console.log(`\n🧪 ${testName}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await testFunction();
      
      const success = result.statusCode === expectedStatus;
      const statusIcon = success ? '✅' : '❌';
      console.log(`${statusIcon} Status: ${result.statusCode} (expected: ${expectedStatus})`);
      
      let validationErrors = [];
      if (result.statusCode === 200 && validation) {
        const data = JSON.parse(result.body);
        validationErrors = validation(data);
        
        if (validationErrors.length === 0) {
          console.log(`✅ Validation: Passed`);
        } else {
          console.log(`❌ Validation Errors:`);
          validationErrors.forEach(error => console.log(`   • ${error}`));
        }
      }
      
      return {
        name: testName,
        success: success && validationErrors.length === 0,
        result,
        validationErrors
      };
      
    } catch (error) {
      console.log(`💥 Exception: ${error.message}`);
      return {
        name: testName,
        success: false,
        error: error.message
      };
    }
  }

  // Summarize test results
  static summarizeResults(results) {
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    const successRate = Math.round((passed / results.length) * 100);

    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${results.length}`);
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.name}: ${r.error || 'Validation failed'}`);
      });
    }

    return { passed, failed, total: results.length, successRate };
  }

  // Delay helper for rate limiting
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if running in CI environment
  static isCI() {
    return process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  }
} 