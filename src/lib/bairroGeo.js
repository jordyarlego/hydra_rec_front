import bairrosGeojsonUrl from '../data/geo/recife_bairros_2023.geojson?url'

const APP_TO_OFFICIAL = {
  'PAU-FERRO': 'PAU FERRO',
  'RECIFE ANTIGO': 'RECIFE',
  'SITIO DOS PINTOS': 'SITIO DOS PINTOS - SAO BRAS',
  COHAB: 'COHAB - IBURA DE CIMA',
  'ZUMBI DO PACHECO': 'ZUMBI',
}

const OFFICIAL_TO_APP = {
  'PAU FERRO': 'Pau-Ferro',
  RECIFE: 'Recife Antigo',
  'SITIO DOS PINTOS - SAO BRAS': 'Sítio dos Pintos',
  'COHAB - IBURA DE CIMA': 'Cohab',
  ZUMBI: 'Zumbi do Pacheco',
}

let geojsonPromise = null

export function normalizeBairroName(name = '') {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

export function loadBairrosGeojson() {
  if (!geojsonPromise) {
    geojsonPromise = fetch(bairrosGeojsonUrl)
      .then(res => res.ok ? res.json() : null)
      .catch(() => null)
  }
  return geojsonPromise
}

export function getOfficialFeatureName(feature) {
  const props = feature?.properties || {}
  return props.EBAIRRNOMEOF || props.EBAIRRNOME || ''
}

export function getAppBairroName(feature) {
  const official = getOfficialFeatureName(feature)
  return OFFICIAL_TO_APP[normalizeBairroName(official)] || official
}

export function findBairroFeature(geojson, bairro) {
  const target = APP_TO_OFFICIAL[normalizeBairroName(bairro)] || normalizeBairroName(bairro)
  return geojson?.features?.find(feature => normalizeBairroName(getOfficialFeatureName(feature)) === target)
}

function pointInRing(lat, lon, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersects = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygon(lat, lon, polygon) {
  if (!polygon?.length || !pointInRing(lat, lon, polygon[0])) return false
  for (const hole of polygon.slice(1)) {
    if (pointInRing(lat, lon, hole)) return false
  }
  return true
}

export function findBairroByPoint(geojson, lat, lon) {
  const feature = geojson?.features?.find(item => {
    const geometry = item.geometry
    if (!geometry) return false
    if (geometry.type === 'Polygon') return pointInPolygon(lat, lon, geometry.coordinates)
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some(polygon => pointInPolygon(lat, lon, polygon))
    }
    return false
  })
  return feature ? getAppBairroName(feature) : null
}

export function getBairroFeatureCenter(feature) {
  const geometry = feature?.geometry
  if (!geometry) return null
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : []

  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
      }
    }
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) return null
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

export function getBairroCenterFromGeojson(geojson, bairro) {
  return getBairroFeatureCenter(findBairroFeature(geojson, bairro))
}
