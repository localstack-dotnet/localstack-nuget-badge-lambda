/**
 * Jest Unit Tests - Gist Service
 * Tests caching, validation, error handling, and data structure validation for GitHub Gist integration
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { gistService } from '../../../src/services/gistService.mjs';
import { createAxiosMock, createGistMockData, resetAllMocks } from '../mocks/testMocks.mjs';

// Mock axios to prevent real API calls
jest.unstable_mockModule('axios', () => ({
  default: createAxiosMock()
}));

describe('Gist Service - Unit Tests', () => {
  let axiosMock;

  beforeEach(async () => {
    resetAllMocks();
    const axios = (await import('axios')).default;
    axiosMock = axios;
  });

  describe('Platform Validation', () => {
    test('should accept valid platforms', async () => {
      const validPlatforms = ['linux', 'windows', 'macos'];
      
      for (const platform of validPlatforms) {
        axiosMock.get.mockResolvedValueOnce(createGistMockData(platform));
        
        const result = await gistService.getTestResults(platform);
        
        expect(result).toBeDefined();
        expect(result.platform).toBe(platform);
        expect(result.passed).toBeGreaterThanOrEqual(0);
        expect(result.total).toBeGreaterThanOrEqual(0);
      }
    });

    test('should reject invalid platforms', async () => {
      const invalidPlatforms = ['invalid', 'ubuntu', 'alpine', '', null, undefined];
      
      for (const platform of invalidPlatforms) {
        await expect(gistService.getTestResults(platform))
          .rejects
          .toThrow('Invalid platform');
      }
    });

    test('should handle case insensitive platforms', async () => {
      const testCases = [
        { input: 'LINUX', expected: 'linux' },
        { input: 'Windows', expected: 'windows' },
        { input: 'MacOS', expected: 'macos' }
      ];
      
      for (const testCase of testCases) {
        axiosMock.get.mockResolvedValueOnce(createGistMockData(testCase.expected));
        
        const result = await gistService.getTestResults(testCase.input);
        
        expect(result.platform).toBe(testCase.expected);
      }
    });
  });

  describe('Data Structure Validation', () => {
    test('should return expected data structure', async () => {
      axiosMock.get.mockResolvedValueOnce(createGistMockData('linux'));
      
      const result = await gistService.getTestResults('linux');
      
      expect(result).toMatchObject({
        platform: expect.any(String),
        passed: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
        total: expect.any(Number),
        url_html: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('should handle missing optional fields gracefully', async () => {
      const incompleteData = {
        data: {
          files: {
            'test-results-linux.json': {
              content: JSON.stringify({
                passed: 100,
                total: 100
                // Missing fields: failed, skipped, url_html, timestamp
              })
            }
          }
        }
      };
      
      axiosMock.get.mockResolvedValueOnce(incompleteData);
      
      const result = await gistService.getTestResults('linux');
      
      expect(result.passed).toBe(100);
      expect(result.total).toBe(100);
      expect(result.failed).toBe(0); // Should default to 0
      expect(result.skipped).toBe(0); // Should default to 0
    });
  });

  describe('Caching Behavior', () => {
    test('should cache results and avoid duplicate API calls', async () => {
      axiosMock.get.mockResolvedValueOnce(createGistMockData('linux'));
      
      // First call
      const result1 = await gistService.getTestResults('linux');
      expect(axiosMock.get).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await gistService.getTestResults('linux');
      expect(axiosMock.get).toHaveBeenCalledTimes(1); // Still 1, not 2
      
      expect(result1).toEqual(result2);
    });

    test('should cache different platforms separately', async () => {
      axiosMock.get
        .mockResolvedValueOnce(createGistMockData('linux'))
        .mockResolvedValueOnce(createGistMockData('windows'));
      
      const linuxResult = await gistService.getTestResults('linux');
      const windowsResult = await gistService.getTestResults('windows');
      
      expect(axiosMock.get).toHaveBeenCalledTimes(2);
      expect(linuxResult.platform).toBe('linux');
      expect(windowsResult.platform).toBe('windows');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      axiosMock.get.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(gistService.getTestResults('linux'))
        .rejects
        .toThrow('Network error');
    });

    test('should handle 404 errors', async () => {
      const error404 = new Error('Request failed with status code 404');
      error404.response = { status: 404 };
      axiosMock.get.mockRejectedValueOnce(error404);
      
      await expect(gistService.getTestResults('linux'))
        .rejects
        .toThrow('404');
    });

    test('should handle malformed JSON gracefully', async () => {
      const malformedData = {
        data: {
          files: {
            'test-results-linux.json': {
              content: 'invalid-json{'
            }
          }
        }
      };
      
      axiosMock.get.mockResolvedValueOnce(malformedData);
      
      await expect(gistService.getTestResults('linux'))
        .rejects
        .toThrow();
    });

    test('should handle missing file in gist', async () => {
      const missingFileData = {
        data: {
          files: {
            'other-file.txt': { content: 'not what we want' }
          }
        }
      };
      
      axiosMock.get.mockResolvedValueOnce(missingFileData);
      
      await expect(gistService.getTestResults('linux'))
        .rejects
        .toThrow();
    });
  });

  describe('Performance Considerations', () => {
    test('should handle concurrent requests efficiently', async () => {
      axiosMock.get.mockResolvedValue(createGistMockData('linux'));
      
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        gistService.getTestResults('linux')
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should return the same cached result
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
      
      // Should be fast due to caching
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should only make one API call due to caching
      expect(axiosMock.get).toHaveBeenCalledTimes(1);
    });
  });
});
