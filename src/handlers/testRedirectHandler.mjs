import { gistService } from '../services/gistService.mjs';
import { createRedirectResponse, create400Response } from '../utils/common.mjs';

/*──────────────────────────────────────
  Test Redirect Handler
  Redirects to GitHub test result pages
──────────────────────────────────────*/

export const testRedirectHandler = {
  async handle(event, platform) {
    console.log(`🔗 Generating redirect for platform: ${platform}`);
    
    // Extract and validate track parameter
    const track = event.queryStringParameters?.track;
    let validatedTrack = 'v2'; // Default to v2
    
    if (track !== undefined && track !== null) {
      if (track !== 'v1' && track !== 'v2') {
        return create400Response("Invalid track parameter. Must be 'v1' or 'v2'");
      }
      validatedTrack = track;
    }
    
    console.log(`🏷️ Using track: ${validatedTrack}`);
    
    try {
      // Fetch redirect URL from Gist
      const redirectUrl = await gistService.getRedirectUrl(platform, validatedTrack);
      
      if (redirectUrl) {
        console.log(`✅ Redirect URL found for ${platform} (track: ${validatedTrack}): ${redirectUrl}`);
      } else {
        console.log(`⚠️ No redirect URL available for ${platform} (track: ${validatedTrack}), using fallback`);
      }

      // Use fallback URL if no specific URL available
      const fallbackUrl = "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      
      return createRedirectResponse(redirectUrl, fallbackUrl);

    } catch (error) {
      console.error(`🔥 Error generating redirect for ${platform} (track: ${validatedTrack}):`, error.message);
      
      // Return fallback redirect on error
      const fallbackUrl = "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      return createRedirectResponse(null, fallbackUrl);
    }
  }
}; 