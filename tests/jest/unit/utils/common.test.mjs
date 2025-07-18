/*──────────────────────────────────────
  Unit Tests: Common Utilities
  Tests response builders, validation helpers, and utility functions
──────────────────────────────────────*/

import { 
  createSuccessResponse, 
  createNotFoundResponse, 
  createErrorResponse,
  create404Response,
  create400Response,
  createTestBadgeResponse,
  createRedirectResponse,
  createDefaultLabel,
  determineColor,
  validateAndCoerceVersion,
  parseTrackWithValidation,
  extractPlatform,
  isValidPlatform
} from '../../../../src/utils/common.mjs';

import { expectShieldsIoFormat, expectErrorResponse } from '../../helpers/testUtils.mjs';

describe('Common Utilities', () => {
  
  describe('Success Response Builder', () => {
    test('creates shields.io compatible response with all required fields', () => {
      const response = createSuccessResponse('1.2.3', 'test.package', 'nuget');
      
      expectShieldsIoFormat(response);
      
      const body = JSON.parse(response.body);
      expect(body.schemaVersion).toBe(1);
      expect(body.label).toBe('test.package nuget');
      expect(body.message).toBe('1.2.3');
      expect(body.color).toBe('blue'); // Stable version
      expect(body.namedLogo).toBe('nuget');
    });

    test('uses custom label when provided', () => {
      const response = createSuccessResponse('1.2.3', 'test.package', 'nuget', 'Custom Label');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('Custom Label');
    });

    test('uses custom color when provided', () => {
      const response = createSuccessResponse('1.2.3', 'test.package', 'nuget', null, 'purple');
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('purple');
    });

    test('determines color automatically for stable versions', () => {
      const response = createSuccessResponse('2.1.4', 'test.package', 'nuget');
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('blue');
    });

    test('determines color automatically for prerelease versions', () => {
      const response = createSuccessResponse('2.0.0-preview1', 'test.package', 'nuget');
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('orange');
    });

    test('sets GitHub logo for GitHub source', () => {
      const response = createSuccessResponse('1.2.3', 'test.package', 'github');
      
      const body = JSON.parse(response.body);
      expect(body.namedLogo).toBe('github');
    });

    test('sets appropriate cache headers', () => {
      const response = createSuccessResponse('1.2.3', 'test.package', 'nuget');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=3600, stale-while-revalidate=1800');
    });
  });

  describe('Not Found Response Builder', () => {
    test('creates not found response with correct format', () => {
      const response = createNotFoundResponse('missing.package', null, 'nuget');
      
      expectShieldsIoFormat(response);
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
      expect(body.color).toBe('lightgrey');
      expect(body.namedLogo).toBe('nuget');
    });

    test('uses custom label when provided', () => {
      const response = createNotFoundResponse('missing.package', 'Custom Label', 'nuget');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('Custom Label');
    });

    test('creates default label when no custom label', () => {
      const response = createNotFoundResponse('missing.package', null, 'github');
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('missing.package github');
      expect(body.namedLogo).toBe('github');
    });

    test('sets shorter cache duration for not found', () => {
      const response = createNotFoundResponse('missing.package', null, 'nuget');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=300');
    });
  });

  describe('Error Response Builders', () => {
    test('createErrorResponse sets correct status and format', () => {
      const response = createErrorResponse(400, 'Invalid parameter');
      
      expectErrorResponse(response, 400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid parameter');
    });

    test('create404Response returns 404 status', () => {
      const response = create404Response('Route not found');
      
      expectErrorResponse(response, 404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Route not found');
    });

    test('create400Response returns 400 status', () => {
      const response = create400Response('Bad request');
      
      expectErrorResponse(response, 400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad request');
    });
  });

  describe('Test Badge Response Builder', () => {
    test('creates success badge for all passed tests', () => {
      const testData = { passed: 1099, failed: 0, skipped: 2, total: 1101 };
      const response = createTestBadgeResponse(testData, 'linux');
      
      expectShieldsIoFormat(response);
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('tests');
      expect(body.message).toBe('1099 passed');
      expect(body.color).toBe('success');
      expect(body.cacheSeconds).toBe(300);
    });

    test('creates critical badge for failed tests', () => {
      const testData = { passed: 994, failed: 5, skipped: 0, total: 999 };
      const response = createTestBadgeResponse(testData, 'windows');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('5 failed, 994 passed');
      expect(body.color).toBe('critical');
      expect(body.cacheSeconds).toBe(300);
    });

    test('creates unavailable badge when no test data', () => {
      const response = createTestBadgeResponse(null, 'macos');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('unavailable');
      expect(body.color).toBe('lightgrey');
      expect(body.cacheSeconds).toBe(60); // Shorter cache for unavailable
    });

    test('handles singular test count correctly', () => {
      const testData = { passed: 1, failed: 0, skipped: 0, total: 1 };
      const response = createTestBadgeResponse(testData, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('1 passed');
    });

    test('handles edge case: zero passed, some failed', () => {
      const testData = { passed: 0, failed: 3, skipped: 0, total: 3 };
      const response = createTestBadgeResponse(testData, 'linux');
      
      const body = JSON.parse(response.body);
      expect(body.message).toBe('3 failed, 0 passed');
      expect(body.color).toBe('critical');
    });

    test('sets appropriate cache headers', () => {
      const testData = { passed: 1099, failed: 0, skipped: 0, total: 1099 };
      const response = createTestBadgeResponse(testData, 'linux');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=300');
    });

    test('sets shorter cache for unavailable data', () => {
      const response = createTestBadgeResponse(null, 'linux');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=60');
    });
  });

  describe('Redirect Response Builder', () => {
    test('creates redirect with provided URL', () => {
      const url = 'https://github.com/example/repo/actions/runs/12345';
      const response = createRedirectResponse(url, 'fallback-url');
      
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe(url);
      expect(response.body).toBe('');
    });

    test('uses fallback URL when primary URL is null', () => {
      const fallbackUrl = 'https://github.com/example/repo/actions';
      const response = createRedirectResponse(null, fallbackUrl);
      
      expect(response.headers.Location).toBe(fallbackUrl);
    });

    test('uses default fallback when both URLs are null', () => {
      const response = createRedirectResponse(null, null);
      
      expect(response.headers.Location).toBe('https://github.com/localstack-dotnet/localstack-dotnet-client/actions');
    });

    test('sets appropriate cache headers', () => {
      const response = createRedirectResponse('test-url');
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=300');
    });
  });

  describe('Default Label Creation', () => {
    test('creates label for NuGet source', () => {
      const label = createDefaultLabel('Test.Package', 'nuget');
      expect(label).toBe('Test.Package nuget');
    });

    test('creates label for GitHub source', () => {
      const label = createDefaultLabel('Test.Package', 'github');
      expect(label).toBe('Test.Package github');
    });

    test('handles package name casing', () => {
      const label = createDefaultLabel('UPPERCASE.package', 'nuget');
      expect(label).toBe('UPPERCASE.package nuget');
    });
  });

  describe('Color Determination', () => {
    test('returns blue for stable versions', () => {
      expect(determineColor('1.2.3')).toBe('blue');
      expect(determineColor('2.0.0')).toBe('blue');
      expect(determineColor('10.5.12')).toBe('blue');
    });

    test('returns orange for prerelease versions', () => {
      expect(determineColor('1.0.0-alpha')).toBe('orange');
      expect(determineColor('2.0.0-preview1')).toBe('orange');
      expect(determineColor('1.5.0-beta.2')).toBe('orange');
      expect(determineColor('3.0.0-rc1')).toBe('orange');
    });

    test('handles complex prerelease identifiers', () => {
      expect(determineColor('2.0.0-preview1-20250716-125702')).toBe('orange');
      expect(determineColor('1.0.0-alpha.1.2.3')).toBe('orange');
    });

    test('handles edge cases', () => {
      expect(determineColor('0.0.1')).toBe('blue');
      expect(determineColor('1.0.0-0')).toBe('orange'); // Edge case for semver ranges
    });
  });

  describe('Version Validation', () => {
    test('validates and coerces valid semver', () => {
      expect(validateAndCoerceVersion('1.2.3', 'test')).toBe('1.2.3');
      expect(validateAndCoerceVersion('2.0.0-preview1', 'test')).toBe('2.0.0'); // semver.coerce strips prereleases
    });

    test('coerces partial versions', () => {
      expect(validateAndCoerceVersion('1.2', 'test')).toBe('1.2.0');
      expect(validateAndCoerceVersion('2', 'test')).toBe('2.0.0');
      expect(validateAndCoerceVersion('1.0', 'test')).toBe('1.0.0');
    });

    test('coerces prerelease versions to base version', () => {
      expect(validateAndCoerceVersion('1.0.0-alpha', 'test')).toBe('1.0.0'); // semver.coerce behavior
      expect(validateAndCoerceVersion('2.0.0-beta.1', 'test')).toBe('2.0.0'); // semver.coerce behavior
    });

    test('rejects invalid semver formats', () => {
      expect(() => validateAndCoerceVersion('invalid-version', 'test')).toThrow('Invalid semver format for parameter \'test\': \'invalid-version\'');
      expect(() => validateAndCoerceVersion('1.2.3.4.5', 'test')).toThrow('Invalid semver format for parameter \'test\': \'1.2.3.4.5\'');
      expect(() => validateAndCoerceVersion('abc.def.ghi', 'test')).toThrow('Invalid semver format for parameter \'test\': \'abc.def.ghi\'');
    });

    test('includes parameter name in error messages', () => {
      expect(() => validateAndCoerceVersion('invalid', 'gt')).toThrow('Invalid semver format for parameter \'gt\': \'invalid\'');
      expect(() => validateAndCoerceVersion('1.2.3.4.5', 'gte')).toThrow('Invalid semver format for parameter \'gte\': \'1.2.3.4.5\'');
    });

    test('handles null/undefined values', () => {
      expect(validateAndCoerceVersion(null, 'test')).toBeNull();
      expect(validateAndCoerceVersion(undefined, 'test')).toBeNull();
      expect(validateAndCoerceVersion('', 'test')).toBeNull();
    });

    test('handles edge cases with malformed input', () => {
      // semver.coerce is quite permissive, so test actual invalid cases
      expect(() => validateAndCoerceVersion('completely-invalid', 'test')).toThrow('Invalid semver format');
      expect(() => validateAndCoerceVersion('not.a.version.at.all', 'test')).toThrow('Invalid semver format');
      expect(() => validateAndCoerceVersion('abc.def.ghi', 'test')).toThrow('Invalid semver format');
    });
  });

  describe('Track Validation', () => {
    test('handles numeric track values', () => {
      expect(parseTrackWithValidation('1')).toBe(1);
      expect(parseTrackWithValidation('2')).toBe(2);
      expect(parseTrackWithValidation('10')).toBe(10);
    });

    test('handles v-prefixed track values', () => {
      expect(parseTrackWithValidation('v1')).toBe(1);
      expect(parseTrackWithValidation('v2')).toBe(2);
      expect(parseTrackWithValidation('V3')).toBe(3); // Case insensitive
    });

    test('handles zero track value', () => {
      expect(parseTrackWithValidation('0')).toBe(0);
      expect(parseTrackWithValidation('v0')).toBe(0);
    });

    test('rejects decimal values', () => {
      expect(() => parseTrackWithValidation('1.5')).toThrow('Invalid track parameter: \'1.5\'. Must be a positive integer (e.g., \'1\', \'v2\')');
      expect(() => parseTrackWithValidation('2.0')).toThrow('Invalid track parameter: \'2.0\'. Must be a positive integer (e.g., \'1\', \'v2\')');
    });

    test('rejects negative values', () => {
      expect(() => parseTrackWithValidation('-1')).toThrow('Invalid track parameter: \'-1\'. Must be a positive integer (e.g., \'1\', \'v2\')');
      expect(() => parseTrackWithValidation('v-2')).toThrow('Invalid track parameter: \'v-2\'. Must be a positive integer (e.g., \'1\', \'v2\')');
    });

    test('rejects non-numeric values', () => {
      expect(() => parseTrackWithValidation('abc')).toThrow('Invalid track parameter: \'abc\'. Must be a positive integer (e.g., \'1\', \'v2\')');
      expect(() => parseTrackWithValidation('v1.2')).toThrow('Invalid track parameter: \'v1.2\'. Must be a positive integer (e.g., \'1\', \'v2\')');
    });

    test('handles null/undefined values', () => {
      expect(parseTrackWithValidation(null)).toBeNull();
      expect(parseTrackWithValidation(undefined)).toBeNull();
      expect(parseTrackWithValidation('')).toBeNull();
    });

    test('handles large numbers', () => {
      expect(parseTrackWithValidation('999')).toBe(999);
      expect(parseTrackWithValidation('v1000')).toBe(1000);
    });
  });

  describe('Platform Utilities', () => {
    test('extractPlatform gets last URL segment', () => {
      expect(extractPlatform('badge/tests/linux')).toBe('linux');
      expect(extractPlatform('redirect/test-results/windows')).toBe('windows');
      expect(extractPlatform('badge/tests/macos')).toBe('macos');
    });

    test('extractPlatform handles various path formats', () => {
      expect(extractPlatform('linux')).toBe('linux');
      expect(extractPlatform('a/b/c/platform')).toBe('platform');
      expect(extractPlatform('')).toBe('');
    });

    test('extractPlatform handles trailing slashes', () => {
      expect(extractPlatform('badge/tests/linux/')).toBe('');
      expect(extractPlatform('badge/tests/linux')).toBe('linux');
    });

    test('isValidPlatform accepts valid platforms', () => {
      expect(isValidPlatform('linux')).toBe(true);
      expect(isValidPlatform('windows')).toBe(true);
      expect(isValidPlatform('macos')).toBe(true);
    });

    test('isValidPlatform rejects invalid platforms', () => {
      expect(isValidPlatform('ubuntu')).toBe(false);
      expect(isValidPlatform('win32')).toBe(false);
      expect(isValidPlatform('mac')).toBe(false);
      expect(isValidPlatform('android')).toBe(false);
      expect(isValidPlatform('')).toBe(false);
      expect(isValidPlatform(null)).toBe(false);
      expect(isValidPlatform(undefined)).toBe(false);
    });

    test('isValidPlatform is case sensitive', () => {
      expect(isValidPlatform('Linux')).toBe(false);
      expect(isValidPlatform('WINDOWS')).toBe(false);
      expect(isValidPlatform('MacOS')).toBe(false);
    });
  });
}); 