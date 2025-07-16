# Enhanced NuGet Badge API

A Lambda function that provides dynamic badge information for NuGet and GitHub packages, with configurable UI elements and intelligent color coding.

## Features

- **Multiple Package Sources**: Support for both NuGet.org and GitHub Packages
- **Configurable UI Elements**: Dynamic logo, color, and label configuration
- **Smart Color Logic**: 
  - 🔵 Blue for stable releases
  - 🟠 Orange for preview/prerelease versions
  - ⚪ Light grey for packages not found
- **Version Tracking**: Separate v1 and v2 series tracking
- **img.shields.io Compatible**: Returns JSON format compatible with shields.io dynamic badges

## API Usage

### Basic NuGet Package (Default)

```
GET /your-api-endpoint/localstack.client
```

### GitHub Packages

```
GET /your-api-endpoint/localstack.client?source=github
```

### With Prerelease Versions

```
GET /your-api-endpoint/localstack.client?includePrerelease=true
```

### With Logging Enabled

```
GET /your-api-endpoint/localstack.client?log=true
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `source` | string | `nuget` | Package source: `nuget` or `github` |
| `includePrerelease` | boolean | `false` | Include prerelease versions |
| `log` | boolean | `false` | Enable debug logging |

## Response Format

The API returns a JSON object with the following structure:

```json
{
  "schemaVersion": 1,
  "label": "nuget",
  "message": "1.2.3 | 2.1.0",
  "logo": "nuget",
  "color": "blue",
  "v1_track": "1.2.3",
  "v2_track": "2.1.0",
  "v1_color": "blue",
  "v2_color": "blue",
  "v1_logo": "nuget",
  "v2_logo": "nuget",
  "v1_label": "LocalStack.Client v1",
  "v2_label": "LocalStack.Client v2",
  "includePrerelease": false,
  "source": "nuget"
}
```

## img.shields.io Integration

### For v1 series:

```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyour-api-endpoint%2FlocalStack.client%3FincludePrerelease%3Dtrue
  &query=$.v1_track
  &label=LocalStack.Client%20v1
  &logo=nuget
  &color=blue
```

### For v2 series:

```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyour-api-endpoint%2FlocalStack.client%3FincludePrerelease%3Dtrue
  &query=$.v2_track
  &label=LocalStack.Client%20v2
  &logo=nuget
  &color=brightgreen
```

### Using Dynamic Colors:

You can also use the dynamic color information:

```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyour-api-endpoint%2FlocalStack.client
  &query=$.v1_track
  &label=LocalStack.Client%20v1
  &logo=nuget
  &colorB=query:$.v1_color
```

## GitHub Packages Setup

For GitHub Packages support, you need to:

1. **Set Environment Variable**: Add your GitHub Personal Access Token (PAT) as `GITHUB_TOKEN` environment variable
2. **Configure Package Mapping**: Add your GitHub package configuration in the `githubConfig` object in `index.mjs`

### GitHub PAT Requirements

Your GitHub PAT needs the following scope:
- `read:packages` - To read package information

### Example GitHub Configuration

```javascript
const githubConfig = {
  "localstack.client": {
    org: "localstack-dotnet",
    packageName: "LocalStack.Client"
  },
  "your.package": {
    org: "your-org",
    packageName: "Your.Package.Name"
  }
};
```

## Color Logic

The API automatically determines colors based on version characteristics:

- **Blue**: Stable releases (no prerelease identifiers)
- **Orange**: Preview/prerelease versions (contains prerelease identifiers like `-alpha`, `-beta`, `-rc`)
- **Light Grey**: Package not found

The overall badge color is determined by:
1. If either v1 or v2 is prerelease → Orange
2. If both are stable → Blue  
3. If any version not found → Light Grey

## Deployment

This is designed to run as an AWS Lambda function with the following requirements:

### Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "semver": "^7.5.0"
  }
}
```

### Environment Variables

- `GITHUB_TOKEN` (optional): GitHub Personal Access Token for GitHub Packages access

### Lambda Configuration

- Runtime: Node.js 18.x or later
- Handler: `index.handler`
- Timeout: 30 seconds
- Memory: 128 MB

## Examples

### NuGet Package Response

```bash
curl "https://your-api-endpoint/newtonsoft.json"
```

```json
{
  "schemaVersion": 1,
  "label": "nuget",
  "message": "not found | 13.0.3",
  "logo": "nuget",
  "color": "blue",
  "v1_track": "not found",
  "v2_track": "13.0.3",
  "v1_color": "lightgrey",
  "v2_color": "blue",
  "v1_logo": "nuget",
  "v2_logo": "nuget",
  "v1_label": "Newtonsoft.Json v1",
  "v2_label": "Newtonsoft.Json v2",
  "includePrerelease": false,
  "source": "nuget"
}
```

### GitHub Package Response

```bash
curl "https://your-api-endpoint/localstack.client?source=github"
```

```json
{
  "schemaVersion": 1,
  "label": "github packages",
  "message": "1.5.2 | 2.1.0-preview",
  "logo": "github",
  "color": "orange",
  "v1_track": "1.5.2",
  "v2_track": "2.1.0-preview",
  "v1_color": "blue",
  "v2_color": "orange",
  "v1_logo": "github",
  "v2_logo": "github",
  "v1_label": "LocalStack.Client v1",
  "v2_label": "LocalStack.Client v2",
  "includePrerelease": false,
  "source": "github"
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Invalid package name
- `404`: Package not found
- `401`: GitHub authentication required
- `500`: Server error

Error responses include descriptive error messages:

```json
{
  "error": "GitHub API requires authentication. Set GITHUB_TOKEN environment variable."
}
``` 