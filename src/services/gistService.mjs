import axios from "axios";

/*──────────────────────────────────────
  GitHub Gist Service for Test Results
  Fetches CI/CD test data with caching
──────────────────────────────────────*/

const GIST_BASE_URL = 'https://gist.githubusercontent.com/Blind-Striker/472c59b7c2a1898c48a29f3c88897c5a/raw/';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// Simple in-memory cache
const cache = new Map();

export const gistService = {
  async getTestResults(platform) {
    if (!['linux', 'windows', 'macos'].includes(platform)) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const cacheKey = `test-results-${platform}`;
    const cached = cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log(`🟢 Cache hit for ${platform} test results`);
      return cached.data;
    }

    try {
      console.log(`📡 Fetching ${platform} test results from Gist...`);
      
      const fileName = `test-results-${platform}.json`;
      const url = `${GIST_BASE_URL}${fileName}`;
      
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LocalStack-Badge-API/1.0'
        }
      });

      const testData = response.data;
      
      // Validate the data structure
      if (!isValidTestData(testData)) {
        console.error(`❌ Invalid test data structure for ${platform}:`, testData);
        return null;
      }

      // Cache the result
      cache.set(cacheKey, {
        data: testData,
        timestamp: Date.now()
      });

      console.log(`✅ Successfully fetched ${platform} test results:`, {
        passed: testData.passed,
        failed: testData.failed,
        total: testData.total,
        timestamp: testData.timestamp
      });

      return testData;

    } catch (error) {
      console.error(`🔥 Failed to fetch ${platform} test results:`, error.message);
      
      // Check if we have stale cached data we can return as fallback
      if (cached) {
        console.log(`⚡ Returning stale cached data for ${platform} as fallback`);
        return cached.data;
      }
      
      return null;
    }
  },

  async getRedirectUrl(platform) {
    const testData = await this.getTestResults(platform);
    return testData?.url_html || null;
  },

  // Clear cache for testing or manual refresh
  clearCache(platform = null) {
    if (platform) {
      const cacheKey = `test-results-${platform}`;
      cache.delete(cacheKey);
      console.log(`🗑️ Cleared cache for ${platform}`);
    } else {
      cache.clear();
      console.log(`🗑️ Cleared all cache`);
    }
  },

  // Get cache status for debugging
  getCacheStatus() {
    const status = {};
    for (const [key, value] of cache.entries()) {
      const age = Date.now() - value.timestamp;
      const isValid = age < CACHE_TTL_MS;
      status[key] = {
        age: Math.round(age / 1000), // seconds
        isValid,
        data: value.data ? 'present' : 'null'
      };
    }
    return status;
  }
};

/*──────────────────────────────────────
  Data validation helpers
──────────────────────────────────────*/

function isValidTestData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields with type checking
  const requiredFields = {
    platform: 'string',
    passed: 'number',
    failed: 'number',
    skipped: 'number',
    total: 'number',
    timestamp: 'string'
  };

  for (const [field, expectedType] of Object.entries(requiredFields)) {
    if (!(field in data) || typeof data[field] !== expectedType) {
      console.error(`❌ Missing or invalid field '${field}' (expected ${expectedType})`);
      return false;
    }
  }

  // Validate numbers are non-negative
  const numericFields = ['passed', 'failed', 'skipped', 'total'];
  for (const field of numericFields) {
    if (data[field] < 0) {
      console.error(`❌ Field '${field}' cannot be negative: ${data[field]}`);
      return false;
    }
  }

  // Validate that total makes sense
  if (data.total !== (data.passed + data.failed + data.skipped)) {
    console.error(`❌ Total (${data.total}) doesn't match sum of passed (${data.passed}) + failed (${data.failed}) + skipped (${data.skipped})`);
    return false;
  }

  // url_html is optional but should be string if present
  if (data.url_html && typeof data.url_html !== 'string') {
    console.error(`❌ Field 'url_html' should be string if present`);
    return false;
  }

  return true;
} 