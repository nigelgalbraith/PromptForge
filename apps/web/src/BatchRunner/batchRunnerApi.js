const PROFILES_LIST_URL = '/api/profiles/list';
const PROFILE_FETCH_BASE = '/api/profiles/';
/**
 * fetchProfilesList.
 */
export async function fetchProfilesList(signal) {
  const response = await fetch(PROFILES_LIST_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load profiles (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.endsWith('.json'));
}


/**
 * fetchProfileById.
 */
export async function fetchProfileById(profileId, signal) {
  const response = await fetch(`${PROFILE_FETCH_BASE}${encodeURIComponent(profileId)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load profile (${response.status})`);
  return response.json();
}

