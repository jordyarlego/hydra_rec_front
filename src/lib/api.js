const BASE = import.meta.env.DEV ? '' : ''

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
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
  getNarrative: (cityName, riskData, consensusData, nearbyReports, apacBoletim, weather) => request('/api/narrative', {
    method: 'POST',
    body: JSON.stringify({ cityName, riskData, consensusData, nearbyReports, apacBoletim, weather }),
  }),
  getHealthz: () => request('/api/healthz'),
  createReport: (payload) => request('/api/reports', { method: 'POST', body: JSON.stringify(payload) }),
  createReportForm: (formData) => request('/api/reports/with-photo', { method: 'POST', body: formData }),
  getReport: (id) => request(`/api/reports/${id}`),
  getNearbyReports: (lat, lon, radius = 2000) =>
    request(`/api/reports/nearby?lat=${lat}&lon=${lon}&radius=${radius}`),
  confirmReport: (id) => request(`/api/reports/${id}/confirm`, { method: 'POST' }),
  likeReport: (id, vote) => request(`/api/reports/${id}/like`, { method: 'POST', body: JSON.stringify({ vote }) }),
  weatherAt: (lat, lon) => request(`/api/weather?lat=${lat}&lon=${lon}`),
  reportAssist: (lat, lon) => request('/api/ai/report-assist', { method: 'POST', body: JSON.stringify({ lat, lon }) }),
  reverseGeocode: (lat, lon) => request(`/api/reverse-geocode?lat=${lat}&lon=${lon}`),
}
