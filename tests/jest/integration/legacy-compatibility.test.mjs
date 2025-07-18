/**
 * Jest Integration Tests - Legacy Compatibility
 * Ensures 100% backward compatibility with existing package badge functionality
 * These tests use real APIs and are critical for deployment validation
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { handler } from '../../../index.mjs'; // Use the root proxy
import { createMockLambdaEvent } from '../mocks/testMocks.mjs';
import { config } from 'dotenv';

// Load environment variables
config();

const validatePackageBadge = (data) => {
  const errors = [];
  
  if (!data.schemaVersion || data.schemaVersion !== 1) {
    errors.push('Should have schemaVersion: 1');
  }
  
  if (!data.label || typeof data.label !== 'string') {
    errors.push('Should have valid label');
  }
  
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Should have valid message');
  }
  
  if (!data.color || typeof data.color !== 'string') {
    errors.push('Should have valid color');
  }
  
  return errors;
};

const testTimeout = 30000; // 30 seconds for API calls

describe('Legacy Compatibility Integration Tests', () => {
  beforeAll(() => {
    // Verify we have necessary environment setup
    if (!process.env.GITHUB_TOKEN) {
      console.warn('⚠️ GitHub token not set - some tests may be skipped');
    }
  });

  describe('Core Package Badge Functionality', () => {
    test('should handle basic NuGet package', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json', 
        source: 'nuget' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      const validationErrors = validatePackageBadge(data);
      expect(validationErrors).toHaveLength(0);
      
      expect(data.message).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
      expect(data.color).toBe('blue'); // Stable release
      expect(data.label).toMatch(/newtonsoft\.json.*nuget/i);
    }, testTimeout);

    test('should handle ASP.NET Core with track filtering', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.AspNetCore.App', 
        source: 'nuget', 
        track: '2' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      const validationErrors = validatePackageBadge(data);
      expect(validationErrors).toHaveLength(0);
      
      expect(data.message).toMatch(/^2\./); // Should start with 2.x
      expect(data.color).toBe('blue');
    }, testTimeout);

    test('should handle LocalStack v1 track', async () => {
      const event = createMockLambdaEvent({ 
        package: 'localstack.client', 
        source: 'nuget', 
        track: '1' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      const validationErrors = validatePackageBadge(data);
      expect(validationErrors).toHaveLength(0);
      
      expect(data.message).toMatch(/^1\./); // Should be 1.x version
      expect(data.color).toBe('blue');
    }, testTimeout);

    test('should handle prerelease packages', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.EntityFrameworkCore', 
        source: 'nuget', 
        'include-prerelease': 'true' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      const validationErrors = validatePackageBadge(data);
      expect(validationErrors).toHaveLength(0);
      
      expect(data.color).toBe('orange'); // Prerelease should be orange
    }, testTimeout);
  });

  describe('Parameter Variations', () => {
    test('should handle camelCase includePrerelease', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.EntityFrameworkCore', 
        source: 'nuget', 
        includePrerelease: 'true' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.color).toBe('orange');
    }, testTimeout);

    test('should handle lowercase includeprerelease', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.EntityFrameworkCore', 
        source: 'nuget', 
        includeprerelease: 'true' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.color).toBe('orange');
    }, testTimeout);

    test('should handle v1 format flexibility', async () => {
      const event = createMockLambdaEvent({ 
        package: 'localstack.client', 
        source: 'nuget', 
        track: 'v1' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^1\./);
    }, testTimeout);
  });

  describe('Semver Range Filtering', () => {
    test('should handle gte filtering', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.AspNetCore.App', 
        source: 'nuget', 
        gte: '2.0.0' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^2\./);
    }, testTimeout);

    test('should handle combined range filters', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.AspNetCore.App', 
        source: 'nuget', 
        gte: '2.0.0',
        lt: '3.0.0' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^2\./);
    }, testTimeout);

    test('should handle partial version coercion', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.AspNetCore.App', 
        source: 'nuget', 
        gte: '2.0',
        lt: '3.0' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^2\./);
    }, testTimeout);
  });

  describe('Customization Features', () => {
    test('should handle custom label and color', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json', 
        source: 'nuget', 
        label: 'JSON.NET',
        color: 'purple' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toBe('JSON.NET');
      expect(data.color).toBe('purple');
    }, testTimeout);

    test('should handle hex color', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json', 
        source: 'nuget', 
        color: '#ff6b35' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.color).toBe('#ff6b35');
    }, testTimeout);
  });

  describe('Error Handling', () => {
    test('should handle non-existent package', async () => {
      const event = createMockLambdaEvent({ 
        package: 'definitely-does-not-exist-12345', 
        source: 'nuget' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toBe('not found');
      expect(data.color).toBe('lightgrey');
    }, testTimeout);

    test('should reject invalid package names', async () => {
      const event = createMockLambdaEvent({ 
        package: 'invalid/package/name!', 
        source: 'nuget' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      
      const data = JSON.parse(result.body);
      expect(data.error).toContain('Invalid package name format');
    }, testTimeout);

    test('should require package parameter', async () => {
      const event = createMockLambdaEvent({ 
        source: 'nuget' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      
      const data = JSON.parse(result.body);
      expect(data.error).toContain('Package name is required');
    }, testTimeout);

    test('should reject invalid source', async () => {
      const event = createMockLambdaEvent({ 
        package: 'test.package', 
        source: 'invalid-source' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      
      const data = JSON.parse(result.body);
      expect(data.error).toContain('Invalid source');
    }, testTimeout);
  });

  describe('GitHub Package Integration', () => {
    test('should handle GitHub packages with prereleases', async () => {
      const event = createMockLambdaEvent({ 
        package: 'localstack.client', 
        source: 'github',
        'include-prerelease': 'true' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.schemaVersion).toBe(1);
      
      // GitHub packages may not exist, so handle both cases
      if (data.message !== 'not found') {
        expect(data.color).toBe('orange'); // Should be prerelease
      }
    }, testTimeout);

    test('should handle GitHub prefer-clean option', async () => {
      const event = createMockLambdaEvent({ 
        package: 'localstack.client', 
        source: 'github',
        'include-prerelease': 'true',
        'prefer-clean': 'true' 
      });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.schemaVersion).toBe(1);
    }, testTimeout);
  });
});
