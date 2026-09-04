/**
 * QR Scanner and Mobile Camera Helper
 * Provides robust diagnostic checks for mobile browsers, secure contexts (HTTPS),
 * rear camera facing constraints, and URL / text parsing for Lane QR Codes.
 */

/**
 * Parses raw text, URL, or code scanned from QR code into valid Lane ('A' | 'B' | 'C').
 * @param {string} rawText
 * @returns {'A' | 'B' | 'C'}
 */
export function parseLaneCode(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'A';

  const clean = rawText.trim();

  // 1. Check if it's a URL or contains query parameters / hash
  if (clean.includes('?') || clean.includes('#') || clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      // If relative or full URL
      const url = new URL(clean, 'http://localhost');
      const laneParam = url.searchParams.get('lane') || url.searchParams.get('line');
      if (laneParam) {
        const p = laneParam.toUpperCase().trim();
        if (p === 'B' || p.includes('B')) return 'B';
        if (p === 'C' || p.includes('C')) return 'C';
        return 'A';
      }

      // Check hash fragment e.g. #lane=B
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const hashLane = hashParams.get('lane') || hashParams.get('line');
        if (hashLane) {
          const hp = hashLane.toUpperCase().trim();
          if (hp === 'B' || hp.includes('B')) return 'B';
          if (hp === 'C' || hp.includes('C')) return 'C';
          return 'A';
        }
      }
    } catch (e) {
      // Fall through to regex matching
    }
  }

  // 2. String matching for explicit Lane identifiers
  const upper = clean.toUpperCase();

  // Check Lane B
  if (
    upper === 'B' ||
    upper === 'LINE B' ||
    upper === 'LANE B' ||
    upper === 'LANE_B' ||
    upper === 'JALUR B' ||
    /\b(LANE|LINE|JALUR)[ _-]?B\b/.test(upper)
  ) {
    return 'B';
  }

  // Check Lane C
  if (
    upper === 'C' ||
    upper === 'LINE C' ||
    upper === 'LANE C' ||
    upper === 'LANE_C' ||
    upper === 'JALUR C' ||
    /\b(LANE|LINE|JALUR)[ _-]?C\b/.test(upper)
  ) {
    return 'C';
  }

  // Check Lane A
  if (
    upper === 'A' ||
    upper === 'LINE A' ||
    upper === 'LANE A' ||
    upper === 'LANE_A' ||
    upper === 'JALUR A' ||
    /\b(LANE|LINE|JALUR)[ _-]?A\b/.test(upper)
  ) {
    return 'A';
  }

  // Standalone single letters or boundary matching
  if (/\bB\b/.test(upper)) return 'B';
  if (/\bC\b/.test(upper)) return 'C';
  if (/\bA\b/.test(upper)) return 'A';

  // Fallback
  return 'A';
}

/**
 * Checks whether the current browser/device environment supports live camera streaming.
 * Specifically checks for mobile secure context (HTTPS/localhost) and getUserMedia availability.
 *
 * @param {Window} [win]
 * @param {Navigator} [nav]
 * @returns {{ supported: boolean, reason: 'READY' | 'INSECURE_CONTEXT' | 'NO_MEDIA_DEVICES' | 'SSR_OR_NO_WINDOW', message: string, canUseFileFallback: boolean }}
 */
export function checkCameraSupport(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!win || !nav) {
    return {
      supported: false,
      reason: 'SSR_OR_NO_WINDOW',
      message: 'Lingkungan browser tidak mendukung akses kamera.',
      canUseFileFallback: false
    };
  }

  // Check if origin is localhost or 127.0.0.1
  const hostname = win.location?.hostname || '';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

  // In modern mobile browsers (iOS Safari, Android Chrome), getUserMedia is strictly disabled
  // on insecure origins (e.g. http://192.168.x.x). isSecureContext will be false.
  const isSecure = win.isSecureContext === true || isLocalhost;

  if (!isSecure) {
    return {
      supported: false,
      reason: 'INSECURE_CONTEXT',
      message: 'Kamera live membutuhkan koneksi HTTPS atau "localhost". Karena dibuka via HTTP LAN, gunakan fitur "Ambil Foto QR" atau tombol jalur di bawah.',
      canUseFileFallback: true
    };
  }

  if (!nav.mediaDevices || typeof nav.mediaDevices.getUserMedia !== 'function') {
    return {
      supported: false,
      reason: 'NO_MEDIA_DEVICES',
      message: 'Perangkat atau browser Anda tidak mendukung MediaDevices/getUserMedia langsung.',
      canUseFileFallback: true
    };
  }

  return {
    supported: true,
    reason: 'READY',
    message: 'Kamera siap digunakan.',
    canUseFileFallback: true
  };
}
