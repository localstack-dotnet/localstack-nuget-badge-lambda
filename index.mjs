// index.mjs
import axios from "axios";
import semver from "semver";

export const handler = async (event) => {
  /*──────────────────────────────────────
    1. Query / path plumbing
  ──────────────────────────────────────*/
  const qs = event.queryStringParameters || {};
  const pkg = (event.pathParameters?.proxy ?? "").split("/")[0].toLowerCase();
  const wantPrerelease = qs.includePrerelease === "true";
  const wantLogs = qs.log !== "false"; // ?log=false to silence

  const log = (...a) => wantLogs && console.log(...a);

  log("🟢 START", { pkg, wantPrerelease });

  if (!pkg.match(/^[a-z0-9_.-]+$/)) {
    log("🔴 Invalid package name");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad package name" }),
    };
  }

  /*──────────────────────────────────────
    2. Fetch versions from NuGet
  ──────────────────────────────────────*/
  const url = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(
    pkg
  )}/index.json`;
  log("📡 GET", url);

  try {
    const { data } = await axios.get(url);
    log(`✅ ${data.versions.length} versions retrieved`);

    // keep only strings semver can really parse
    const valid = data.versions.filter((v) => semver.valid(v));

    /*────────────────────────────────────
      3. Pick latest per major
    ────────────────────────────────────*/
    const latestOf = (major) =>
      valid
        .filter((v) => {
          const p = semver.parse(v);
          return (
            p.major === major && (wantPrerelease || p.prerelease.length === 0)
          );
        })
        .sort(semver.rcompare)[0] ?? "not found";

    const v1 = latestOf(1);
    const v2 = latestOf(2);

    log("🎯 Selected", { v1, v2 });

    /*────────────────────────────────────
      4. Badge payload
    ────────────────────────────────────*/
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
      body: JSON.stringify({
        schemaVersion: 1,
        label: "nuget",
        message: `${v1} | ${v2}`,
        v1_track: v1,
        v2_track: v2,
        includePrerelease: wantPrerelease,
      }),
    };
  } catch (err) {
    console.error("🔥 NuGet fetch error:", err.message);
    return {
      statusCode: err.response?.status || 500,
      body: JSON.stringify({ error: `Failed to fetch ${pkg}` }),
    };
  }
};
