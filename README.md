# NuGet & GitHub Packages Badge API

A focused, parameter-driven Lambda API for generating dynamic package version badges using [shields.io endpoint badges](https://shields.io/badges/endpoint-badge).

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
| `track` | Major version to track | `1`, `2`, `3`, etc. | Latest overall |
| `include-prerelease` | Include prerelease versions | `true`, `false` | `false` |
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
# Latest version
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget

# Specific major version track  
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&track=2
```

### Version Range Filtering

```bash
# Versions greater than 6.0.0
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=6.0.0

# Versions between 3.0.0 and 6.0.0
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=3.0.0&lt=6.0.0
```

### Including Prereleases

```bash
# Include preview/beta versions
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&include-prerelease=true
```

### Custom Styling

```bash
# Custom label and color
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&label=JSON.NET&color=purple
```

### GitHub Packages

```bash
# GitHub Packages (requires GITHUB_TOKEN)
https://img.shields.io/endpoint?url=https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=localstack.client&source=github
```

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

## 🔄 Migration from Old API

**Old approach** (returned both v1 and v2):

```bash
https://api.com/package-name
# Returned: { v1: "1.5.2", v2: "2.1.0", v1_color: "blue", v2_color: "orange", ... }
```

**New approach** (focused, parameter-driven):

```bash
# Get v1 track
https://api.com/live/?package=package-name&track=1

# Get v2 track  
https://api.com/live/?package=package-name&track=2
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

# Run tests
node test-focused.mjs

# Test specific scenarios
node test-new-api.mjs
```

### Environment Variables

```bash
# GitHub Packages (optional)
GITHUB_TOKEN=your_github_token_here
```

### Testing Examples

```bash
# Test with logging enabled
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Newtonsoft.Json&source=nuget&log=true"

# Test track filtering
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&track=2"

# Test semver ranges
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/?package=Microsoft.AspNetCore.App&source=nuget&gte=2.0.0&lt=3.0.0"
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Test your changes with the provided test scripts
4. Submit a pull request

## 📝 License

MIT License - feel free to use this in your own projects!
