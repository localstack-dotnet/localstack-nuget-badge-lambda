import axios from "axios";
import semver from "semver";
import {
  createSuccessResponse,
  createNotFoundResponse,
  createErrorResponse,
  validateAndCoerceVersion,
  parseTrackWithValidation
} from "../utils/common.mjs";

/*──────────────────────────────────────
  Package Badge Handler
  Handles both legacy (query param) and new (path param) package badges
──────────────────────────────────────*/

export const packageHandler = {
  async handle(event, packageFromPath = null) {
    // Validate and parse parameters
    let validatedParams;
    try {
      validatedParams = validateAndParseParameters(event.queryStringParameters || {}, event.pathParameters, packageFromPath);
    } catch (error) {
      return createErrorResponse(400, error.message);
    }

    const { 
      pkg, source, wantLogs, track, semverFilters, 
      includePrerelease, preferClean, customLabel, customColor 
    } = validatedParams;

    const log = (...a) => wantLogs && console.log(...a);

    log("🟢 START Package Badge", { 
      pkg, source, track, 
      semverFilters, 
      includePrerelease,
      preferClean,
      customLabel, customColor
    });

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
        Apply filtering logic
      ────────────────────────────────────*/
      let filteredVersions = validVersions;

      // Apply major version track filter
      if (track !== null) {
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
      const { gt, gte, lt, lte, eq } = semverFilters;
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
        Select best version
      ────────────────────────────────────*/
      let selectedVersion;
      
      if (source === "github" && preferClean) {
        // For GitHub with prefer-clean: prefer manually tagged versions over timestamped builds
        // This handles cases like preferring '2.0.0-preview1' over '2.0.0-preview1-20250716-125702'
        const versionPreference = new Map();
        filteredVersions.forEach(v => {
          const baseVersion = v.replace(/-\d{8}-\d{6}$/, ''); // Remove timestamp suffix
          const isCleanVersion = v === baseVersion;
          
          if (!versionPreference.has(baseVersion) || isCleanVersion) {
            versionPreference.set(baseVersion, v);
          }
        });
        
        const preferredVersions = Array.from(versionPreference.values());
        selectedVersion = preferredVersions.sort(semver.rcompare)[0];
        log(`🧹 GitHub prefer-clean applied: ${preferredVersions.length} preferred versions`);
      } else {
        // Standard semver sorting for all other cases
        selectedVersion = filteredVersions.sort(semver.rcompare)[0];
      }

      log("🎯 Selected version:", selectedVersion);

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
  }
};

/*──────────────────────────────────────
  Parameter validation and parsing
──────────────────────────────────────*/

function validateAndParseParameters(qs, pathParameters, packageFromPath) {
  // 1. Extract and validate package name
  // Support both new explicit path param and legacy query param
  let pkg;
  if (packageFromPath) {
    // New explicit route: /badge/packages/{package-name}
    pkg = packageFromPath.toLowerCase().trim();
  } else {
    // Legacy route: /?package=xyz
    pkg = (qs.package?.toLowerCase() || (pathParameters?.proxy ?? "").split("/")[0].toLowerCase()).trim();
  }
  
  if (!pkg) {
    throw new Error("Package name is required");
  }
  
  if (!pkg.match(/^[a-z0-9_.-]+$/)) {
    throw new Error("Invalid package name format");
  }

  // 2. Validate source
  const sourceParam = qs.source;
  let source;
  
  if (sourceParam === undefined || sourceParam === null) {
    source = "nuget"; // Default value
  } else if (sourceParam === "" || sourceParam.trim() === "" || !["nuget", "github"].includes(sourceParam)) {
    throw new Error(`Invalid source '${sourceParam}'. Must be 'nuget' or 'github'`);
  } else {
    source = sourceParam;
  }

  // 3. Parse and validate version tracking
  const track = parseTrackWithValidation(qs.track);

  // 4. Parse and validate semver range filters (fail-fast on invalid semver)
  const semverFilters = {
    gt: validateAndCoerceVersion(qs.gt || qs['>'], 'gt'),
    gte: validateAndCoerceVersion(qs.gte || qs['>='], 'gte'),
    lt: validateAndCoerceVersion(qs.lt || qs['<'], 'lt'),
    lte: validateAndCoerceVersion(qs.lte || qs['<='], 'lte'),
    eq: validateAndCoerceVersion(qs.eq || qs['='], 'eq')
  };

  // 5. Parse boolean flags
  const includePrerelease = qs['include-prerelease'] === 'true' || 
                           qs.includePrerelease === 'true' || 
                           qs.includeprerelease === 'true';
  
  const preferClean = qs['prefer-clean'] === 'true' || qs.preferClean === 'true';
  const wantLogs = qs.log === 'true';

  // 6. UI customization (no validation needed)
  const customLabel = qs.label;
  const customColor = qs.color;

  return {
    pkg,
    source: source,
    track,
    semverFilters,
    includePrerelease,
    preferClean,
    wantLogs,
    customLabel,
    customColor
  };
}

/*──────────────────────────────────────
  Version fetching functions
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
  // For GitHub packages, we use a fixed organization but allow any package name
  // This is our current limitation as documented in the README
  
  // Fixed organization for all GitHub packages
  const githubOrg = "localstack-dotnet";
  
  // Convert package name to proper case for GitHub API
  // e.g., "localstack.client.extensions" -> "LocalStack.Client.Extensions"
  const packageName = pkg
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('.');
  
  const url = `https://api.github.com/orgs/${githubOrg}/packages/nuget/${encodeURIComponent(packageName)}/versions`;
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
      throw new Error(`GitHub package not found: ${githubOrg}/${packageName}`);
    }
    throw error;
  }
} 