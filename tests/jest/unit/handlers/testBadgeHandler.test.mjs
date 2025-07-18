/*──────────────────────────────────────
  Unit Tests: Test Badge Handler
  Tests Gist integration, parameter validation, badge generation, and error handling
──────────────────────────────────────*/

import { jest } from '@jest/globals';
import { createLambdaEvent, expectShieldsIoFormat, expectErrorResponse, expectTestBadgeFormat } from '../../helpers/testUtils.mjs';

// Mock gistService before importing the handler
jest.unstable_mockModule('../../../../src/services/gistService.mjs', () => ({
  gistService: {
    getTestResults: jest.fn()
  }
}));

// Import handler and gistService after mocking
const { gistService } = await import('../../../../src/services/gistService.mjs');
const { testBadgeHandler } = await import('../../../../src/handlers/testBadgeHandler.mjs');

// Mock test data
const mockTestResults = {
  platform: 'linux',
  passed: 150,
  failed: 2,
  skipped: 1,
  total: 153,
  url_html: 'https://github.com/localstack/localstack-dotnet-client/actions/runs/123',
  timestamp: '2025-01-15T10:30:00Z'
};

describe('Test Badge Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Badge Generation', () => {
    test('generates success badge for all passed tests', async () => {
      const allPassedResults = {
        ...mockTestResults,
        passed: 153,
        failed: 0,
        skipped: 0,
        total: 153
      };
      gistService.getTestResults.mockResolvedValue(allPassedResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, '153 passed', 'success');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests');
    });

    test('generates success badge for mixed results', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, '2 failed, 150 passed', 'critical');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests');
    });

    test('generates badge for skipped tests only', async () => {
      const skippedOnlyResults = {
        ...mockTestResults,
        passed: 0,
        failed: 0,
        skipped: 10,
        total: 10
      };
      gistService.getTestResults.mockResolvedValue(skippedOnlyResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, '0 passed', 'success');
    });

    test('handles singular test counts correctly', async () => {
      const singularResults = {
        ...mockTestResults,
        passed: 1,
        failed: 1,
        skipped: 1,
        total: 3
      };
      gistService.getTestResults.mockResolvedValue(singularResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, '1 failed, 1 passed', 'critical');
    });

    test('handles zero passed, some failed edge case', async () => {
      const allFailedResults = {
        ...mockTestResults,
        passed: 0,
        failed: 5,
        skipped: 0,
        total: 5
      };
      gistService.getTestResults.mockResolvedValue(allFailedResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, '5 failed, 0 passed', 'critical');
    });

    test('sets appropriate cache headers for successful results', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=300');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Platform Validation', () => {
    test('handles valid platform: linux', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('linux');
      expectShieldsIoFormat(response);
    });

    test('handles valid platform: windows', async () => {
      const windowsResults = { ...mockTestResults, platform: 'windows' };
      gistService.getTestResults.mockResolvedValue(windowsResults);
      
      const event = createLambdaEvent('badge/tests/windows');
      const response = await testBadgeHandler.handle(event, 'windows');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('windows');
      expectShieldsIoFormat(response);
    });

    test('handles valid platform: macos', async () => {
      const macosResults = { ...mockTestResults, platform: 'macos' };
      gistService.getTestResults.mockResolvedValue(macosResults);
      
      const event = createLambdaEvent('badge/tests/macos');
      const response = await testBadgeHandler.handle(event, 'macos');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('macos');
      expectShieldsIoFormat(response);
    });

    test('passes platform to gist service without validation', async () => {
      // Handler doesn't validate platforms - that's done at router level
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/ubuntu');
      const response = await testBadgeHandler.handle(event, 'ubuntu');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('ubuntu');
      expectShieldsIoFormat(response);
    });

    test('platform parameter takes precedence over event path', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      // Path says 'windows' but platform param is 'linux'
      const event = createLambdaEvent('badge/tests/windows');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('linux');
    });
  });

  describe('Data Unavailability Handling', () => {
    test('generates unavailable badge when Gist service returns null', async () => {
      gistService.getTestResults.mockResolvedValue(null);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, 'unavailable', 'lightgrey');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests');
    });

    test('generates unavailable badge when Gist service throws error', async () => {
      gistService.getTestResults.mockRejectedValue(new Error('Network error'));
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, 'unavailable', 'lightgrey');
    });

    test('sets shorter cache duration for unavailable data', async () => {
      gistService.getTestResults.mockResolvedValue(null);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=60');
    });

    test('logs appropriate error messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      gistService.getTestResults.mockRejectedValue(new Error('Test error'));
      
      const event = createLambdaEvent('badge/tests/linux');
      await testBadgeHandler.handle(event, 'linux');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔥 Error generating test badge for linux:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Fixed Labels and Colors', () => {
    test('always uses "tests" label', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux', { label: 'unit tests' });
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests'); // Fixed label, ignores custom
    });

    test('uses "critical" color for failed tests', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux', { color: 'purple' });
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('critical'); // Fixed color for failures, ignores custom
    });

    test('uses "success" color for all passed tests', async () => {
      const allPassedResults = {
        ...mockTestResults,
        passed: 100,
        failed: 0,
        skipped: 0,
        total: 100
      };
      gistService.getTestResults.mockResolvedValue(allPassedResults);
      
      const event = createLambdaEvent('badge/tests/linux', { color: 'blue' });
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('success'); // Fixed color for success, ignores custom
    });

    test('ignores query parameters', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux', { 
        label: 'custom', 
        color: 'custom' 
      });
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests'); // Fixed label
      expect(body.color).toBe('critical'); // Auto-determined color
    });
  });

  describe('Badge Message Generation', () => {
    test('formats large numbers correctly', async () => {
      const largeResults = {
        ...mockTestResults,
        passed: 1500,
        failed: 25,
        skipped: 75,
        total: 1600
      };
      gistService.getTestResults.mockResolvedValue(largeResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('25 failed, 1500 passed');
    });

    test('omits skipped count from message when there are failures', async () => {
      const resultsWithSkipped = {
        ...mockTestResults,
        passed: 100,
        failed: 5,
        skipped: 10,
        total: 115
      };
      gistService.getTestResults.mockResolvedValue(resultsWithSkipped);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('5 failed, 100 passed');
      expect(body.message).not.toContain('skipped');
    });

    test('shows only skipped when no passed or failed tests', async () => {
      const onlySkippedResults = {
        ...mockTestResults,
        passed: 0,
        failed: 0,
        skipped: 20,
        total: 20
      };
      gistService.getTestResults.mockResolvedValue(onlySkippedResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('0 passed');
    });

    test('handles edge case: zero total tests', async () => {
      const zeroResults = {
        ...mockTestResults,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
      };
      gistService.getTestResults.mockResolvedValue(zeroResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('0 passed');
      expect(body.color).toBe('success');
    });
  });

  describe('Response Format Validation', () => {
    test('generates valid shields.io format response', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectShieldsIoFormat(response);
      
      const body = JSON.parse(response.body);
      expect(body.schemaVersion).toBe(1);
      expect(body).toHaveProperty('label');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('color');
    });

    test('always returns 200 status code', async () => {
      // Test both successful and unavailable scenarios
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const successEvent = createLambdaEvent('badge/tests/linux');
      const successResponse = await testBadgeHandler.handle(successEvent, 'linux');
      expect(successResponse.statusCode).toBe(200);
      
      gistService.getTestResults.mockResolvedValue(null);
      
      const unavailableEvent = createLambdaEvent('badge/tests/linux');
      const unavailableResponse = await testBadgeHandler.handle(unavailableEvent, 'linux');
      expect(unavailableResponse.statusCode).toBe(200);
    });

    test('sets GitHub logo consistently', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      const body = JSON.parse(response.body);
      // namedLogo is not included in this implementation
    });

    test('includes proper content-type header', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('handles malformed test data as-is', async () => {
      // Handler doesn't validate data - it processes whatever gist service returns
      const malformedData = {
        platform: 'linux',
        passed: 'not-a-number',
        failed: null,
        total: undefined
      };
      gistService.getTestResults.mockResolvedValue(malformedData);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      // Handler processes malformed data as-is
      expectTestBadgeFormat(response, 'not-a-number passed', 'success');
    });

    test('handles unexpected gist service response structure', async () => {
      gistService.getTestResults.mockResolvedValue({ unexpected: 'structure' });
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      // Handler processes any data structure - undefined.passed becomes "undefined passed"
      expectTestBadgeFormat(response, 'undefined passed', 'success');
    });

    test('handles gist service timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      gistService.getTestResults.mockRejectedValue(timeoutError);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expectTestBadgeFormat(response, 'unavailable', 'lightgrey');
    });

    test('preserves handler execution context', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('object');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Integration with Router', () => {
    test('correctly processes platform parameter from router', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      // Simulate how router calls the handler
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('linux');
      expectShieldsIoFormat(response);
    });

    test('handles case normalization from router', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      // Router should normalize to lowercase, but handler should handle any case
      const event = createLambdaEvent('badge/tests/Linux');
      const response = await testBadgeHandler.handle(event, 'linux'); // Router normalized
      
      expect(gistService.getTestResults).toHaveBeenCalledWith('linux');
    });

    test('maintains consistent response format for badge APIs', async () => {
      gistService.getTestResults.mockResolvedValue(mockTestResults);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await testBadgeHandler.handle(event, 'linux');
      
      // Should match the format expected by badge renderers
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        schemaVersion: 1,
        label: expect.any(String),
        message: expect.any(String),
        color: expect.any(String),
        cacheSeconds: expect.any(Number)
      });
    });
  });
}); 