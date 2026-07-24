import type { WebcamStatus } from '../../types/webcam.js';

const OFFICIAL_URL = 'https://laslenas.com/camara-en-vivo/' as const;

function frameAllowed(headers: Headers): boolean {
  const xFrame = headers.get('x-frame-options')?.toLowerCase() ?? '';
  const csp = headers.get('content-security-policy')?.toLowerCase() ?? '';
  if (xFrame.includes('deny') || xFrame.includes('sameorigin')) return false;
  const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/)?.[1] ?? '';
  if (frameAncestors.includes("'none'") || frameAncestors.includes("'self'")) return false;
  return true;
}

export async function checkOfficialWebcam(
  checkedAt = new Date().toISOString(),
  fetchImpl: typeof fetch = fetch,
): Promise<WebcamStatus> {
  try {
    const response = await fetchImpl(OFFICIAL_URL, {
      method: 'HEAD',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; LasLenasSnowMonitor/3.0; +https://nieve.wallealv.com)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return {
        sourceName: 'Las Leñas oficial',
        officialUrl: OFFICIAL_URL,
        status: 'unavailable',
        embeddable: false,
        checkedAt,
        message: `HTTP ${response.status}`,
      };
    }
    return {
      sourceName: 'Las Leñas oficial',
      officialUrl: OFFICIAL_URL,
      status: 'available',
      embeddable: frameAllowed(response.headers),
      checkedAt,
      message: null,
    };
  } catch (error) {
    return {
      sourceName: 'Las Leñas oficial',
      officialUrl: OFFICIAL_URL,
      status: 'unavailable',
      embeddable: false,
      checkedAt,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
