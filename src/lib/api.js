const BASE = import.meta.env.DEV ? '' : ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getDashboard: (bairro) => request(`/api/dashboard/${encodeURIComponent(bairro)}`),
  getScores: (bairros) => request('/api/scores', { method: 'POST', body: JSON.stringify({ bairros }) }),
  getNarrative: (cityName, riskData, consensusData, nearbyReports) => request('/api/narrative', {
    method: 'POST',
    body: JSON.stringify({ cityName, riskData, consensusData, nearbyReports }),
  }),
  getHealthz: () => request('/api/healthz'),
  createReport: (payload) => request('/api/reports', { method: 'POST', body: JSON.stringify(payload) }),
  getNearbyReports: (lat, lon, radius = 2000) =>
    request(`/api/reports/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
  confirmReport: (id) => request(`/api/reports/${id}/confirm`, { method: 'POST' }),
  getRouteRisk: (payload) => request('/api/route-risk', { method: 'POST', body: JSON.stringify(payload) }),
  reverseGeocode: (lat, lon) => request(`/api/reverse-geocode?lat=${lat}&lon=${lon}`),
}
