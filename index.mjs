import axios from "axios";
import semver from "semver";

export const handler = async (event) => {
  /*──────────────────────────────────────
    1. Query / path plumbing
  ──────────────────────────────────────*/
  const qs = event.queryStringParameters || {};
  const pkg = (event.pathParameters?.proxy ?? "").split("/")[0].toLowerCase();
  const wantPrerelease = qs.includePrerelease === "true";
  const wantLogs = qs.log === "true"; // ?log=true to enable
  const source = qs.source || "nuget"; // nuget or github

  const log = (...a) => wantLogs && console.log(...a);

  log("🟢 START", { pkg, wantPrerelease, source });

  if (!pkg.match(/^[a-z0-9_.-]+$/)) {
    log("🔴 Invalid package name");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad package name" }),
    };
  }

  try {
    const versions = await fetchVersions(source, pkg, log);
    
    if (!versions || versions.length === 0) {
      log("🔴 No versions found");
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Package not found" }),
      };
    }

    log(`✅ ${versions.length} versions retrieved`);

    // keep only strings semver can really parse
    const valid = versions.filter((v) => semver.valid(v));

    /*────────────────────────────────────
      3. Pick latest per major
    ────────────────────────────────────*/
    const latestOf = (major) => {
      const candidates = valid.filter((v) => {
        const p = semver.parse(v);
        return (
          p.major === major && (wantPrerelease || p.prerelease.length === 0)
        );
      });
      
      if (candidates.length === 0) return "not found";
      
      // For GitHub packages, prefer versions without timestamp suffixes
      // when multiple versions with same base exist
      if (source === "github") {
        // Group by base version (remove timestamp-like suffixes)
        const baseVersions = new Map();
        candidates.forEach(v => {
          // Remove timestamp patterns like "-20250716-125702"
          const baseVersion = v.replace(/-\d{8}-\d{6}$/, '');
          if (!baseVersions.has(baseVersion) || v === baseVersion) {
            baseVersions.set(baseVersion, v);
          }
        });
        
        // Sort the unique base versions and return the latest
        const uniqueVersions = Array.from(baseVersions.values());
        return uniqueVersions.sort(semver.rcompare)[0];
      }
      
      // For other sources, use standard semver sorting
      return candidates.sort(semver.rcompare)[0];
    };

    const v1 = latestOf(1);
    const v2 = latestOf(2);

    log("🎯 Selected", { v1, v2 });

    /*────────────────────────────────────
      4. Determine colors based on prerelease status
    ────────────────────────────────────*/
    const v1Color = determineColor(v1);
    const v2Color = determineColor(v2);

    /*────────────────────────────────────
      5. Badge payload with configurable elements
    ────────────────────────────────────*/
    const logo = source === "github" ? "github" : "nuget";
    const label = source === "github" ? "github packages" : "nuget";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
      },
      body: JSON.stringify({
        schemaVersion: 1,
        label: label,
        message: `${v1} | ${v2}`,
        logo: logo,
        color: determineOverallColor(v1Color, v2Color),
        v1_track: v1,
        v2_track: v2,
        v1_color: v1Color,
        v2_color: v2Color,
        v1_logo: logo,
        v2_logo: logo,
        v1_label: getVersionLabel(pkg, "v1", source),
        v2_label: getVersionLabel(pkg, "v2", source),
        includePrerelease: wantPrerelease,
        source: source,
      }),
    };
  } catch (err) {
    console.error(`🔥 ${source} fetch error:`, err.message);
    
    // Determine appropriate status code
    let statusCode = 500; // Default to internal server error
    
    if (err.response?.status) {
      // HTTP error from external API (axios error)
      statusCode = err.response.status;
    } else if (err.message.includes('not found') || err.message.includes('configuration not found')) {
      // Custom "not found" errors should be 404
      statusCode = 404;
    } else if (err.message.includes('authentication') || err.message.includes('unauthorized')) {
      // Authentication errors should be 401
      statusCode = 401;
    }
    
    return {
      statusCode: statusCode,
      body: JSON.stringify({ error: `Failed to fetch ${pkg} from ${source}` }),
    };
  }
};

/*──────────────────────────────────────
  Helper Functions
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

function determineColor(version) {
  if (version === "not found") {
    return "lightgrey";
  }
  
  const parsed = semver.parse(version);
  if (parsed && parsed.prerelease && parsed.prerelease.length > 0) {
    return "orange"; // Prerelease versions
  }
  
  return "blue"; // Stable releases
}

function determineOverallColor(v1Color, v2Color) {
  // If either version is orange (prerelease), use orange
  if (v1Color === "orange" || v2Color === "orange") {
    return "orange";
  }
  
  // If both are blue (stable), use blue
  if (v1Color === "blue" && v2Color === "blue") {
    return "blue";
  }
  
  // Default to lightgrey if any "not found"
  return "lightgrey";
}

function getVersionLabel(packageName, version, source = "nuget") {
  // Create readable labels for the badges
  const cleanName = packageName.replace(/[.-]/g, " ");
  const title = cleanName.split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(".");
    
  const sourcePrefix = source === "github" ? "GH" : "NG";
  return `${title} ${version}`;
}
