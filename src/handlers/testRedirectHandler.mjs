import { gistService } from "../services/gistService.mjs";
import { createRedirectResponse, create400Response } from "../utils/common.mjs";

/*──────────────────────────────────────
  Test Redirect Handler
  Redirects to GitHub test result pages
──────────────────────────────────────*/

export const testRedirectHandler = {
  async handle(event, platform) {
    console.log(`🔗 Generating redirect for platform: ${platform}`);

    // Extract and validate track parameter
    const track = event.queryStringParameters?.track;
    const packageName = event.queryStringParameters?.package;
    let validatedTrack = "v2"; // Default to v2
    let defaultPackageName = "Aspire.Hosting.LocalStack"; // Default package
    let withPackage = false;

    if (track !== undefined && track !== null) {
      if (track !== "v1" && track !== "v2") {
        return create400Response(
          "Invalid track parameter. Must be 'v1' or 'v2'"
        );
      }
      validatedTrack = track;
    } else if (packageName !== undefined && packageName !== null) {
      if (packageName !== "Aspire.Hosting.LocalStack") {
        return create400Response(
          "Invalid package parameter. Must be 'Aspire.Hosting.LocalStack' if track is not specified"
        );
      }
      withPackage = true;
    }

    if (withPackage) {
      console.log(`🏷️ Using package: ${packageName}`);
    } else {
      console.log(`🏷️ Using track: ${validatedTrack}`);
    }

    try {
      // Fetch redirect URL from Gist
      const redirectUrl = await gistService.getRedirectUrl(
        platform,
        validatedTrack,
        withPackage ? defaultPackageName : null
      );

      if (redirectUrl) {
        console.log(
          `✅ Redirect URL found for ${platform} (track: ${validatedTrack}): ${redirectUrl}`
        );
      } else {
        console.log(
          `⚠️ No redirect URL available for ${platform} (track: ${validatedTrack}), using fallback`
        );
      }

      // Use fallback URL if no specific URL available
      const fallbackUrl = withPackage
        ? "https://github.com/localstack-dotnet/dotnet-aspire-for-localstack/actions"
        : "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";

      return createRedirectResponse(redirectUrl, fallbackUrl);
    } catch (error) {
      console.error(
        `🔥 Error generating redirect for ${platform} (track: ${validatedTrack}):`,
        error.message
      );

      // Use fallback URL if no specific URL available
      const fallbackUrl = withPackage
        ? "https://github.com/localstack-dotnet/dotnet-aspire-for-localstack/actions"
        : "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      return createRedirectResponse(null, fallbackUrl);
    }
  },
};
