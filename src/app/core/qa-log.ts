/**
 * 3D Cadastre QA logging.
 *
 * Every new 3D-cadastre code path logs through these so a tester can filter the
 * browser console by "3DQA" and copy-paste a clean trace for support.
 *
 *   qa('CityViewer', 'admin-area response', { buildings: 3 });
 *     → [3DQA][CityViewer] admin-area response { buildings: 3 }
 *   qaErr('Import3D', 'upload FAILED', err);
 *     → [3DQA][Import3D] ❌ upload FAILED <err>   (console.error)
 *
 * Toggle off by setting `localStorage.setItem('qa3d','0')` (default ON).
 */
const TAG = '[3DQA]';

function enabled(): boolean {
  try {
    return typeof window === 'undefined' || localStorage.getItem('qa3d') !== '0';
  } catch {
    return true;
  }
}

export function qa(scope: string, msg: string, data?: unknown): void {
  if (!enabled()) return;
  if (data !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`${TAG}[${scope}] ${msg}`, data);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${TAG}[${scope}] ${msg}`);
  }
}

export function qaErr(scope: string, msg: string, err?: unknown): void {
  if (!enabled()) return;
  // eslint-disable-next-line no-console
  console.error(`${TAG}[${scope}] ❌ ${msg}`, err ?? '');
}
