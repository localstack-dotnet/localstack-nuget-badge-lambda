/**
 * Jest Integration Tests - Redirects
 * Tests redirect functionality for URL-based badge requests
 * Validates proper HTTP redirect behavior and parameter handling
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { handler } from '../../../index.mjs';
import { createMockLambdaEvent } from '../mocks/testMocks.mjs';

describe('Redirects Integration Tests', () => {
  beforeAll(() => {
    console.log('Starting Redirect Integration Tests...');
  });

  describe('Basic Redirect Functionality', () => {
    test('should redirect package badge requests to shields.io', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json', 
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toMatch(/^https:\/\/img\.shields\.io\/badge\//);
      expect(result.headers.Location).toContain('Newtonsoft.Json');
      expect(result.headers.Location).toContain('nuget');
    });

    test('should redirect with proper URL encoding', async () => {
      const event = createMockLambdaEvent({ 
        package: 'My.Special.Package', 
        source: 'nuget',
        label: 'Custom Label with Spaces' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toMatch(/^https:\/\/img\.shields\.io\/badge\//);
      expect(result.headers.Location).toContain(encodeURIComponent('My.Special.Package'));
      expect(result.headers.Location).toContain(encodeURIComponent('Custom Label with Spaces'));
    });

    test('should preserve query parameters in redirect', async () => {
      const event = createMockLambdaEvent({ 
        package: 'TestPackage', 
        source: 'nuget',
        'include-prerelease': 'true',
        track: '2',
        color: 'purple',
        style: 'flat-square' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      
      const location = result.headers.Location;
      expect(location).toContain('include-prerelease=true');
      expect(location).toContain('track=2');
      expect(location).toContain('color=purple');
      expect(location).toContain('style=flat-square');
    });

    test('should handle case-insensitive parameters', async () => {
      const event = createMockLambdaEvent({ 
        package: 'TestPackage', 
        source: 'nuget',
        includePrerelease: 'true' // camelCase
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('include-prerelease=true');
    });
  });

  describe('Path-based Redirects', () => {
    test('should handle path-based package specification', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/badge/nuget/Newtonsoft.Json',
        pathParameters: {
          source: 'nuget',
          package: 'Newtonsoft.Json'
        },
        queryStringParameters: null,
        headers: {
          'Host': 'api.example.com',
          'User-Agent': 'test-agent'
        },
        body: null,
        isBase64Encoded: false
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('Newtonsoft.Json');
      expect(result.headers.Location).toContain('nuget');
    });

    test('should handle complex path with version track', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/badge/nuget/Microsoft.AspNetCore.App',
        pathParameters: {
          source: 'nuget',
          package: 'Microsoft.AspNetCore.App'
        },
        queryStringParameters: {
          track: '2'
        },
        headers: {
          'Host': 'api.example.com',
          'User-Agent': 'test-agent'
        },
        body: null,
        isBase64Encoded: false
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('Microsoft.AspNetCore.App');
      expect(result.headers.Location).toContain('track=2');
    });

    test('should handle GitHub source in path', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/badge/github/localstack.client',
        pathParameters: {
          source: 'github',
          package: 'localstack.client'
        },
        queryStringParameters: {
          'include-prerelease': 'true'
        },
        headers: {
          'Host': 'api.example.com',
          'User-Agent': 'test-agent'
        },
        body: null,
        isBase64Encoded: false
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('localstack.client');
      expect(result.headers.Location).toContain('github');
      expect(result.headers.Location).toContain('include-prerelease=true');
    });
  });

  describe('Error Handling in Redirects', () => {
    test('should handle missing package parameter', async () => {
      const event = createMockLambdaEvent({ 
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('Package name is required');
    });

    test('should handle invalid source parameter', async () => {
      const event = createMockLambdaEvent({ 
        package: 'TestPackage',
        source: 'invalid-source' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('Invalid source');
    });

    test('should handle malformed package names', async () => {
      const event = createMockLambdaEvent({ 
        package: 'invalid/package!@#',
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      expect(result.body).toContain('Invalid package name format');
    });
  });

  describe('Special Characters and Encoding', () => {
    test('should handle packages with dots and hyphens', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Microsoft.Extensions.Configuration.Json',
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain('Microsoft.Extensions.Configuration.Json');
    });

    test('should handle custom labels with special characters', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget',
        label: 'My Package (v2.0)' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain(encodeURIComponent('My Package (v2.0)'));
    });

    test('should handle hex color codes', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget',
        color: '#ff6b35' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toContain(encodeURIComponent('#ff6b35'));
    });
  });

  describe('Cache Headers for Redirects', () => {
    test('should set appropriate cache headers for redirects', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers['Cache-Control']).toBeDefined();
      expect(result.headers['Cache-Control']).toMatch(/max-age=\d+/);
    });

    test('should handle conditional requests', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget' 
      }, '/badge');
      
      // Add conditional headers
      event.headers['If-Modified-Since'] = new Date().toUTCString();
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBeDefined();
    });
  });

  describe('Multiple Parameter Formats', () => {
    test('should handle mixed parameter casing', async () => {
      const event = createMockLambdaEvent({ 
        package: 'TestPackage',
        source: 'nuget',
        includePrerelease: 'true', // camelCase
        'prefer-clean': 'true',    // kebab-case
        Track: '2'                 // PascalCase
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      
      const location = result.headers.Location;
      expect(location).toContain('include-prerelease=true');
      expect(location).toContain('prefer-clean=true');
      expect(location).toContain('track=2');
    });

    test('should preserve parameter order', async () => {
      const event = createMockLambdaEvent({ 
        package: 'TestPackage',
        source: 'nuget',
        track: '2',
        'include-prerelease': 'true',
        color: 'blue'
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toMatch(/track=2/);
      expect(result.headers.Location).toMatch(/include-prerelease=true/);
      expect(result.headers.Location).toMatch(/color=blue/);
    });
  });

  describe('Content Type and Response Format', () => {
    test('should set appropriate response headers', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget' 
      }, '/badge');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers['Content-Type']).toBe('text/plain');
      expect(result.headers.Location).toMatch(/^https:\/\/img\.shields\.io\/badge\//);
    });

    test('should handle HEAD requests', async () => {
      const event = createMockLambdaEvent({ 
        package: 'Newtonsoft.Json',
        source: 'nuget' 
      }, '/badge');
      
      event.httpMethod = 'HEAD';
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBeDefined();
      expect(result.body).toBe('');
    });
  });
});
