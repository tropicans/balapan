import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

async function testNavbarResponsiveness() {
  console.log('🧪 RUNNING NAVBAR RESPONSIVENESS & OVERFLOW BUG REPRODUCTION TEST...\n');

  const navbarPath = path.join(repoRoot, 'client', 'src', 'components', 'ui', 'Navbar.jsx');
  assert.ok(fs.existsSync(navbarPath), 'Navbar.jsx must exist');
  const navbarSource = fs.readFileSync(navbarPath, 'utf8');

  // Test 1: Verify all 7 screens exist for admin/super_admin
  console.log('--- Test 1: Check screen configuration in Navbar.jsx ---');
  const requiredScreenIds = ['cashier', 'rd', 'bracket', 'winners', 'tv', 'events', 'admin'];
  for (const id of requiredScreenIds) {
    assert.ok(navbarSource.includes(`id: '${id}'`), `Screen ${id} must be configured in allScreens`);
  }
  console.log('✅ Test 1 Passed: All 7 screens configured.');

  // Test 2: Reproduce the overflow issue
  // The current navbar uses verbose long labels and "no-scrollbar" with no scroll controls,
  // causing the 7th screen ("Admin Approval") to be cut off as "ADMI..." on standard 1024-1280px laptop screens.
  console.log('\n--- Test 2: Check for Responsive Labels / Compact Mode ---');
  
  // We require Navbar to support concise or responsive labels (shortLabel) so tabs fit cleanly without being clipped
  const hasShortLabels = navbarSource.includes('shortLabel') || navbarSource.includes('kasir') || navbarSource.includes('label:');
  
  // Specifically, we check if short labels or responsive text span is implemented for long labels:
  // e.g., 'Registrasi Kasir' -> 'Kasir', 'Registrasi Pemenang' -> 'Pemenang', 'Babak Eliminasi' -> 'Eliminasi'
  const hasCompactKasir = navbarSource.includes("'Kasir'") || navbarSource.includes('shortLabel:');
  const hasCompactPemenang = navbarSource.includes("'Pemenang'") || navbarSource.includes('shortLabel:');
  const hasCompactEliminasi = navbarSource.includes("'Eliminasi'") || navbarSource.includes('shortLabel:');
  const hasCompactAdmin = navbarSource.includes("'Admin'") || navbarSource.includes('shortLabel:');

  assert.ok(
    hasCompactKasir && hasCompactPemenang && hasCompactEliminasi && hasCompactAdmin,
    'FAIL: Navbar.jsx does not have compact/short labels configured for navigation tabs. Long labels overflow container.'
  );
  console.log('✅ Test 2 Passed: Compact/short labels supported.');

  // Test 3: Check for Horizontal Scroll Navigation Controls or Visible Cyber Scrollbar
  console.log('\n--- Test 3: Check for Scroll Navigation or Visible Scroll Indicators ---');
  // If no-scrollbar was used alone without scroll controls, users cannot scroll on non-touch devices.
  // Navbar must provide scroll buttons or indicators, or allow flex-wrap on desktop.
  const hasScrollSupport = 
    (navbarSource.includes('scrollLeft') || navbarSource.includes('ChevronLeft') || navbarSource.includes('ChevronRight') || navbarSource.includes('flex-wrap'));

  assert.ok(
    hasScrollSupport,
    'FAIL: Navbar navigation bar has no scroll controls (scrollLeft/Chevron) or wrapping support, causing cut-off tabs to be inaccessible.'
  );
  console.log('✅ Test 3 Passed: Horizontal scroll controls or wrapping present.');

  console.log('\n🎉 ALL NAVBAR RESPONSIVENESS TESTS PASSED!');
}

testNavbarResponsiveness().catch(err => {
  console.error('\n❌ REPRODUCTION TEST FAILED (BUG CONFIRMED):', err.message);
  process.exit(1);
});
