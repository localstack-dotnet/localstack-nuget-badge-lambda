import semver from "semver";

/*──────────────────────────────────────
  Response builders for shields.io compatibility
──────────────────────────────────────*/

export function createSuccessResponse(version, packageName, source, customLabel, customColor) {
  const color = customColor || determineColor(version);
  const label = customLabel || createDefaultLabel(packageName, source);
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
    },
    body: JSON.stringify({
      schemaVersion: 1,
      label: label,
      message: version,
      color: color,
      namedLogo: source === "github" ? "github" : "nuget"
    }),
  };
}

export function createNotFoundResponse(packageName, customLabel, source, reason = "Package not found") {
  const label = customLabel || createDefaultLabel(packageName, source);
  
  return {
    statusCode: 200, // Still return 200 for shields.io
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300", // Shorter cache for not found
    },
    body: JSON.stringify({
      schemaVersion: 1,
      label: label,
      message: "not found",
      color: "lightgrey",
      namedLogo: source === "github" ? "github" : "nuget"
    }),
  };
}

export function createErrorResponse(statusCode, message) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      error: message 
    }),
  };
}

export function create404Response(message) {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      error: message 
    }),
  };
}

/*──────────────────────────────────────
  Test badge response builders
──────────────────────────────────────*/

export function createTestBadgeResponse(testData, platform) {
  let message, color;
  
  if (!testData) {
    message = "unavailable";
    color = "lightgrey";
  } else if (testData.failed > 0) {
    message = `${testData.failed} failed, ${testData.passed} passed`;
    color = "critical";
  } else {
    message = `${testData.passed} passed`;
    color = "success";
  }
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": testData ? "public, max-age=300" : "public, max-age=60", // Shorter cache for unavailable
    },
    body: JSON.stringify({
      schemaVersion: 1,
      label: "tests",
      message: message,
      color: color,
      cacheSeconds: testData ? 300 : 60
    }),
  };
}

export function createRedirectResponse(url, fallbackUrl) {
  const redirectUrl = url || fallbackUrl || "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
  
  return {
    statusCode: 302,
    headers: {
      "Location": redirectUrl,
      "Cache-Control": "public, max-age=300",
    },
    body: ""
  };
}

/*──────────────────────────────────────
  Helper functions
──────────────────────────────────────*/

export function createDefaultLabel(packageName, source) {
  const sourceLabel = source === "github" ? "github" : "nuget";
  return `${packageName} ${sourceLabel}`;
}

export function determineColor(version) {
  const parsed = semver.parse(version);
  if (parsed && parsed.prerelease && parsed.prerelease.length > 0) {
    return "orange"; // Prerelease versions
  }
  return "blue"; // Stable releases
}

/*──────────────────────────────────────
  Parameter validation utilities
──────────────────────────────────────*/

export function validateAndCoerceVersion(version, paramName) {
  if (!version) return null;
  
  try {
    // First check if it looks like a reasonable version string
    if (!/^[\d.]+(-[\w.-]+)?(\+[\w.-]+)?$/.test(version.toString())) {
      throw new Error(`Invalid semver format for parameter '${paramName}': '${version}'`);
    }
    
    // Check for invalid patterns like too many dots
    const versionStr = version.toString();
    const parts = versionStr.split('.');
    if (parts.length > 3 && !versionStr.includes('-') && !versionStr.includes('+')) {
      throw new Error(`Invalid semver format for parameter '${paramName}': '${version}'`);
    }
    
    const coerced = semver.coerce(version);
    if (coerced) return coerced.version;
    
    // If coercion fails, throw descriptive error
    throw new Error(`Invalid semver format for parameter '${paramName}': '${version}'`);
  } catch (error) {
    if (error.message.includes('Invalid semver format')) {
      throw error; // Re-throw our custom error
    }
    throw new Error(`Invalid semver format for parameter '${paramName}': '${version}'`);
  }
}

export function parseTrackWithValidation(trackParam) {
  if (!trackParam) return null;
  
  // Handle "v1", "v2", "1", "2" formats
  const cleaned = trackParam.toString().toLowerCase().replace(/^v/, '');
  
  // Check for decimal numbers first
  if (cleaned.includes('.')) {
    throw new Error(`Invalid track parameter: '${trackParam}'. Must be a positive integer (e.g., '1', 'v2')`);
  }
  
  const parsed = parseInt(cleaned);
  
  if (isNaN(parsed) || parsed < 0 || cleaned !== parsed.toString()) {
    throw new Error(`Invalid track parameter: '${trackParam}'. Must be a positive integer (e.g., '1', 'v2')`);
  }
  
  return parsed;
}

export function extractPlatform(path) {
  const parts = path.split('/');
  return parts[parts.length - 1]; // Get the last part
}

export function isValidPlatform(platform) {
  return ['linux', 'windows', 'macos'].includes(platform);
} 