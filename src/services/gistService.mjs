import axios from "axios";

/*──────────────────────────────────────
  GitHub Gist Service for Test Results
  Fetches CI/CD test data with caching
──────────────────────────────────────*/

const GIST_BASE_URL_V1 = 'https://gist.githubusercontent.com/Blind-Striker/fab5b0837878e8cad455ad28190e0ef0/raw/';
const GIST_BASE_URL_V2 = 'https://gist.githubusercontent.com/Blind-Striker/472c59b7c2a1898c48a29f3c88897c5a/raw/';
const GIST_BASE_URL_WITH_PACKAGE = 'https://gist.githubusercontent.com/Blind-Striker/f2b8df60871ea8cd0fa6b746798690b4/raw/';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// Simple in-memory cache
const cache = new Map();

export const gistService = {
  async getTestResults(platform, track = 'v2', packageName) {
    if (!['linux', 'windows', 'macos'].includes(platform)) {
      throw new Error(`Invalid platform: ${platform}`);
    }

    const cacheKey = packageName ? `test-results-${platform}-${packageName}` : `test-results-${platform}-${track}`;
    const cached = cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      if (packageName) {
        console.log(`🟢 Cache hit for ${platform} test results with package '${packageName}'`);
      } else {
        console.log(`🟢 Cache hit for ${platform} test results (track: ${track})`);
      }
      return cached.data;
    }

    try {
      console.log(`📡 Fetching ${platform} test results from Gist (track: ${track})...`);
      
      const fileName = `test-results-${platform}.json`;
      const baseUrl = packageName ? GIST_BASE_URL_WITH_PACKAGE : (track === 'v1' ? GIST_BASE_URL_V1 : GIST_BASE_URL_V2);
      const url = `${baseUrl}${fileName}`;
      
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

  async getRedirectUrl(platform, track = 'v2', packageName) {
    const testData = await this.getTestResults(platform, track, packageName);
    return testData?.url_html || null;
  },

  // Clear cache for testing or manual refresh
  clearCache(platform = null, track = null) {
    if (platform && track) {
      const cacheKey = `test-results-${platform}-${track}`;
      cache.delete(cacheKey);
      console.log(`🗑️ Cleared cache for ${platform} (track: ${track})`);
    } else if (platform) {
      // Clear all tracks for a specific platform
      const keysToDelete = [];
      for (const key of cache.keys()) {
        if (key.startsWith(`test-results-${platform}-`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => cache.delete(key));
      console.log(`🗑️ Cleared cache for ${platform} (all tracks)`);
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