import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockEvent, createMockResponse } from '../fixtures/vitestMocks.js';

// Mock the handlers to isolate router testing
vi.mock('../../src/handlers/packageHandler.mjs', () => ({
  packageHandler: {
    handle: vi.fn()
  }
}));

vi.mock('../../src/handlers/testBadgeHandler.mjs', () => ({
  testBadgeHandler: {
    handle: vi.fn()
  }
}));

vi.mock('../../src/handlers/testRedirectHandler.mjs', () => ({
  testRedirectHandler: {
    handle: vi.fn()
  }
}));

// Import after mocking
const { handler } = await import('../../src/index.mjs');
const { packageHandler } = await import('../../src/handlers/packageHandler.mjs');
const { testBadgeHandler } = await import('../../src/handlers/testBadgeHandler.mjs');
const { testRedirectHandler } = await import('../../src/handlers/testRedirectHandler.mjs');

describe('Router Logic (True Unit Tests)', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Route Matching', () => {
    it('should route test badge requests to testBadgeHandler', async () => {
      const mockEvent = createMockEvent({ proxy: 'badge/tests/linux' });
      const mockResponse = createMockResponse(200, { message: '1099 passed' });
      
      testBadgeHandler.handle.mockResolvedValue(mockResponse);

      const result = await handler(mockEvent);

      expect(testBadgeHandler.handle).toHaveBeenCalledWith(mockEvent, 'linux');
      expect(result).toEqual(mockResponse);
    });

    it('should route redirect requests to testRedirectHandler', async () => {
      const mockEvent = createMockEvent({ proxy: 'redirect/test-results/windows' });
      const mockResponse = createMockResponse(302);
      
      testRedirectHandler.handle.mockResolvedValue(mockResponse);

      const result = await handler(mockEvent);

      expect(testRedirectHandler.handle).toHaveBeenCalledWith(mockEvent, 'windows');
      expect(result).toEqual(mockResponse);
    });

    it('should route package badge requests to packageHandler', async () => {
      const mockEvent = createMockEvent({ proxy: 'badge/packages/test.package' });
      const mockResponse = createMockResponse(200, { message: '1.0.0' });
      
      packageHandler.handle.mockResolvedValue(mockResponse);

      const result = await handler(mockEvent);

      expect(packageHandler.handle).toHaveBeenCalledWith(mockEvent, 'test.package');
      expect(result).toEqual(mockResponse);
    });

    it('should route root path to packageHandler for backward compatibility', async () => {
      const mockEvent = createMockEvent({ proxy: '' });
      const mockResponse = createMockResponse(200, { message: '2.0.0' });
      
      packageHandler.handle.mockResolvedValue(mockResponse);

      const result = await handler(mockEvent);

      expect(packageHandler.handle).toHaveBeenCalledWith(mockEvent, null);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for invalid test badge platform', async () => {
      const mockEvent = createMockEvent({ proxy: 'badge/tests/invalid' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid platform. Use: linux, windows, macos'
      });
      expect(testBadgeHandler.handle).not.toHaveBeenCalled();
    });

    it('should return 404 for invalid redirect platform', async () => {
      const mockEvent = createMockEvent({ proxy: 'redirect/test-results/ubuntu' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Invalid platform. Use: linux, windows, macos'
      });
      expect(testRedirectHandler.handle).not.toHaveBeenCalled();
    });

    it('should return 404 for package badge without package name', async () => {
      const mockEvent = createMockEvent({ proxy: 'badge/packages/' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Package name required'
      });
      expect(packageHandler.handle).not.toHaveBeenCalled();
    });

    it('should return 404 for unknown routes', async () => {
      const mockEvent = createMockEvent({ proxy: 'unknown/route' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Route not found: /unknown/route'
      });
    });
  });

  describe('Platform Validation', () => {
    it('should validate valid platforms', async () => {
      const validPlatforms = ['linux', 'windows', 'macos'];
      
      for (const platform of validPlatforms) {
        const mockEvent = createMockEvent({ proxy: `badge/tests/${platform}` });
        testBadgeHandler.handle.mockResolvedValue(createMockResponse(200));
        
        await handler(mockEvent);
        
        expect(testBadgeHandler.handle).toHaveBeenCalledWith(mockEvent, platform);
      }
    });

    it('should reject invalid platforms', async () => {
      const invalidPlatforms = ['ubuntu', 'centos', 'alpine', 'invalid'];
      
      for (const platform of invalidPlatforms) {
        const mockEvent = createMockEvent({ proxy: `badge/tests/${platform}` });
        
        const result = await handler(mockEvent);
        
        expect(result.statusCode).toBe(404);
        expect(testBadgeHandler.handle).not.toHaveBeenCalled();
      }
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle case insensitive routing', async () => {
      const mockEvent = createMockEvent({ proxy: 'BADGE/TESTS/LINUX' });
      const mockResponse = createMockResponse(200);
      
      testBadgeHandler.handle.mockResolvedValue(mockResponse);

      const result = await handler(mockEvent);

      expect(testBadgeHandler.handle).toHaveBeenCalledWith(mockEvent, 'linux');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      const mockEvent = createMockEvent({ proxy: 'badge/tests/linux' });
      
      testBadgeHandler.handle.mockRejectedValue(new Error('Handler error'));

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Internal server error'
      });
    });
  });
});
