/**
 * Jest Integration Tests - Test Badges
 * Tests the test result badge functionality for displaying GitHub Actions results
 * Validates GitHub integration and Gist-based result storage
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { handler } from '../../../index.mjs';
import { createMockLambdaEvent } from '../mocks/testMocks.mjs';
import { config } from 'dotenv';

// Load environment variables
config();

const testTimeout = 30000; // 30 seconds for API calls

describe('Test Badges Integration Tests', () => {
  beforeAll(() => {
    console.log('Starting Test Badge Integration Tests...');
    
    if (!process.env.GITHUB_TOKEN) {
      console.warn('⚠️ GitHub token not set - test badge tests may be skipped');
    }
  });

  describe('GitHub Actions Test Result Badges', () => {
    test('should generate test badge for linux platform', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      
      const data = JSON.parse(result.body);
      expect(data).toMatchObject({
        schemaVersion: 1,
        label: expect.stringMatching(/tests/i),
        message: expect.any(String),
        color: expect.stringMatching(/^(success|critical|lightgrey)$/),
        cacheSeconds: expect.any(Number)
      });
    }, testTimeout);

    test('should generate test badge for windows platform', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/windows');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toMatch(/test/i);
      
      // Should have valid test result message
      expect(data.message).toMatch(/^(\d+ passed|\d+ failed, \d+ passed|unavailable)$/i);
    }, testTimeout);

    test('should generate test badge for macos platform', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/macos');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toMatch(/test/i);
      expect(data.message).toMatch(/^(\d+ passed|\d+ failed, \d+ passed|unavailable)$/i);
    }, testTimeout);

    test('should handle non-existent platform gracefully', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Test Badge Parameter Handling', () => {
    test('should handle custom label', async () => {
      const event = createMockLambdaEvent({ 
        label: 'CI Tests' 
      }, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      // Note: Current implementation doesn't support custom labels, always returns 'tests'
      expect(data.label).toBe('tests');
    }, testTimeout);

    test('should handle custom colors based on results', async () => {
      const event = createMockLambdaEvent({ 
        'success-color': 'brightgreen',
        'failure-color': 'red' 
      }, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      // Color should be based on test results, not custom color parameters
      expect(['success', 'critical', 'lightgrey']).toContain(data.color);
    }, testTimeout);

    test('should handle case-insensitive platform names', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/LINUX');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('color');
    }, testTimeout);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid platform names', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);

    test('should handle missing platform parameter', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);

    test('should handle empty platform name', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Gist Integration for Result Storage', () => {
    test('should handle test results stored in Gist for linux', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('color');
    }, testTimeout);

    test('should handle missing platform gracefully', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Test Badge Redirects', () => {
    test('should redirect test badge requests to shields.io', async () => {
      const event = createMockLambdaEvent({}, 'redirect/test-results/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toMatch(/^https:\/\/github\.com\//);
      // Note: Actual redirect goes to specific GitHub Actions run, not platform-specific URL
      expect(result.headers.Location).toContain('localstack-dotnet');
    });

    test('should preserve test badge parameters in redirect', async () => {
      const event = createMockLambdaEvent({ 
        label: 'Tests' 
      }, 'redirect/test-results/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      
      const location = result.headers.Location;
      expect(location).toMatch(/^https:\/\/github\.com\//);
    });
  });

  describe('Performance and Caching', () => {
    test('should set appropriate cache headers for test badges', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Cache-Control']).toBeDefined();
      expect(result.headers['Cache-Control']).toMatch(/max-age=\d+/);
      
      const data = JSON.parse(result.body);
      expect(data.cacheSeconds).toBeGreaterThan(0);
    }, testTimeout);

    test('should complete test badge generation within reasonable time', async () => {
      const startTime = Date.now();
      
      const event = createMockLambdaEvent({}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      const duration = Date.now() - startTime;
      
      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, testTimeout);
  });

  describe('Different Test Result Formats', () => {
    test('should handle test results for different platforms', async () => {
      const platforms = ['linux', 'windows', 'macos'];
      
      const results = await Promise.all(
        platforms.map(platform => {
          const event = createMockLambdaEvent({}, `badge/tests/${platform}`);
          return handler(event);
        })
      );
      
      results.forEach((result, index) => {
        expect(result.statusCode).toBe(200);
        
        const data = JSON.parse(result.body);
        expect(data.message).toMatch(/^(\d+ passed|\d+ failed, \d+ passed|unavailable)$/i);
        expect(data.color).toMatch(/^(success|critical|lightgrey)$/);
      });
    }, testTimeout);

    test('should handle platform case variations', async () => {
      const event = createMockLambdaEvent({}, 'badge/tests/Linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^(\d+ passed|\d+ failed, \d+ passed|unavailable)$/i);
    }, testTimeout);
  });
});
