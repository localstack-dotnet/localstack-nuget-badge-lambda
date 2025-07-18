#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Master Test Runner
  
  Orchestrates all test suites and provides comprehensive
  reporting for the modular test architecture.
──────────────────────────────────────────────────*/

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 LocalStack Badge API - Master Test Runner');
console.log('=' .repeat(60));

// Test suite configuration
const testSuites = [
  {
    name: '🔧 Unit Tests - Router',
    command: 'node tests/unit/router.test.mjs',
    critical: true,
    description: 'Route matching, parameter extraction, 404 handling'
  },
  {
    name: '🗂️ Unit Tests - Gist Service',
    command: 'node tests/unit/gistService.test.mjs',
    critical: true,
    description: 'Caching, validation, error handling'
  },
  {
    name: '🔄 Integration Tests - Legacy Compatibility',
    command: 'node tests/integration/legacy-compatibility.test.mjs',
    critical: true,
    description: 'Ensures 100% backward compatibility (CRITICAL)'
  },
  {
    name: '🧪 Integration Tests - Test Badges',
    command: 'node tests/integration/test-badges.test.mjs',
    critical: false,
    description: 'Test result badges with real Gist data'
  },
  {
    name: '🔗 Integration Tests - Redirects',
    command: 'node tests/integration/redirects.test.mjs',
    critical: false,
    description: 'GitHub redirect functionality'
  },
  {
    name: '📦 Integration Tests - Package Badges',
    command: 'node tests/integration/package-badges.test.mjs',
    critical: false,
    description: 'Explicit package badge routes'
  }
];

// Test execution modes
const modes = {
  'fast': {
    description: 'Unit tests only (fast, no network calls)',
    suites: testSuites.filter(s => s.name.includes('Unit'))
  },
  'critical': {
    description: 'Critical tests only (backward compatibility)',
    suites: testSuites.filter(s => s.critical)
  },
  'full': {
    description: 'All tests (complete validation)',
    suites: testSuites
  },
  'integration': {
    description: 'Integration tests only (real API calls)',
    suites: testSuites.filter(s => s.name.includes('Integration'))
  },
  'features': {
    description: 'New feature tests only (badges, redirects, packages)',
    suites: testSuites.filter(s => s.name.includes('Test Badges') || s.name.includes('Redirects') || s.name.includes('Package Badges'))
  }
};

async function runTestSuite(suite) {
  console.log(`\n🧪 Running: ${suite.name}`);
  console.log(`📋 ${suite.description}`);
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(suite.command);
    const duration = Date.now() - startTime;
    
    console.log(stdout);
    if (stderr) {
      console.log('⚠️ Warnings:', stderr);
    }
    
    return {
      name: suite.name,
      success: true,
      duration,
      critical: suite.critical
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log('❌ FAILED!');
    console.log(error.stdout || '');
    console.log('💥 Error:', error.stderr || error.message);
    
    return {
      name: suite.name,
      success: false,
      duration,
      critical: suite.critical,
      error: error.message
    };
  }
}

async function runTests(mode = 'full') {
  const selectedMode = modes[mode];
  if (!selectedMode) {
    console.error(`❌ Invalid mode: ${mode}`);
    console.log('Available modes:', Object.keys(modes).join(', '));
    process.exit(1);
  }
  
  console.log(`🎯 Running in '${mode}' mode`);
  console.log(`📋 ${selectedMode.description}`);
  console.log(`🧪 Test suites: ${selectedMode.suites.length}`);
  
  if (mode === 'integration' || mode === 'full' || mode === 'features') {
    console.log('🌐 This will make real API calls to NuGet, GitHub, and Gist');
    console.log('⏱️ Expected duration: 30-60 seconds depending on network');
  }
  
  const results = [];
  const totalStartTime = Date.now();
  
  for (const suite of selectedMode.suites) {
    const result = await runTestSuite(suite);
    results.push(result);
    
    // Break early if critical test fails
    if (!result.success && result.critical) {
      console.log('\n🚨 CRITICAL TEST FAILURE - STOPPING EXECUTION');
      console.log('   This indicates a breaking change that must be fixed');
      break;
    }
  }
  
  const totalDuration = Date.now() - totalStartTime;
  
  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 MASTER TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const criticalFailed = results.filter(r => !r.success && r.critical).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🎯 Total: ${results.length}`);
  console.log(`⏱️ Total Duration: ${Math.round(totalDuration / 1000)}s`);
  
  if (criticalFailed > 0) {
    console.log(`🚨 Critical Failures: ${criticalFailed} (BREAKING CHANGES!)`);
  }
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    const critical = result.critical ? ' [CRITICAL]' : '';
    const duration = Math.round(result.duration / 1000);
    console.log(`   ${icon} ${result.name}${critical} (${duration}s)`);
    
    if (!result.success) {
      console.log(`       Error: ${result.error || 'Unknown error'}`);
    }
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    
    if (mode === 'full') {
      console.log('✅ Full validation complete - ready for deployment');
    } else if (mode === 'critical') {
      console.log('✅ Backward compatibility confirmed');
    } else if (mode === 'fast') {
      console.log('✅ Unit tests passing - logic is sound');
    } else if (mode === 'features') {
      console.log('✅ New features working correctly');
    }
    
  } else if (criticalFailed > 0) {
    console.log('🚨 CRITICAL FAILURES DETECTED!');
    console.log('   Backward compatibility may be broken');
    console.log('   DO NOT DEPLOY until these are fixed');
    
  } else {
    console.log('⚠️ SOME TESTS FAILED');
    console.log('   Non-critical failures detected');
    console.log('   Review failures and decide if acceptable for deployment');
  }
  
  // Environment info
  console.log('\n📊 Environment Info:');
  console.log(`   Node: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not Set'}`);
  
  if (!process.env.GITHUB_TOKEN && (mode === 'full' || mode === 'integration' || mode === 'features')) {
    console.log('   ⚠️ Some GitHub tests may be skipped without GITHUB_TOKEN');
  }
  
  return {
    passed,
    failed,
    total: results.length,
    criticalFailed,
    success: failed === 0
  };
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'critical';
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node test-runner.mjs [mode]');
    console.log('\nAvailable modes:');
    for (const [name, config] of Object.entries(modes)) {
      console.log(`  ${name.padEnd(12)} - ${config.description}`);
    }
    console.log('\nExamples:');
    console.log('  node test-runner.mjs fast        # Quick unit tests');
    console.log('  node test-runner.mjs critical    # Backward compatibility');
    console.log('  node test-runner.mjs features    # New feature tests');
    console.log('  node test-runner.mjs full        # Complete validation');
    process.exit(0);
  }
  
  try {
    const summary = await runTests(mode);
    
    // Exit with appropriate code for CI/CD
    process.exit(summary.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

// Auto-run when file is executed directly
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
} 