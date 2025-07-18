import { gistService } from '../services/gistService.mjs';
import { createRedirectResponse } from '../utils/common.mjs';

/*──────────────────────────────────────
  Test Redirect Handler
  Redirects to GitHub test result pages
──────────────────────────────────────*/

export const testRedirectHandler = {
  async handle(event, platform) {
    console.log(`🔗 Generating redirect for platform: ${platform}`);
    
    try {
      // Fetch redirect URL from Gist
      const redirectUrl = await gistService.getRedirectUrl(platform);
      
      if (redirectUrl) {
        console.log(`✅ Redirect URL found for ${platform}: ${redirectUrl}`);
      } else {
        console.log(`⚠️ No redirect URL available for ${platform}, using fallback`);
      }

      // Use fallback URL if no specific URL available
      const fallbackUrl = "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      
      return createRedirectResponse(redirectUrl, fallbackUrl);

    } catch (error) {
      console.error(`🔥 Error generating redirect for ${platform}:`, error.message);
      
      // Return fallback redirect on error
      const fallbackUrl = "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      return createRedirectResponse(null, fallbackUrl);
    }
  }
}; 