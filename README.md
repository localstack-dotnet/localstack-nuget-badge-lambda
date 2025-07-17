# NuGet & GitHub Packages Badge API

> **📚 Example Project**: This is a demonstration of a focused, parameter-driven Lambda API for generating dynamic package version badges using [shields.io endpoint badges](https://shields.io/badges/endpoint-badge). The GitHub Packages functionality is specifically tailored for LocalStack.Client's two-track versioning strategy and serves as an example rather than a general-purpose production solution.

## 🎯 Project Scope & Purpose

### Two-Track Strategy Example

This project demonstrates solving a specific badge problem for packages following a **two-track strategy**:

- 🛡️ **v1.x**: Maintenance mode for AWS SDK v3 users (EOL: July 2026)
- 🚀 **v2.0**: Future-focused with native AWS SDK v4 support and Native AOT roadmap

### GitHub Packages Limitations

The GitHub Packages integration is **specifically handcrafted** for LocalStack.Client repository patterns and is not intended as a general-purpose solution. It demonstrates:

- Handling timestamped vs clean version preferences
- Custom sorting logic for GitHub package versioning chaos
- Parameter-driven filtering for complex version scenarios

**Use this as inspiration** for your own badge solutions rather than a drop-in production service.

## 🚀 Live API

**Base URL:** `https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/`

## 📊 Quick Examples

| Badge | URL |
|-------|-----|
| ![Latest Version](https://img.shields.io/endpoint?url=https%3A//yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/%3Fpackage%3DNewtonsoft.Json%26source%3Dnuget) | `?package=Newtonsoft.Json&source=nuget` |
| ![v2 Track](https://img.shields.io/endpoint?url=https%3A//yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/%3Fpackage%3DMicrosoft.AspNetCore.App%26source%3Dnuget%26track%3D2) | `?package=Microsoft.AspNetCore.App&source=nuget&track=2` |
| ![With Prereleases](https://img.shields.io/endpoint?url=https%3A//yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/%3Fpackage%3DMicrosoft.AspNetCore.App%26source%3Dnuget%26include-prerelease%3Dtrue) | `?package=Microsoft.AspNetCore.App&source=nuget&include-prerelease=true` |

## 🎯 API Design

### Single Version Focus

Each API call returns **one version** that matches your criteria, following the [shields.io endpoint badge schema](https://shields.io/badges/endpoint-badge):

```json
{
  "schemaVersion": 1,
  "label": "newtonsoft.json nuget",
  "message": "13.0.3",
  "color": "blue",
  "namedLogo": "nuget"
}
```

### Parameters

| Parameter | Description | Example | Default |
|-----------|-------------|---------|---------|
| `package` | Package name (required) | `Newtonsoft.Json` | - |
| `source` | Package source | `nuget`, `github` | `nuget` |
| `track` | Major version to track | `1`, `2`, `v2`, etc. | Latest overall |
| `include-prerelease` | Include prerelease versions | `true`, `false` | `false` |
| `prefer-clean` | **GitHub only**: Prefer manual tags over timestamped builds | `true`, `false` | `false` |
| `gt`, `gte`, `lt`, `lte`, `eq` | [Semver range filters](https://semver.org/) | `gt=1.0.0`, `lte=2.5.0` | None |
| `label` | Custom badge label | `My Package` | Auto-generated |
| `color` | Custom badge color | `purple`, `#ff0000` | Smart color |

### Smart Colors

- 🔵 **Blue**: Stable releases  
- 🟠 **Orange**: Prerelease versions
- ⚪ **Light Grey**: Not found

## 📖 Usage Examples

### Basic Usage

```bash
# Latest stable version
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget

# Latest including prereleases
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&include-prerelease=true
```

### Version Tracking

```bash
# Track latest v2.x versions
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&track=2

# Track v1.x with prereleases (accepts "v1" or "1" format)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=nuget&track=v1&include-prerelease=true
```

### Version Range Filtering

```bash
# Versions >= 6.0.0
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=6.0.0

# Versions between 3.0.0 and 6.0.0 (supports partial versions like "3.0")
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=3.0&lt=6.0

# Include prereleases in range (requires -0 suffix for prerelease inclusion)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=2.0.0-0&lt=3.0.0
```

### Custom Styling

```bash
# Custom label and color
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&label=JSON.NET&color=purple

# Custom color with hex code
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&color=%23ff6b35
```

### GitHub Packages

```bash
# Basic GitHub package (requires GITHUB_TOKEN in environment)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github&include-prerelease=true

# Standard semver behavior (may return timestamped versions)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github&include-prerelease=true
# Returns: 2.0.0-preview1-20250716-125702

# Prefer clean manual tags over automated timestamped builds
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github&include-prerelease=true&prefer-clean=true
# Returns: 2.0.0-preview1
```

## 🐙 GitHub Packages Special Features

### The `prefer-clean` Parameter

GitHub Packages often contain both manual tags and automated timestamped builds:

- `2.0.0-preview1` (manual tag)
- `2.0.0-preview1-20250716-125702` (automated build)

By semver rules, the timestamped version is "higher", but users usually want the clean manual tag.

```bash
# Without prefer-clean (standard semver - returns timestamped version)
?package=localstack.client&source=github&include-prerelease=true
# Result: 2.0.0-preview1-20250716-125702

# With prefer-clean (user-friendly - returns manual tag)  
?package=localstack.client&source=github&include-prerelease=true&prefer-clean=true
# Result: 2.0.0-preview1
```

### Parameter Variants

The API accepts multiple parameter name formats for convenience:

```bash
# All of these work for prerelease inclusion:
&include-prerelease=true
&includePrerelease=true  
&includeprerelease=true

# All of these work for clean version preference:
&prefer-clean=true
&preferClean=true
```

## 🎯 Real-World Examples

### Adding Badges to Your README

```markdown
<!-- NuGet package badge -->
![NuGet Version](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget)

<!-- GitHub package with clean versions preferred -->
![GitHub Package](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github&include-prerelease=true&prefer-clean=true&label=LocalStack.Client)

<!-- Tracking specific major version -->
![ASP.NET Core v8](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&track=8&label=ASP.NET%20Core%20v8)
```

### Popular Packages Examples

```bash
# Entity Framework Core (latest stable)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.EntityFrameworkCore&source=nuget

# Newtonsoft.Json with custom styling
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&label=JSON.NET&color=brightgreen

# .NET SDK preview versions
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.NETCore.App&source=nuget&include-prerelease=true&track=9

# Serilog latest in 3.x series
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Serilog&source=nuget&track=3
```

## 🔧 Troubleshooting

### Common Issues

#### Q: Badge shows "Package not found"

- Verify the package name is correct and publicly available
- For GitHub packages, ensure `GITHUB_TOKEN` environment variable is set
- Check if the package exists in the specified source (nuget.org vs GitHub Packages)

#### Q: Getting timestamped versions instead of clean tags

- Add `&prefer-clean=true` parameter for GitHub packages
- This only affects GitHub sources, NuGet doesn't have this issue

#### Q: Badge shows older version than expected

- Check if you're using version filters (`track`, `gte`, `lt`) that exclude newer versions
- For prereleases, ensure `include-prerelease=true` is set
- Verify the package actually has the version you expect

#### Q: Version range not working as expected

- Remember: `gte=2.0.0` excludes prereleases; use `gte=2.0.0-0` to include them
- Partial versions are supported: `gte=2.0` is equivalent to `gte=2.0.0`
- Use proper semver format for precise filtering

### Parameter Format Flexibility

All parameters support multiple naming conventions:

```bash
# These are equivalent:
&include-prerelease=true
&includePrerelease=true
&includeprerelease=true

# These are equivalent:
&prefer-clean=true
&preferClean=true
```

### Error Responses

The API returns descriptive error messages:

- `400`: Invalid parameters or malformed semver ranges
- `404`: Package not found in the specified source
- `500`: API or network errors when fetching package data

## 🛠️ Shields.io Integration

### Method 1: Endpoint Badge (Recommended)

Uses your API's response directly:

```markdown
![Package Version](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=YourPackage&source=nuget)
```

### Method 2: Additional Shields.io Styling

Add shields.io parameters for extra customization:

```markdown
![Package Version](https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=YourPackage&source=nuget&style=for-the-badge&logo=nuget)
```

### Benefits

- ✅ **Standards-compliant**: Follows shields.io endpoint badge schema
- ✅ **Flexible**: Powerful semver range filtering
- ✅ **Focused**: One version per request
- ✅ **Cacheable**: Better caching with specific requests
- ✅ **Performant**: Faster responses, smaller payloads

## 🏗️ Local Development

### Prerequisites

- Node.js 18+
- npm/yarn

### Setup

```bash
# Install dependencies
npm install

# Run comprehensive test suite
node test.mjs
```

### Environment Variables

```bash
# GitHub Packages (optional for GitHub tests)
GITHUB_TOKEN=your_github_token_here
```

### Testing Features

The consolidated `test.mjs` includes:

- ✅ **Basic functionality**: NuGet and GitHub package fetching
- ✅ **Two-track strategy**: LocalStack.Client v1.x maintenance & v2.x future
- ✅ **Parameter parsing**: All variants (include-prerelease, includePrerelease, etc.)
- ✅ **Version filtering**: Track, semver ranges, prerelease inclusion
- ✅ **GitHub features**: prefer-clean parameter for timestamped builds
- ✅ **Real API validation**: Compares results with actual NuGet/GitHub APIs
- ✅ **Error handling**: Invalid packages, malformed parameters
- ✅ **Edge cases**: Impossible ranges, non-existent versions

### Manual Testing Examples

```bash
# Test with logging enabled
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&log=true"

# Test two-track strategy
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=nuget&track=1"  # v1.x maintenance
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=nuget&track=2&include-prerelease=true"  # v2.x future

# Test GitHub prefer-clean feature
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github&include-prerelease=true&prefer-clean=true"
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test your changes with the provided test scripts
4. Submit a pull request

## 📝 License

MIT License - feel free to use this in your own projects!
