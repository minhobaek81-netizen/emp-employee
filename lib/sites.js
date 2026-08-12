export const SITES = [
  { name: "사무실", lat: 37.53114660119239, lng: 126.95506667237547 },
  { name: "1반", lat: 37.53423546847156, lng: 126.96773328081873 },
  { name: "2반", lat: 37.52306398612143, lng: 126.96120983358273 },
  { name: "3반", lat: 37.53169760891948, lng: 126.99444339565821 },
  { name: "운전1반", lat: 37.53623961768338, lng: 126.97074567427495 },
  { name: "운전2반", lat: 37.5171742727315, lng: 126.983879339774 },
  { name: "기동반", lat: 37.53114660119239, lng: 126.95506667237547 },
];

export const ALLOWED_RADIUS_M = 150;

export const SITE_NAMES = SITES.map((site) => site.name);

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 퇴근 — 등록된 휴게실 중 반경 이내 가장 가까운 현장 */
export function findNearestSiteWithinRadius(lat, lng, radiusM = ALLOWED_RADIUS_M) {
  let best = null;
  for (const site of SITES) {
    const distance = getDistanceMeters(lat, lng, site.lat, site.lng);
    if (distance <= radiusM && (!best || distance < best.distance)) {
      best = { site, distance };
    }
  }
  return best;
}

export function getDistanceToSite(lat, lng, siteName) {
  const site = getSiteByName(siteName);
  if (!site) return null;
  return getDistanceMeters(lat, lng, site.lat, site.lng);
}

/** 예전 '원효' 선택값 호환 */
export const LEGACY_SITE_ALIASES = {
  원효: "사무실",
};

export function resolveSiteName(name) {
  return LEGACY_SITE_ALIASES[name] ?? name;
}

export function getSiteByName(name) {
  const resolved = resolveSiteName(name);
  return SITES.find((site) => site.name === resolved) ?? null;
}
