const axios = require("axios");
const semver = require("semver");

// The handler function that AWS Lambda will invoke
exports.handler = async (event) => {
  // Get the package name from the URL path, e.g., /YourPackage
  // This makes the Lambda reusable for other packages if needed!
  const packageName = event.pathParameters?.packageName;

  if (!packageName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Package name is required in the URL path.",
      }),
    };
  }

  const nugetApiUrl = `https://api.nuget.org/v3/flatcontainer/${packageName}/index.json`;

  try {
    // 1. Fetch all versions from the NuGet API
    const response = await axios.get(nugetApiUrl);
    const allVersions = response.data.versions;

    // 2. Filter versions into v1 and v2 tracks using semver
    const v1Versions = allVersions.filter((v) => semver.satisfies(v, "1.x"));
    const v2Versions = allVersions.filter((v) => semver.satisfies(v, "2.x"));

    // 3. Sort each track to find the latest version
    // semver.rcompare sorts in reverse order (newest first)
    v1Versions.sort(semver.rcompare);
    v2Versions.sort(semver.rcompare);

    const latestV1 = v1Versions.length > 0 ? v1Versions[0] : "not found";
    const latestV2 = v2Versions.length > 0 ? v2Versions[0] : "not found";

    // 4. Construct the clean JSON response for Shields.io
    const responseBody = {
      schemaVersion: 1,
      label: "nuget",
      message: `${latestV1} | ${latestV2}`, // A combined message
      // Or structure it for separate badges
      v1_track: latestV1,
      v2_track: latestV2,
    };

    return {
      statusCode: 200,
      headers: {
        // Important for caching and letting browsers/shields.io know it's JSON
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: `Failed to fetch versions for ${packageName}.`,
      }),
    };
  }
};
