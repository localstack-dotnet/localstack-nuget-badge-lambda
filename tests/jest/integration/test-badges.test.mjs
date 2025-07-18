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
      const event = createMockLambdaEvent({}, '/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      
      const data = JSON.parse(result.body);
      expect(data).toMatchObject({
        schemaVersion: 1,
        label: expect.stringMatching(/tests/i),
        message: expect.any(String),
        color: expect.stringMatching(/^(green|red|yellow|orange|lightgrey)$/),
        cacheSeconds: expect.any(Number)
      });
    }, testTimeout);

    test('should generate test badge for windows platform', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/windows');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toMatch(/test/i);
      
      // Should have valid test result message
      expect(data.message).toMatch(/^(\d+\/\d+|passed|failed|no recent runs|unknown)$/i);
    }, testTimeout);

    test('should generate test badge for macos platform', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/macos');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toMatch(/test/i);
      expect(data.message).toMatch(/^(\d+\/\d+|passed|failed|no recent runs|unknown)$/i);
    }, testTimeout);

    test('should handle non-existent platform gracefully', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Test Badge Parameter Handling', () => {
    test('should handle custom label', async () => {
      const event = createMockLambdaEvent({ 
        label: 'CI Tests' 
      }, '/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.label).toBe('CI Tests');
    }, testTimeout);

    test('should handle custom colors based on results', async () => {
      const event = createMockLambdaEvent({ 
        'success-color': 'brightgreen',
        'failure-color': 'red' 
      }, '/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      // Color should be either the custom success or failure color
      expect(['brightgreen', 'red', 'lightgrey', 'green']).toContain(data.color);
    }, testTimeout);

    test('should handle case-insensitive platform names', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/LINUX');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('color');
    }, testTimeout);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid platform names', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);

    test('should handle missing platform parameter', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);

    test('should handle empty platform name', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Gist Integration for Result Storage', () => {
    test('should handle test results stored in Gist for linux', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('color');
    }, testTimeout);

    test('should handle missing platform gracefully', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/invalid-platform');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
    }, testTimeout);
  });

  describe('Test Badge Redirects', () => {
    test('should redirect test badge requests to shields.io', async () => {
      const event = createMockLambdaEvent({}, '/badge/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toMatch(/^https:\/\/img\.shields\.io\/badge\//);
      expect(result.headers.Location).toContain('linux');
    });

    test('should preserve test badge parameters in redirect', async () => {
      const event = createMockLambdaEvent({ 
        label: 'Tests' 
      }, '/badge/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      
      const location = result.headers.Location;
      expect(location).toContain('label=Tests');
    });
  });

  describe('Performance and Caching', () => {
    test('should set appropriate cache headers for test badges', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers['Cache-Control']).toBeDefined();
      expect(result.headers['Cache-Control']).toMatch(/max-age=\d+/);
      
      const data = JSON.parse(result.body);
      expect(data.cacheSeconds).toBeGreaterThan(0);
    }, testTimeout);

    test('should complete test badge generation within reasonable time', async () => {
      const startTime = Date.now();
      
      const event = createMockLambdaEvent({}, '/test-badge/linux');
      
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
          const event = createMockLambdaEvent({}, `/test-badge/${platform}`);
          return handler(event);
        })
      );
      
      results.forEach((result, index) => {
        expect(result.statusCode).toBe(200);
        
        const data = JSON.parse(result.body);
        expect(data.message).toMatch(/^(\d+\/\d+|\d+%|\d+|passed|failed|no recent runs|unknown)$/i);
        expect(data.color).toMatch(/^(green|red|yellow|orange|lightgrey)$/);
      });
    }, testTimeout);

    test('should handle platform case variations', async () => {
      const event = createMockLambdaEvent({}, '/test-badge/Linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      
      const data = JSON.parse(result.body);
      expect(data.message).toMatch(/^(\d+\/\d+|\d+%|\d+|passed|failed|no recent runs|unknown)$/i);
    }, testTimeout);
  });
});
