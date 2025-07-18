/*──────────────────────────────────────
  Mock API Responses for Unit Tests
  Based on real API exploration results
──────────────────────────────────────*/

/**
 * NuGet API Mock Responses
 * Based on real https://api.nuget.org/v3-flatcontainer/{package}/index.json
 */
export const mockNuGetResponses = {
  // Popular package with many versions including prereleases
  'newtonsoft.json': {
    versions: [
      "3.5.8", "4.0.1", "4.0.2", "4.0.3", "4.0.4", "4.0.5", "4.0.6", "4.0.7", "4.0.8",
      "4.5.1", "4.5.2", "4.5.3", "4.5.4", "4.5.5", "4.5.6", "4.5.7", "4.5.8", "4.5.9", "4.5.10", "4.5.11",
      "5.0.1", "5.0.2", "5.0.3", "5.0.4", "5.0.5", "5.0.6", "5.0.7", "5.0.8",
      "6.0.1-beta1", "6.0.1", "6.0.2", "6.0.3", "6.0.4", "6.0.5", "6.0.6", "6.0.7", "6.0.8",
      "7.0.1-beta1", "7.0.1-beta2", "7.0.1", "7.0.2", "7.0.3",
      "8.0.1", "8.0.2", "8.0.3",
      "9.0.1", "9.0.2",
      "10.0.1", "10.0.2", "10.0.3",
      "11.0.1", "11.0.2",
      "12.0.1", "12.0.2", "12.0.3",
      "13.0.1", "13.0.2-beta2", "13.0.2-beta3", "13.0.2", "13.0.3-beta1", "13.0.3"
    ]
  },

  // Microsoft package with multiple major versions
  'microsoft.aspnetcore.app': {
    versions: [
      "2.1.0-preview1-final", "2.1.0-preview2-final", "2.1.0-rc1-final", "2.1.0", "2.1.1", "2.1.2", "2.1.3",
      "2.1.4", "2.1.5", "2.1.6", "2.1.7", "2.1.8", "2.1.9", "2.1.10", "2.1.11", "2.1.12", "2.1.13",
      "2.1.14", "2.1.15", "2.1.16", "2.1.17", "2.1.18", "2.1.19", "2.1.20", "2.1.21", "2.1.22",
      "2.1.23", "2.1.24", "2.1.25", "2.1.26", "2.1.27", "2.1.28", "2.1.30",
      "2.2.0-preview1-35029", "2.2.0-preview2-35157", "2.2.0-preview3-35185", "2.2.0",
      "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5", "2.2.6", "2.2.7", "2.2.8",
      "3.0.0-preview-18579-0056", "3.0.0-preview-19075-0444", "3.0.0-preview3-19153-02"
    ]
  },

  // Your LocalStack package with two-track strategy
  'localstack.client': {
    versions: [
      "0.8.0.163",        // Early version
      "1.0.0", "1.1.0", "1.2.0", "1.2.2", "1.3.0", "1.3.1", "1.4.0", "1.4.1", "1.5.0", "1.6.0", // v1.x track
      "2.0.0-preview1"    // v2.x track
    ]
  },

  // Package for testing edge cases
  'single.version.package': {
    versions: ["1.0.0"]
  },

  // Package with only prereleases
  'prerelease.only.package': {
    versions: ["1.0.0-alpha1", "1.0.0-alpha2", "1.0.0-beta1", "2.0.0-preview1"]
  }
};

/**
 * GitHub Packages API Mock Responses
 * Based on real https://api.github.com/orgs/{org}/packages/nuget/{package}/versions
 */
export const mockGitHubResponses = {
  'LocalStack.Client': [
    {
      id: 123456789,
      name: "2.0.0-preview1-20250718-111124",
      url: "https://api.github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/versions/123456789",
      package_html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/package/LocalStack.Client",
      created_at: "2025-07-18T11:11:35Z",
      updated_at: "2025-07-18T11:11:35Z",
      html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/123456789",
      metadata: {
        package_type: "nuget",
        container: {}
      }
    },
    {
      id: 123456788,
      name: "2.0.0-preview1-20250718-105239",
      url: "https://api.github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/versions/123456788",
      package_html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/package/LocalStack.Client",
      created_at: "2025-07-18T10:52:45Z",
      updated_at: "2025-07-18T10:52:45Z",
      html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/123456788",
      metadata: {
        package_type: "nuget",
        container: {}
      }
    },
    {
      id: 123456787,
      name: "2.0.0-preview1",  // Clean manual tag
      url: "https://api.github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/versions/123456787",
      package_html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/package/LocalStack.Client",
      created_at: "2025-07-16T12:30:00Z",
      updated_at: "2025-07-16T12:30:00Z",
      html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/123456787",
      metadata: {
        package_type: "nuget",
        container: {}
      }
    },
    {
      id: 123456786,
      name: "2.0.0-preview1-20250716-125702",
      url: "https://api.github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/versions/123456786",
      package_html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/package/LocalStack.Client",
      created_at: "2025-07-16T12:57:10Z",
      updated_at: "2025-07-16T12:57:10Z",
      html_url: "https://github.com/orgs/localstack-dotnet/packages/nuget/LocalStack.Client/123456786",
      metadata: {
        package_type: "nuget",
        container: {}
      }
    }
  ]
};

/**
 * Gist API Mock Responses
 * Based on real https://gist.githubusercontent.com/Blind-Striker/{gistId}/raw/test-results-{platform}.json
 */
export const mockGistResponses = {
  'test-results-linux.json': {
    platform: "Linux",
    passed: 1099,
    failed: 0,
    skipped: 0,
    total: 1099,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/46253069370",
    timestamp: "2025-07-18T11:10:51Z",
    commit: "11e20f8cb848693a9276b8673a8d2d4152c41544",
    run_id: "16369042913",
    workflow_run_url: "https://github.com/localstack-dotnet/localstack-dotnet-client/actions/runs/16369042913"
  },

  'test-results-windows.json': {
    platform: "Windows",
    passed: 994,
    failed: 5,
    skipped: 0,
    total: 999,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/46253046912",
    timestamp: "2025-07-18T11:10:27Z",
    commit: "11e20f8cb848693a9276b8673a8d2d4152c41544",
    run_id: "16369042913",
    workflow_run_url: "https://github.com/localstack-dotnet/localstack-dotnet-client/actions/runs/16369042913"
  },

  'test-results-macos.json': {
    platform: "macOS",
    passed: 999,
    failed: 0,
    skipped: 0,
    total: 999,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/46252997518",
    timestamp: "2025-07-18T11:09:36Z",
    commit: "11e20f8cb848693a9276b8673a8d2d4152c41544",
    run_id: "16369042913",
    workflow_run_url: "https://github.com/localstack-dotnet/localstack-dotnet-client/actions/runs/16369042913"
  }
};

/**
 * Error Response Mocks
 */
export const mockErrorResponses = {
  // NuGet 404 response (XML format)
  nuget404: `<?xml version="1.0" encoding="utf-8"?><e><Code>BlobNotFound</Code><Message>The specified blob does not exist.
RequestId:d39db652-801e-0023-5119-f82734000000
Time:2025-07-18T19:26:08.0083268Z</Message></e>`,

  // GitHub 404 response (JSON format)
  github404: {
    message: "Not Found",
    documentation_url: "https://docs.github.com/rest/packages/packages#list-package-versions-for-a-package-owned-by-an-organization",
    status: "404"
  },

  // GitHub 401 response (authentication)
  github401: {
    message: "Bad credentials",
    documentation_url: "https://docs.github.com/rest"
  }
};

/**
 * Test Events for Different Scenarios
 */
export const mockTestEvents = {
  // Legacy routes (query parameters)
  legacyNugetBasic: {
    pathParameters: null,
    queryStringParameters: { package: 'Newtonsoft.Json', source: 'nuget' }
  },

  legacyNugetWithPrerelease: {
    pathParameters: null,
    queryStringParameters: { package: 'Microsoft.AspNetCore.App', source: 'nuget', 'include-prerelease': 'true' }
  },

  legacyGitHubWithPreferClean: {
    pathParameters: null,
    queryStringParameters: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true', 'prefer-clean': 'true' }
  },

  // Explicit routes (path parameters)
  explicitPackageRoute: {
    pathParameters: { proxy: 'badge/packages/localstack.client' },
    queryStringParameters: { source: 'nuget', track: '1' }
  },

  testBadgeLinux: {
    pathParameters: { proxy: 'badge/tests/linux' },
    queryStringParameters: {}
  },

  redirectLinux: {
    pathParameters: { proxy: 'redirect/test-results/linux' },
    queryStringParameters: {}
  },

  // Invalid scenarios
  invalidRoute: {
    pathParameters: { proxy: 'api/v1/invalid' },
    queryStringParameters: {}
  },

  invalidPlatform: {
    pathParameters: { proxy: 'badge/tests/ubuntu' },
    queryStringParameters: {}
  },

  missingPackage: {
    pathParameters: null,
    queryStringParameters: { source: 'nuget' }
  }
};

/**
 * Data validation test cases
 */
export const mockInvalidGistData = {
  missingFields: {
    platform: "Linux"
    // Missing other required fields
  },

  wrongTypes: {
    platform: 123,        // Should be string
    passed: "abc",        // Should be number
    failed: null,         // Should be number
    skipped: true,        // Should be number
    total: "999",         // Should be number
    timestamp: 12345      // Should be string
  },

  negativeNumbers: {
    platform: "Linux",
    passed: -5,
    failed: -2,
    skipped: -1,
    total: -8,
    timestamp: "2025-07-18T11:10:51Z"
  },

  incorrectTotal: {
    platform: "Linux",
    passed: 10,
    failed: 5,
    skipped: 2,
    total: 20,  // Should be 17 (10+5+2)
    timestamp: "2025-07-18T11:10:51Z"
  }
}; 