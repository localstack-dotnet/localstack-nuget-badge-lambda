import { gistService } from '../services/gistService.mjs';
import { createTestBadgeResponse, create400Response } from '../utils/common.mjs';

/*──────────────────────────────────────
  Test Badge Handler
  Generates dynamic test result badges
──────────────────────────────────────*/

export const testBadgeHandler = {
  async handle(event, platform) {
    console.log(`🧪 Generating test badge for platform: ${platform}`);
    
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
      // Fetch test results from Gist
      const testData = await gistService.getTestResults(platform, validatedTrack);
      
      if (!testData) {
        console.log(`⚠️ No test data available for ${platform} (track: ${validatedTrack}), returning unavailable badge`);
        return createTestBadgeResponse(null, platform);
      }

      console.log(`✅ Test data found for ${platform} (track: ${validatedTrack}):`, {
        passed: testData.passed,
        failed: testData.failed,
        skipped: testData.skipped,
        total: testData.total
      });

      // Generate badge response
      return createTestBadgeResponse(testData, platform);

    } catch (error) {
      console.error(`🔥 Error generating test badge for ${platform} (track: ${validatedTrack}):`, error.message);
      
      // Return unavailable badge on error
      return createTestBadgeResponse(null, platform);
    }
  }
}; 