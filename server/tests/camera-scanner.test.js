import assert from 'assert';

/**
 * Test suite to reproduce and verify the smartphone QR camera scanner issues:
 * 1. Reproduce failure when running on mobile browser over insecure HTTP (isSecureContext = false / navigator.mediaDevices undefined).
 * 2. Verify that QR camera helper correctly detects the security context limitation and returns clear diagnostics.
 * 3. Verify robust QR code text parsing (e.g. "LINE A", "LANE_B", URL with lane query param, raw "C").
 * 4. Verify fallback capability (file-based photo capture fallback for HTTP mobile users).
 */

// Import the scanner helper module (we will test the logic)
import { parseLaneCode, checkCameraSupport } from '../../client/src/utils/qrScannerHelper.js';

async function runCameraScannerTests() {
  console.log('🧪 RUNNING QR CAMERA SCANNER & MOBILE DIAGNOSTIC TEST SUITE...\n');

  // Test 1: Insecure context reproduction (Mobile accessing via http://192.168.x.x)
  {
    const mockWindowInsecure = {
      isSecureContext: false,
      location: { protocol: 'http:', hostname: '192.168.1.10' }
    };
    const mockNavigatorNoMedia = {}; // undefined mediaDevices in insecure context on mobile

    const support = checkCameraSupport(mockWindowInsecure, mockNavigatorNoMedia);
    
    assert.strictEqual(support.supported, false, 'Camera should NOT be supported on insecure HTTP LAN origin');
    assert.strictEqual(support.reason, 'INSECURE_CONTEXT', 'Reason should be INSECURE_CONTEXT');
    assert.ok(support.message.toLowerCase().includes('https'), 'Diagnostic message must mention HTTPS or secure context requirement');
    assert.strictEqual(support.canUseFileFallback, true, 'Must allow file/photo upload fallback even on insecure context');
    console.log('✓ [1/4] Successfully reproduced & caught mobile insecure context (http://192.168.x.x) blocking camera');
  }

  // Test 2: Secure context with mediaDevices available (e.g. https or localhost)
  {
    const mockWindowSecure = {
      isSecureContext: true,
      location: { protocol: 'https:', hostname: 'dgdash.local' }
    };
    const mockNavigatorWithMedia = {
      mediaDevices: {
        getUserMedia: async () => ({})
      }
    };

    const support = checkCameraSupport(mockWindowSecure, mockNavigatorWithMedia);
    assert.strictEqual(support.supported, true, 'Camera should be supported on secure HTTPS context with getUserMedia');
    assert.strictEqual(support.reason, 'READY');
    console.log('✓ [2/4] Verified secure context detection (https/localhost with getUserMedia)');
  }

  // Test 3: Robust QR Code Lane Parsing
  {
    // Raw lane letters
    assert.strictEqual(parseLaneCode('A'), 'A');
    assert.strictEqual(parseLaneCode('b'), 'B');
    assert.strictEqual(parseLaneCode('C'), 'C');

    // Display strings
    assert.strictEqual(parseLaneCode('LINE A'), 'A');
    assert.strictEqual(parseLaneCode('line b'), 'B');
    assert.strictEqual(parseLaneCode('LANE_C'), 'C');
    assert.strictEqual(parseLaneCode('JALUR B'), 'B');

    // URLs with query params or hashes
    assert.strictEqual(parseLaneCode('http://192.168.1.50:5173/?lane=A'), 'A');
    assert.strictEqual(parseLaneCode('https://dgdash.app/race?lane=b'), 'B');
    assert.strictEqual(parseLaneCode('https://dgdash.app/race#lane=C'), 'C');
    assert.strictEqual(parseLaneCode('https://dgdash.app/race?line=A'), 'A');

    // Fallback on unknown string
    assert.strictEqual(parseLaneCode('UNKNOWN_CODE'), 'A', 'Default fallback should be A');
    console.log('✓ [3/4] Verified all QR payload formats (raw, LINE X, LANE_X, and URL query params)');
  }

  // Test 4: Missing mediaDevices even if secure (e.g. old browser or camera hardware absent)
  {
    const mockWindowSecure = {
      isSecureContext: true,
      location: { protocol: 'https:', hostname: 'example.com' }
    };
    const mockNavigatorNoMedia = { mediaDevices: undefined };

    const support = checkCameraSupport(mockWindowSecure, mockNavigatorNoMedia);
    assert.strictEqual(support.supported, false);
    assert.strictEqual(support.reason, 'NO_MEDIA_DEVICES');
    assert.strictEqual(support.canUseFileFallback, true);
    console.log('✓ [4/4] Verified hardware / missing mediaDevices detection and fallback flag');
  }

  console.log('\n======================================================');
  console.log('🏁 ALL QR CAMERA REPRODUCTION & DIAGNOSTIC TESTS PASSED!');
  console.log('======================================================\n');
}

runCameraScannerTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
