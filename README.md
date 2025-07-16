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

### Live Endpoint

**Production API**: `https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/`

### Basic NuGet Package (Default)

```
GET /your-api-endpoint/localstack.client
GET https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client
```

### GitHub Packages

```
GET /your-api-endpoint/localstack.client?source=github
GET https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client?source=github
```

### With Prerelease Versions

```
GET /your-api-endpoint/localstack.client?includePrerelease=true
GET https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client?includePrerelease=true
```

### With Logging Enabled

```
GET /your-api-endpoint/localstack.client?log=true
GET https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client?log=true
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

### For v1 series (Fully Dynamic):

```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyour-api-endpoint%2FlocalStack.client%3FincludePrerelease%3Dtrue
  &query=$.v1_track
  &label=query:$.v1_label
  &logo=query:$.v1_logo
  &color=query:$.v1_color
```

### For v2 series (Fully Dynamic):

```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyour-api-endpoint%2FlocalStack.client%3FincludePrerelease%3Dtrue
  &query=$.v2_track
  &label=query:$.v2_label
  &logo=query:$.v2_logo
  &color=query:$.v2_color
```

### Live Examples

**NuGet v1 Badge:**
```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3FincludePrerelease%3Dtrue
  &query=$.v1_track
  &label=query:$.v1_label
  &logo=query:$.v1_logo
  &color=query:$.v1_color
```

[![NuGet v1](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3FincludePrerelease%3Dtrue&query=$.v1_track&label=query:$.v1_label&logo=query:$.v1_logo&color=query:$.v1_color)](https://www.nuget.org/packages/LocalStack.Client/)

**NuGet v2 Badge:**
```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3FincludePrerelease%3Dtrue
  &query=$.v2_track
  &label=query:$.v2_label
  &logo=query:$.v2_logo
  &color=query:$.v2_color
```

[![NuGet v2](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3FincludePrerelease%3Dtrue&query=$.v2_track&label=query:$.v2_label&logo=query:$.v2_logo&color=query:$.v2_color)](https://www.nuget.org/packages/LocalStack.Client/)

**GitHub Packages v2 Badge:**
```
https://img.shields.io/badge/dynamic/json.svg
  ?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3Fsource%3Dgithub%26includePrerelease%3Dtrue
  &query=$.v2_track
  &label=query:$.v2_label
  &logo=query:$.v2_logo
  &color=query:$.v2_color
```

[![GitHub v2](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fyvfdbfas85.execute-api.eu-central-1.amazonaws.com%2Flive%2Flocalstack.client%3Fsource%3Dgithub%26includePrerelease%3Dtrue&query=$.v2_track&label=query:$.v2_label&logo=query:$.v2_logo&color=query:$.v2_color)](https://github.com/orgs/localstack-dotnet/packages/nuget/package/LocalStack.Client)

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

## Local Development

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd localstack-nuget-badge-lambda
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Copy template file
   cp .env.dist .env
   
   # Edit .env and set your GitHub token
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

3. **Get GitHub Personal Access Token:**
   - Go to: **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
   - Click **"Generate new token (classic)"**
   - Select scopes: ✅ `read:packages` ✅ `read:org` 
   - Copy the token and add it to `.env`

### Running Tests

```bash
# Run comprehensive test suite
npm test

# Tests will show:
# ✅ NuGet API integration
# ✅ GitHub Packages API integration (if token set)
# ✅ Error handling and edge cases
# ✅ Version selection logic
# ✅ Color and UI logic
```

### Test Output Example

```
🚀 LOCALSTACK BADGE API TESTS
============================================================
🔑 GitHub Token: ✅ Set
============================================================

[1/8] ✅ NuGet - LocalStack.Client (with prerelease)
      📊 Message: 1.6.0 | 2.0.0-preview1
      🎨 Colors: v1=blue, v2=orange, overall=orange

[2/8] ✅ GitHub - LocalStack.Client (with prerelease)  
      📊 Message: not found | 2.0.0-preview1
      🎨 Colors: v1=lightgrey, v2=orange, overall=orange

============================================================
📋 TEST SUMMARY: ✅ Passed: 8, ❌ Failed: 0, 📊 Total: 8
```

## Deployment

This is designed to run as an AWS Lambda function with the following requirements:

### Dependencies

```json
{
  "dependencies": {
    "axios": "^1.10.0",
    "semver": "^7.7.2",
    "dotenv": "^16.0.0"
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
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client?includePrerelease=true"
```

```json
{
  "schemaVersion": 1,
  "label": "nuget",
  "message": "1.6.0 | 2.0.0-preview1",
  "logo": "nuget",
  "color": "orange",
  "v1_track": "1.6.0",
  "v2_track": "2.0.0-preview1",
  "v1_color": "blue",
  "v2_color": "orange",
  "v1_logo": "nuget",
  "v2_logo": "nuget",
  "v1_label": "Localstack.Client v1",
  "v2_label": "Localstack.Client v2",
  "includePrerelease": true,
  "source": "nuget"
}
```

### GitHub Package Response

```bash
curl "https://yvfdbfas85.execute-api.eu-central-1.amazonaws.com/live/localstack.client?source=github&includePrerelease=true"
```

```json
{
  "schemaVersion": 1,
  "label": "github packages",
  "message": "not found | 2.0.0-preview1",
  "logo": "github",
  "color": "orange",
  "v1_track": "not found",
  "v2_track": "2.0.0-preview1",
  "v1_color": "lightgrey",
  "v2_color": "orange",
  "v1_logo": "github",
  "v2_logo": "github",
  "v1_label": "Localstack.Client v1",
  "v2_label": "Localstack.Client v2",
  "includePrerelease": true,
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