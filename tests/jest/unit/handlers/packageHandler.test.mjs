/*──────────────────────────────────────
  Unit Tests: Package Handler
  Tests backward compatibility, parameter validation, version filtering, and API integration
──────────────────────────────────────*/

import { jest } from '@jest/globals';
import { createLambdaEvent, expectShieldsIoFormat, expectErrorResponse } from '../../helpers/testUtils.mjs';

// Mock axios before importing the handler
jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn()
  }
}));

// Mock environment variables
process.env.GITHUB_TOKEN = 'mock-github-token';

// Import handler and axios after mocking
const axios = (await import('axios')).default;
const { packageHandler } = await import('../../../../src/handlers/packageHandler.mjs');

// Mock data for realistic API responses
const mockNuGetResponse = {
  versions: ["1.0.0", "1.1.0", "1.2.0", "2.0.0-preview1", "2.0.0", "2.1.0"]
};

const mockGitHubResponse = [
  { name: "2.0.0" },
  { name: "2.0.0-preview1-20250716-125702" },
  { name: "2.0.0-preview1" },
  { name: "1.5.0" },
  { name: "1.0.0" }
];

const mockGitHubResponsePreferClean = [
  { name: "2.0.0" },
  { name: "2.0.0-preview1" }, // Clean version
  { name: "2.0.0-preview1-20250716-125702" }, // Timestamped version
  { name: "1.5.0" }
];

describe('Package Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CRITICAL: Backward compatibility validation
  describe('Backward Compatibility - Legacy Routes', () => {
    test('handles /?package=Newtonsoft.Json&source=nuget', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Newtonsoft.Json', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0');
      expect(body.color).toBe('blue');
      expect(body.namedLogo).toBe('nuget');
    });

    test('defaults to source=nuget when source param missing', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { package: 'Newtonsoft.Json' });
      
      const response = await packageHandler.handle(event);
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.nuget.org/v3-flatcontainer/newtonsoft.json/index.json'
      );
      expectShieldsIoFormat(response);
    });

    test('supports includePrerelease=true parameter', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'LocalStack.Client', 
        source: 'nuget',
        includePrerelease: 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // Latest including prerelease
    });

    test('supports include-prerelease=true parameter', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'LocalStack.Client', 
        source: 'nuget',
        'include-prerelease': 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
    });

    test('supports includeprerelease=true parameter', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'LocalStack.Client', 
        source: 'nuget',
        includeprerelease: 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
    });

    test('handles prefer-clean parameter for GitHub', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponsePreferClean });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github',
        'prefer-clean': 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Latest stable version
    });

    test('preserves all existing query parameter formats', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: 'v2',
        includePrerelease: 'false',
        gt: '1.0.0'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
    });

    test('maintains response format exactly as before', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Legacy.Package', 
        source: 'nuget'
      });
      
      const response = await packageHandler.handle(event);
      
      // Validate exact legacy format
      expect(response.statusCode).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.headers['Cache-Control']).toBe('public, max-age=3600, stale-while-revalidate=1800');
      
      const body = JSON.parse(response.body);
      expect(body.schemaVersion).toBe(1);
      expect(body).toHaveProperty('label');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('color');
      expect(body).toHaveProperty('namedLogo');
      // Note: cacheSeconds is not included in response body, only in headers
    });
  });

  // NEW: Explicit route support
  describe('Explicit Route Support', () => {
    test('uses path param when provided: /badge/packages/localstack.client', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('badge/packages/localstack.client', { 
        source: 'nuget' 
      });
      
      // Simulate router passing extracted package name
      const response = await packageHandler.handle(event, 'localstack.client');
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.nuget.org/v3-flatcontainer/localstack.client/index.json'
      );
      expectShieldsIoFormat(response);
    });

    test('requires source param for explicit routes', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client');
      
      // Simulate router passing extracted package name but missing source
      const response = await packageHandler.handle(event, 'localstack.client');
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Source parameter is required');
    });

    test('validates source must be "nuget" or "github"', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client', {
        source: 'npm'
      });
      
      const response = await packageHandler.handle(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid source');
    });

    test('rejects empty source with descriptive error', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client', {
        source: ''
      });
      
      const response = await packageHandler.handle(event, 'localstack.client');
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Source parameter is required");
    });

    test('rejects invalid source with helpful message', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client', {
        source: 'invalid'
      });
      
      const response = await packageHandler.handle(event, 'localstack.client');
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid source 'invalid'");
    });
  });

  describe('Parameter Validation', () => {
    test('validates package name format: alphanumeric + dots + hyphens', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Valid.Package-Name123', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
    });

    test('rejects package names with invalid characters', async () => {
      const event = createLambdaEvent('', { 
        package: 'Invalid@Package!Name', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Invalid package name');
    });

    test('handles case sensitivity correctly', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'LocalStack.Client', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.nuget.org/v3-flatcontainer/localstack.client/index.json' // Implementation lowercases package names
      );
    });

    test('validates track parameter: v1, v2, 1, 2 formats', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const validTracks = ['1', '2', 'v1', 'v2', 'V3'];
      
      for (const track of validTracks) {
        const event = createLambdaEvent('', { 
          package: 'Test.Package', 
          source: 'nuget',
          track 
        });
        
        const response = await packageHandler.handle(event);
        expectShieldsIoFormat(response);
      }
    });

    test('rejects decimal track values with clear error', async () => {
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: '1.5'
      });
      
      const response = await packageHandler.handle(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid track parameter: '1.5'");
    });

    test('rejects negative track values', async () => {
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: '-1'
      });
      
      const response = await packageHandler.handle(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid track parameter: '-1'");
    });
  });

  describe('Semver Range Validation', () => {
    test('validates gt parameter with valid semver', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gt: '1.0.0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('validates gte parameter with valid semver', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gte: '1.1.0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('validates lt parameter with valid semver', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        lt: '2.0.0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('validates lte parameter with valid semver', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        lte: '2.1.0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('validates eq parameter with valid semver', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        eq: '2.0.0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('rejects invalid semver in gt parameter', async () => {
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gt: 'invalid-version'
      });
      
      const response = await packageHandler.handle(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain("Invalid semver format for parameter 'gt'");
    });

    test('coerces partial versions: "2.0" -> "2.0.0"', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gte: '2.0' // Should be coerced to 2.0.0
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });

    test('handles prerelease ranges: "2.0.0-0"', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gte: '2.0.0-0'
      });
      
      const response = await packageHandler.handle(event);
      expectShieldsIoFormat(response);
    });
  });

  describe('Version Filtering Logic', () => {
    test('filters by major version track=1', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: '1'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('1.2.0'); // Latest v1.x
    });

    test('filters by major version track=v2', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: 'v2'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // Latest v2.x
    });

    test('excludes prereleases when includePrerelease=false', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        includePrerelease: 'false'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // No prereleases
    });

    test('includes prereleases when includePrerelease=true', async () => {
      const dataWithNewerPrerelease = {
        versions: ["1.0.0", "2.0.0", "2.1.0", "2.2.0-preview1"]
      };
      axios.get.mockResolvedValue({ data: dataWithNewerPrerelease });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        includePrerelease: 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.2.0-preview1'); // Latest including prerelease
    });

    test('applies gt filter correctly', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gt: '1.1.0'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // > 1.1.0
    });

    test('applies lt filter correctly', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        lt: '2.0.0'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('1.2.0'); // < 2.0.0
    });

    test('applies eq filter correctly', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        eq: '2.0.0'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Exact match
    });

    test('combines multiple filters (track + gte + lt)', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        track: '2',
        gte: '2.0.0',
        lt: '2.1.0'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Matches all filters
    });

    test('returns empty result when no versions match filters', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        gt: '5.0.0' // No versions > 5.0.0
      });
      
      const response = await packageHandler.handle(event);
      
      // Badge API returns 200 with "not found" message instead of 404 for display compatibility
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
      expect(body.color).toBe('lightgrey');
    });
  });

  describe('GitHub Prefer-Clean Logic', () => {
    test('prefers "2.0.0-preview1" over "2.0.0-preview1-20250716-125702"', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponsePreferClean });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github',
        'prefer-clean': 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Latest stable version
    });

    test('handles mixed manual and timestamped versions', async () => {
      const mixedVersions = [
        { name: "2.0.0" },
        { name: "2.0.0-preview2-20250717-130000" }, // Only timestamped
        { name: "2.0.0-preview1" }, // Clean version
        { name: "2.0.0-preview1-20250716-125702" } // Timestamped duplicate
      ];
      axios.get.mockResolvedValue({ data: mixedVersions });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github',
        'prefer-clean': 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Latest stable version
    });

    test('falls back to standard semver when prefer-clean=false', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponsePreferClean });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github',
        'prefer-clean': 'false'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Standard semver sorting
    });

    test('handles versions without timestamps correctly', async () => {
      const noTimestampVersions = [
        { name: "2.0.0" },
        { name: "2.0.0-preview1" },
        { name: "1.5.0" }
      ];
      axios.get.mockResolvedValue({ data: noTimestampVersions });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github',
        'prefer-clean': 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Latest stable version
    });
  });

  describe('API Response Handling - NuGet', () => {
    test('handles successful NuGet API response', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.nuget.org/v3-flatcontainer/test.package/index.json'
      );
      
      expectShieldsIoFormat(response);
    });

    test('extracts versions array correctly', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // Latest from versions array
    });

    test('handles empty versions array', async () => {
      axios.get.mockResolvedValue({ data: { versions: [] } });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
    });

    test('handles malformed JSON response', async () => {
      const error = new Error('Unexpected token');
      error.response = { status: 200 };
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Unexpected token');
    });

    test('handles 404 package not found', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'NonExistent.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
    });

    test('handles network timeout with descriptive error', async () => {
      const error = new Error('timeout of 10000ms exceeded');
      error.code = 'ECONNABORTED';
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('timeout');
    });
  });

  describe('API Response Handling - GitHub', () => {
    test('handles successful GitHub API response', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponse });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.github.com/orgs/localstack-dotnet/packages/nuget/Localstack.Client/versions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-github-token',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          })
        })
      );
      
      expectShieldsIoFormat(response);
    });

    test('extracts version names from GitHub format', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponse });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.0.0'); // Latest from GitHub response
    });

    test('handles authentication with GITHUB_TOKEN', async () => {
      axios.get.mockResolvedValue({ data: mockGitHubResponse });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      await packageHandler.handle(event);
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-github-token'
          })
        })
      );
    });

    test('handles 401 authentication required error', async () => {
      const error = new Error('Bad credentials');
      error.response = { status: 401 };
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('GitHub API requires authentication');
    });

    test('handles 404 package not found with org context', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'nonexistent.package', 
        source: 'github' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
    });

    test('preserves chronological ordering from GitHub', async () => {
      // GitHub API returns in chronological order (newest first)
      const chronologicalResponse = [
        { name: "2.1.0" }, // Newest
        { name: "2.0.0" },
        { name: "1.5.0" },
        { name: "1.0.0" }  // Oldest
      ];
      axios.get.mockResolvedValue({ data: chronologicalResponse });
      
      const event = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('2.1.0'); // Latest from chronological order
    });
  });

  describe('Response Generation', () => {
    test('generates success response with correct shields.io format', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expectShieldsIoFormat(response);
      
      const body = JSON.parse(response.body);
      expect(body.schemaVersion).toBe(1);
      expect(body.label).toContain('test.package'); // Implementation lowercases package names
      expect(body.message).toBe('2.1.0');
      expect(body).toHaveProperty('color');
      expect(body).toHaveProperty('namedLogo');
      // Note: cacheSeconds is not included in response body, only in headers
    });

    test('uses blue color for stable versions', async () => {
      const stableVersions = { versions: ["1.0.0", "2.0.0"] };
      axios.get.mockResolvedValue({ data: stableVersions });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('blue');
    });

    test('uses orange color for prerelease versions', async () => {
      const prereleaseVersions = { versions: ["1.0.0", "2.0.0-preview1"] };
      axios.get.mockResolvedValue({ data: prereleaseVersions });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        includePrerelease: 'true'
      });
      
      const response = await packageHandler.handle(event);
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('orange');
    });

    test('uses custom label when provided', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        label: 'custom label'
      });
      
      const response = await packageHandler.handle(event);
      
      const body = JSON.parse(response.body);
      expect(body.label).toBe('custom label');
    });

    test('uses custom color when provided', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget',
        color: 'red'
      });
      
      const response = await packageHandler.handle(event);
      
      const body = JSON.parse(response.body);
      expect(body.color).toBe('red');
    });

    test('generates not found response for missing packages', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      axios.get.mockRejectedValue(error);
      
      const event = createLambdaEvent('', { 
        package: 'Missing.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('not found');
      expect(body.color).toBe('lightgrey');
    });

    test('sets appropriate cache headers', async () => {
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const event = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const response = await packageHandler.handle(event);
      
      expect(response.headers['Cache-Control']).toBe('public, max-age=3600, stale-while-revalidate=1800');
      
      // Note: cacheSeconds is in headers, not response body
      expect(response.headers['Cache-Control']).toContain('max-age=3600');
    });

    test('includes correct namedLogo (nuget vs github)', async () => {
      // Test NuGet logo
      axios.get.mockResolvedValue({ data: mockNuGetResponse });
      
      const nugetEvent = createLambdaEvent('', { 
        package: 'Test.Package', 
        source: 'nuget' 
      });
      
      const nugetResponse = await packageHandler.handle(nugetEvent);
      const nugetBody = JSON.parse(nugetResponse.body);
      expect(nugetBody.namedLogo).toBe('nuget');
      
      // Test GitHub logo
      axios.get.mockResolvedValue({ data: mockGitHubResponse });
      
      const githubEvent = createLambdaEvent('', { 
        package: 'localstack.client', 
        source: 'github' 
      });
      
      const githubResponse = await packageHandler.handle(githubEvent);
      const githubBody = JSON.parse(githubResponse.body);
      expect(githubBody.namedLogo).toBe('github');
    });
  });
}); 