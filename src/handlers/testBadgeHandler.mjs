import { gistService } from '../services/gistService.mjs';
import { createTestBadgeResponse } from '../utils/common.mjs';

/*──────────────────────────────────────
  Test Badge Handler
  Generates dynamic test result badges
──────────────────────────────────────*/

export const testBadgeHandler = {
  async handle(event, platform) {
    console.log(`🧪 Generating test badge for platform: ${platform}`);
    
    try {
      // Fetch test results from Gist
      const testData = await gistService.getTestResults(platform);
      
      if (!testData) {
        console.log(`⚠️ No test data available for ${platform}, returning unavailable badge`);
        return createTestBadgeResponse(null, platform);
      }

      console.log(`✅ Test data found for ${platform}:`, {
        passed: testData.passed,
        failed: testData.failed,
        skipped: testData.skipped,
        total: testData.total
      });

      // Generate badge response
      return createTestBadgeResponse(testData, platform);

    } catch (error) {
      console.error(`🔥 Error generating test badge for ${platform}:`, error.message);
      
      // Return unavailable badge on error
      return createTestBadgeResponse(null, platform);
    }
  }
}; 