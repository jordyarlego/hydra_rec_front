const DB_NAME = 'hydrarec-offline'
const DB_VERSION = 1
const STORE = 'reports'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const result = fn(store)
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
  })
}

export function isNetworkFailure(error) {
  return !navigator.onLine || /failed to fetch|network|load failed/i.test(error?.message || '')
}

export function formDataToRecord(formData) {
  const fields = {}
  let photo = null
  for (const [key, value] of formData.entries()) {
    if (key === 'photo' && value instanceof File) {
      photo = value
    } else {
      fields[key] = value
    }
  }
  return {
    id: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fields,
    photo,
    created_at: new Date().toISOString(),
  }
}

export function recordToFormData(record) {
  const form = new FormData()
  Object.entries(record.fields || {}).forEach(([key, value]) => form.append(key, value))
  if (record.photo) form.append('photo', record.photo)
  return form
}

export async function enqueueReport(formData) {
  const record = formDataToRecord(formData)
  await tx('readwrite', store => store.put(record))
  return record
}

export async function listQueuedReports() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeQueuedReport(id) {
  await tx('readwrite', store => store.delete(id))
}

export function queuedRecordToReport(record) {
  const f = record.fields || {}
  return {
    id: record.id,
    type: f.tipo,
    severity: f.severidade,
    lat: Number(f.lat),
    lon: Number(f.lon),
    bairro: f.bairro,
    description: f.descricao,
    created_at: record.created_at,
    confirmed_count: 0,
    likes_up: 0,
    likes_down: 0,
    pending_offline: true,
  }
}
