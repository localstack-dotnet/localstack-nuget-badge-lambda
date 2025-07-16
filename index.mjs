import axios from "axios";
import semver from "semver";

export const handler = async (event) => {
  /*──────────────────────────────────────
    1. Parse parameters
  ──────────────────────────────────────*/
  const qs = event.queryStringParameters || {};
  const pkg = qs.package?.toLowerCase() || (event.pathParameters?.proxy ?? "").split("/")[0].toLowerCase();
  const source = qs.source || "nuget"; // nuget or github
  const wantLogs = qs.log === "true"; // ?log=true to enable

  // Version filtering parameters
  const track = qs.track ? parseInt(qs.track) : null; // 1 or 2 for major version
  const gt = qs.gt || qs['>'];
  const gte = qs.gte || qs['>='];
  const lt = qs.lt || qs['<'];
  const lte = qs.lte || qs['<='];
  const eq = qs.eq || qs['='];
  const includePrerelease = qs['include-prerelease'] === 'true' || qs.includePrerelease === 'true';
  
  // UI customization
  const customLabel = qs.label;
  const customColor = qs.color;

  const log = (...a) => wantLogs && console.log(...a);

  log("🟢 START", { 
    pkg, source, track, 
    semverFilters: { gt, gte, lt, lte, eq }, 
    includePrerelease,
    customLabel, customColor
  });

  if (!pkg || !pkg.match(/^[a-z0-9_.-]+$/)) {
    log("🔴 Invalid package name");
    return createErrorResponse(400, "Invalid package name");
  }

  try {
    const versions = await fetchVersions(source, pkg, log);
    
    if (!versions || versions.length === 0) {
      log("🔴 No versions found");
      return createNotFoundResponse(pkg, customLabel, source);
    }

    log(`✅ ${versions.length} versions retrieved`);

    // Filter to valid semver versions
    const validVersions = versions.filter((v) => semver.valid(v));

    if (validVersions.length === 0) {
      log("🔴 No valid semver versions found");
      return createNotFoundResponse(pkg, customLabel, source);
    }

    /*────────────────────────────────────
      2. Apply filtering logic
    ────────────────────────────────────*/
    let filteredVersions = validVersions;

    // Apply major version track filter
    if (track) {
      filteredVersions = filteredVersions.filter((v) => {
        const parsed = semver.parse(v);
        return parsed && parsed.major === track;
      });
      log(`🎯 Track ${track} filter: ${filteredVersions.length} versions`);
    }

    // Apply prerelease filter
    if (!includePrerelease) {
      filteredVersions = filteredVersions.filter((v) => {
        const parsed = semver.parse(v);
        return parsed && parsed.prerelease.length === 0;
      });
      log(`🎯 Stable only filter: ${filteredVersions.length} versions`);
    }

    // Apply semver range filters
    if (gt) {
      filteredVersions = filteredVersions.filter(v => semver.gt(v, gt));
      log(`🎯 >${gt} filter: ${filteredVersions.length} versions`);
    }
    if (gte) {
      filteredVersions = filteredVersions.filter(v => semver.gte(v, gte));
      log(`🎯 >=${gte} filter: ${filteredVersions.length} versions`);
    }
    if (lt) {
      filteredVersions = filteredVersions.filter(v => semver.lt(v, lt));
      log(`🎯 <${lt} filter: ${filteredVersions.length} versions`);
    }
    if (lte) {
      filteredVersions = filteredVersions.filter(v => semver.lte(v, lte));
      log(`🎯 <=${lte} filter: ${filteredVersions.length} versions`);
    }
    if (eq) {
      filteredVersions = filteredVersions.filter(v => semver.eq(v, eq));
      log(`🎯 =${eq} filter: ${filteredVersions.length} versions`);
    }

    if (filteredVersions.length === 0) {
      log("🔴 No versions match filters");
      return createNotFoundResponse(pkg, customLabel, source, "No versions match criteria");
    }

    /*────────────────────────────────────
      3. Select best version
    ────────────────────────────────────*/
    let selectedVersion;
    
    if (source === "github") {
      // For GitHub, prefer clean versions over timestamped builds
      const baseVersions = new Map();
      filteredVersions.forEach(v => {
        const baseVersion = v.replace(/-\d{8}-\d{6}$/, '');
        if (!baseVersions.has(baseVersion) || v === baseVersion) {
          baseVersions.set(baseVersion, v);
        }
      });
      
      const uniqueVersions = Array.from(baseVersions.values());
      selectedVersion = uniqueVersions.sort(semver.rcompare)[0];
    } else {
      // For other sources, use standard semver sorting
      selectedVersion = filteredVersions.sort(semver.rcompare)[0];
    }

    log("🎯 Selected version:", selectedVersion);

    /*────────────────────────────────────
      4. Create response
    ────────────────────────────────────*/
    return createSuccessResponse(selectedVersion, pkg, source, customLabel, customColor);

  } catch (err) {
    console.error(`🔥 ${source} fetch error:`, err.message);
    
    // Handle specific errors that should return "not found" response
    if (err.response?.status === 404 || 
        err.message.includes('not found') || 
        err.message.includes('Package not found')) {
      log("🔴 Package not found, returning not found response");
      return createNotFoundResponse(pkg, customLabel, source, "Package not found");
    }
    
    // Other errors should still return error responses
    return createErrorResponse(500, err.message);
  }
};

/*──────────────────────────────────────
  Response builders
──────────────────────────────────────*/
function createSuccessResponse(version, packageName, source, customLabel, customColor) {
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

function createNotFoundResponse(packageName, customLabel, source, reason = "Package not found") {
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

function createErrorResponse(statusCode, message) {
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

function createDefaultLabel(packageName, source) {
  const sourceLabel = source === "github" ? "github" : "nuget";
  return `${packageName} ${sourceLabel}`;
}

function determineColor(version) {
  const parsed = semver.parse(version);
  if (parsed && parsed.prerelease && parsed.prerelease.length > 0) {
    return "orange"; // Prerelease versions
  }
  return "blue"; // Stable releases
}

/*──────────────────────────────────────
  Version fetching functions (unchanged)
──────────────────────────────────────*/

async function fetchVersions(source, pkg, log) {
  switch (source.toLowerCase()) {
    case "nuget":
      return await fetchNuGetVersions(pkg, log);
    case "github":
      return await fetchGitHubVersions(pkg, log);
    default:
      throw new Error(`Unsupported source: ${source}`);
  }
}

async function fetchNuGetVersions(pkg, log) {
  const url = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(pkg)}/index.json`;
  log("📡 GET NuGet", url);

  const { data } = await axios.get(url);
  return data.versions;
}

async function fetchGitHubVersions(pkg, log) {
  // For GitHub packages, we'll use a different approach
  // Expected format for pkg: just the package name (e.g., "localstack.client")
  // Organization will be inferred or configured separately
  
  // For now, we'll hardcode the known GitHub package info
  // In production, you'd want to make this configurable
  const githubConfig = {
    "localstack.client": {
      org: "localstack-dotnet",
      packageName: "LocalStack.Client"
    }
  };
  
  const config = githubConfig[pkg.toLowerCase()];
  if (!config) {
    throw new Error(`GitHub package not found: ${pkg}`);
  }
  
  const url = `https://api.github.com/orgs/${config.org}/packages/nuget/${encodeURIComponent(config.packageName)}/versions`;
  log("📡 GET GitHub", url);

  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // GitHub API often requires authentication for package access
  // You should set this environment variable with a GitHub PAT
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const { data } = await axios.get(url, { headers });
    
    // GitHub API returns versions in chronological order (newest first)
    // We should trust this ordering rather than re-sorting with semver
    // which can incorrectly rank timestamp-based versions higher
    const versionNames = data.map(version => version.name);
    
    log("📋 GitHub versions (chronological):", versionNames);
    
    return versionNames;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error("GitHub API requires authentication. Set GITHUB_TOKEN environment variable.");
    }
    if (error.response?.status === 404) {
      throw new Error(`GitHub package not found: ${config.org}/${config.packageName}`);
    }
    throw error;
  }
}
