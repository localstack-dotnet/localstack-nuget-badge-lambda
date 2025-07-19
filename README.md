# LocalStack Badge API

> **📚 Open Source Example**: [LocalStack.NET Client](https://github.com/localstack-dotnet/localstack-dotnet-client) solution for dynamic package version and CI/CD test result badges using [shields.io endpoint badges](https://shields.io/badges/endpoint-badge). This demonstrates how LocalStack.NET Client handles their two-track versioning strategy and CI/CD badge integration. Use this as inspiration for building your own badge infrastructure.

## 🎯 Project Scope & Purpose

### LocalStack-Specific Implementation

This project demonstrates [LocalStack.NET Client](https://github.com/localstack-dotnet/localstack-dotnet-client)'s badge infrastructure for:

- 🛡️ **LocalStack.Client v1.x**: Maintenance mode for AWS SDK v3 users (EOL: July 2026)
- 🚀 **LocalStack.Client v2.0**: Future-focused with native AWS SDK v4 support and Native AOT roadmap
- 🧪 **CI/CD Test Results**: Multi-platform test status badges from LocalStack's test pipeline

### What's LocalStack-Specific vs General

- ✅ **NuGet Integration**: Works for any NuGet package (general purpose)
- 🔒 **GitHub Packages**: Tailored specifically for LocalStack.NET Client organization packages
- 🔒 **Test Result Badges**: Pull from LocalStack.NET Client's specific CI/CD pipeline via Gist

**Use this as inspiration** for your own badge solutions rather than expecting to use [LocalStack.NET Client](https://github.com/localstack-dotnet/localstack-dotnet-client)'s endpoints for your packages.

## 🚀 Live API

**Base URL:** `https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/`

## 📊 Quick Examples

| Badge Type | Example | Modern URL |
|------------|---------|------------|
| 📦 LocalStack.NET Client v1.x | ![LocalStack v1](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/packages/localstack.client?source=nuget&track=1) | `/badge/packages/localstack.client?source=nuget&track=1` |
| 📦 LocalStack.NET Client v2.x | ![LocalStack v2.x](https://img.shields.io/endpoint?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Fbadge%2Fpackages%2Flocalstack.client%3Fsource%3Dnuget%26track%3D2%26includeprerelease%3Dtrue%26label%3Dnuget) | `/badge/packages/localstack.client?source=nuget&track=2&include-prerelease=true` |
| 🧪 Test Results | [![Linux Tests](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/tests/linux?label=Linux)](https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/redirect/test-results/linux)| `/badge/tests/linux` |

## 🎯 API Endpoints

### Package Version Badges

```
GET /badge/packages/{package-name}?source={nuget|github}&[options]
```

**Sources:**

- `nuget` - Works for any NuGet package
- `github` - LocalStack.NET Client organization packages only

### Test Result Badges (LocalStack.NET Client-Specific)

```
GET /badge/tests/{platform}           # Returns badge JSON
GET /redirect/test-results/{platform} # Returns 302 redirect to test results
```

**Platforms:** `linux` | `windows` | `macos`

### Response Format

All badge endpoints return [shields.io endpoint badge format](https://shields.io/badges/endpoint-badge):

```json
{
  "schemaVersion": 1,
  "label": "localstack.client nuget",
  "message": "1.2.3",
  "color": "blue",
  "namedLogo": "nuget"
}
```

## 📦 Package Version Badge Examples

### LocalStack NuGet Packages

```bash
# LocalStack.Client v1.x (maintenance track)
/badge/packages/localstack.client?source=nuget&track=1

# LocalStack.Client v2.x (future track with prereleases)
/badge/packages/localstack.client?source=nuget&track=2&include-prerelease=true

# Latest stable LocalStack.Client
/badge/packages/localstack.client?source=nuget
```

### LocalStack GitHub Packages

```bash
# LocalStack.Client from GitHub Packages (clean versions preferred)
/badge/packages/localstack.client?source=github&include-prerelease=true&prefer-clean=true

# Latest LocalStack GitHub package (may include timestamped builds)
/badge/packages/localstack.client?source=github&include-prerelease=true
```

### General NuGet Examples

```bash
# Any public NuGet package
/badge/packages/Newtonsoft.Json?source=nuget

# ASP.NET Core v8 track
/badge/packages/Microsoft.AspNetCore.App?source=nuget&track=8

# Include prereleases
/badge/packages/Microsoft.AspNetCore.App?source=nuget&include-prerelease=true
```

## 🧪 LocalStack.NET Client Test Result Badges

**Note**: These pull from [LocalStack.NET Client](https://github.com/localstack-dotnet/localstack-dotnet-client)'s specific [CI/CD pipeline](https://github.com/localstack-dotnet/localstack-dotnet-client/blob/master/.github/workflows/ci-cd.yml). For your own project, you'd need to adapt the Gist integration.

### Platform-Specific Test Results

```bash
# LocalStack.Client test results by platform
/badge/tests/linux      # Linux test results
/badge/tests/windows    # Windows test results  
/badge/tests/macos      # macOS test results
```

### Test Result Navigation

```bash
# Click to view LocalStack's GitHub Actions
/redirect/test-results/linux    # → LocalStack CI/CD results
/redirect/test-results/windows  # → LocalStack CI/CD results
/redirect/test-results/macos    # → LocalStack CI/CD results
```

### Badge Examples

- ✅ **All passed**: `"153 passed"` (green)
- ❌ **Some failed**: `"2 failed, 150 passed"` (red)
- ⚪ **Unavailable**: `"unavailable"` (grey)

## 📋 Parameters

### Package Badge Parameters

| Parameter | Description | Example | Default |
|-----------|-------------|---------|---------|
| `package` | Package name (in URL path) | `localstack.client` | - |
| `source` | Package source | `nuget`, `github` | Required |
| `track` | Major version to track | `1`, `2`, `v2`, etc. | Latest overall |
| `include-prerelease` | Include prerelease versions | `true`, `false` | `false` |
| `prefer-clean` | **GitHub only**: Prefer manual tags over timestamped builds | `true`, `false` | `false` |
| `gt`, `gte`, `lt`, `lte`, `eq` | [Semver range filters](https://semver.org/) | `gt=1.0.0`, `lte=2.5.0` | None |
| `label` | Custom badge label | `LocalStack%20v2` | Auto-generated |
| `color` | Custom badge color | `purple`, `%23ff0000` | Smart color |

### Smart Colors

- 🔵 **Blue**: Stable package releases  
- 🟠 **Orange**: Prerelease package versions
- 🟢 **Green**: All tests passed
- 🔴 **Red**: Some tests failed
- ⚪ **Light Grey**: Not found / unavailable

## 🎯 LocalStack.NET Client's Real-World Usage

### In LocalStack.Client README

```markdown
<!-- LocalStack.Client two-track strategy -->
![NuGet v1.x](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/packages/localstack.client?source=nuget&track=1&label=NuGet%20v1.x)
![NuGet v2.x](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/packages/localstack.client?source=nuget&track=2&include-prerelease=true&label=NuGet%20v2.x)

<!-- LocalStack CI/CD test matrix -->
[![Linux Tests](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/tests/linux?label=Linux)](https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/redirect/test-results/linux)
[![Windows Tests](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/tests/windows?label=Windows)](https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/redirect/test-results/windows)
[![macOS Tests](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/badge/tests/macos?label=macOS)](https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/redirect/test-results/macos)
```

### Version Range Examples

```bash
# LocalStack.Client versions >= 1.5.0
/badge/packages/localstack.client?source=nuget&gte=1.5.0

# LocalStack v2 prereleases only
/badge/packages/localstack.client?source=nuget&track=2&include-prerelease=true&lt=2.0.0

# Include prereleases in range (requires -0 suffix)
/badge/packages/localstack.client?source=nuget&gte=2.0.0-0&lt=3.0.0
```

## 🐙 GitHub Packages Special Features (LocalStack-Specific)

### The `prefer-clean` Parameter

LocalStack's GitHub Packages contain both manual tags and automated timestamped builds:

- `2.0.0-preview1` (manual tag)
- `2.0.0-preview1-20250716-125702` (automated build)

```bash
# Without prefer-clean (standard semver - returns timestamped version)
/badge/packages/localstack.client?source=github&include-prerelease=true
# Result: 2.0.0-preview1-20250716-125702

# With prefer-clean (user-friendly - returns manual tag)  
/badge/packages/localstack.client?source=github&include-prerelease=true&prefer-clean=true
# Result: 2.0.0-preview1
```

### Parameter Variants

The API accepts multiple parameter name formats:

```bash
# All of these work for prerelease inclusion:
&include-prerelease=true
&includePrerelease=true  
&includeprerelease=true

# All of these work for clean version preference:
&prefer-clean=true
&preferClean=true
```

## 📊 Data Sources (LocalStack.NET Client-Specific)

### Package Data

- **NuGet**: Standard NuGet.org API (works for any package)
- **GitHub Packages**: LocalStack.NET Client organization packages only (`localstack-dotnet` org)

### Test Data (LocalStack.NET Client CI/CD)

- **Source**: LocalStack.NET Client's GitHub Gist (`472c59b7c2a1898c48a29f3c88897c5a`)
- **Updates**: LocalStack.NET Client's CI/CD pipeline updates test results after each run
- **Format**: Platform-specific JSON files (`test-results-{platform}.json`)
- **Caching**: 5-minute TTL for optimal performance

### Test Data Schema

```json
{
  "platform": "linux",
  "passed": 150,
  "failed": 2,
  "skipped": 1,
  "total": 153,
  "url_html": "https://github.com/localstack/localstack-dotnet-client/actions/runs/123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🔧 Troubleshooting

### Common Issues

#### Q: Badge shows "Package not found"

- **For NuGet**: Verify the package name exists on nuget.org
- **For GitHub**: Only LocalStack.NET Client [organization packages](https://github.com/orgs/localstack-dotnet/packages?repo_name=localstack-dotnet-client) are supported
- Check if the package exists in the specified source

#### Q: Getting timestamped versions instead of clean tags

- Add `&prefer-clean=true` parameter for LocalStack.NET Client GitHub packages
- This only affects LocalStack.NET Client's GitHub sources

#### Q: Badge shows older version than expected

- Check version filters (`track`, `gte`, `lt`) that might exclude newer versions
- For prereleases, ensure `include-prerelease=true` is set
- Verify the package has the version you expect

#### Q: Test badges show "unavailable"

- These only work for LocalStack.NET Client's CI/CD pipeline
- For your own project, you'd need to adapt the Gist integration
- Check if LocalStack.NET Client's test pipeline is currently running

### Error Responses

The API returns descriptive error messages:

- `400`: Invalid parameters or malformed semver ranges
- `404`: Package not found or invalid route
- `500`: API or network errors when fetching data

## 🛠️ Adapting This for Your Project

### To Build Your Own Badge API

1. **Package Sources**: Modify `src/handlers/packageHandler.mjs`
   - Keep NuGet integration as-is (universal)
   - Replace GitHub Packages logic with your organization
   - Update authentication tokens and API endpoints

2. **Test Data Source**: Modify `src/services/gistService.mjs`
   - Replace Gist ID with your data source (Gist, database, API)
   - Adapt JSON schema to your CI/CD output format
   - Update caching strategy for your needs

3. **Customization**: Update `src/utils/common.mjs`
   - Change colors, labels, caching strategies
   - Add your own validation logic
   - Customize badge formatting

4. **Deployment**:
   - Update AWS Lambda configuration
   - Set your own API Gateway domain
   - Configure environment variables for your APIs

## 🏗️ Local Development

### Prerequisites

- Node.js 18+
- npm/yarn

### Setup

```bash
# Install dependencies
npm install

# Run comprehensive test suite (258 tests!)
npm run test:unit

# Run legacy tests
npm run test:legacy
```

### Project Structure

```
src/
├── index.mjs              # Router + Lambda entry point
├── handlers/              # Request handlers
│   ├── packageHandler.mjs # Package version badges
│   ├── testBadgeHandler.mjs # Test result badges
│   └── testRedirectHandler.mjs # Test result redirects
├── services/              # External API integrations
│   └── gistService.mjs    # GitHub Gist integration
└── utils/                 # Shared utilities
    └── common.mjs         # Response builders, validation

tests/
├── jest/unit/            # Unit tests (258 tests)
├── jest/fixtures/        # Test data and mocks
└── jest/helpers/         # Test utilities
```

### Environment Variables

```bash
# GitHub Packages (required for LocalStack.NET Client GitHub packages)
GITHUB_TOKEN=your_github_token_here
```

### Testing Features

The comprehensive test suite (`npm run test:unit`) validates:

- ✅ **Package badge generation**: NuGet and GitHub package integration
- ✅ **Two-track strategy**: LocalStack.NET Client v1.x maintenance & v2.x future
- ✅ **Parameter parsing**: All variants and edge cases
- ✅ **Version filtering**: Track, semver ranges, prerelease inclusion
- ✅ **GitHub features**: prefer-clean parameter for timestamped builds
- ✅ **Test badge generation**: Platform-specific test results
- ✅ **Test redirects**: Navigation to GitHub Actions
- ✅ **Error handling**: Invalid packages, malformed parameters, network issues
- ✅ **Caching**: TTL behavior and cache invalidation

## 🤝 Contributing

This is LocalStack.NET Client's specific implementation, but contributions for improvements are welcome:

1. Fork the repository
2. Create your feature branch
3. Test your changes with `npm run test:unit`
4. Submit a pull request

Focus on:

- General improvements to the badge infrastructure
- Better error handling and resilience
- Performance optimizations
- Code quality improvements

## 📝 License

MIT License - feel free to use this as inspiration for your own badge infrastructure!

---

**🎯 Remember**: This is [LocalStack.NET Client](https://github.com/localstack-dotnet/localstack-dotnet-client)'s specific implementation. The GitHub Packages integration only works for LocalStack.NET Client packages, and test badges pull from LocalStack.NET Client's CI/CD. Use this as a reference for building your own badge solution!
