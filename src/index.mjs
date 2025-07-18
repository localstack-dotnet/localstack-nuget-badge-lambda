import { packageHandler } from './handlers/packageHandler.mjs';
import { testBadgeHandler } from './handlers/testBadgeHandler.mjs';
import { testRedirectHandler } from './handlers/testRedirectHandler.mjs';
import { create404Response, extractPlatform, isValidPlatform } from './utils/common.mjs';

/*──────────────────────────────────────
  AWS Lambda Entry Point & Router
──────────────────────────────────────*/

export const handler = async (event) => {
  const path = (event.pathParameters?.proxy || '').toLowerCase().trim();
  
  try {
    // Test badges
    if (path.startsWith('badge/tests/')) {
      const platform = extractPlatform(path);
      if (!isValidPlatform(platform)) {
        return create404Response('Invalid platform. Use: linux, windows, macos');
      }
      
      return await testBadgeHandler.handle(event, platform);
    }
    
    // Package badges (explicit route)
    if (path.startsWith('badge/packages/')) {
      const packageName = path.split('/')[2];
      if (!packageName) {
        return create404Response('Package name required');
      }
      return await packageHandler.handle(event, packageName);
    }
    
    // Test redirects
    if (path.startsWith('redirect/test-results/')) {
      const platform = extractPlatform(path);
      if (!isValidPlatform(platform)) {
        return create404Response('Invalid platform. Use: linux, windows, macos');
      }
      
      return await testRedirectHandler.handle(event, platform);
    }
    
    // Root path - backward compatibility (query params)
    if (path === '' || path === '/') {
      return await packageHandler.handle(event, null);
    }
    
    // Everything else = 404
    return create404Response(`Route not found: /${path}`);
    
  } catch (error) {
    console.error('🔥 Router error:', error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        error: 'Internal server error'
      }),
    };
  }
}; 