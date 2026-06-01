import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { adminFetchJson } from '../../lib/adminFetch.js'
import { useWebSocket } from '../../hooks/useWebSocket.js'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { ArrowClockwise, ChartLineUp, MapPin, Siren, Target, Warning, Question } from '@phosphor-icons/react'

const RECIFE_CENTER = [-8.0522, -34.9286]

const PRIORITY_COLOR = {
  urgente: '#ef4444',
  alta: '#f97316',
  media: '#eab308',
  baixa: '#22c55e',
}

const EMPTY_ANALYTICS = {
  trends: {
    current_total: 0,
    rising: [],
    by_category: [],
    by_bairro: [],
  },
  recommendations: [],
  top_priorities: [],
  narration: null,
}

const OPS_CONCEPTS = [
  {
    title: 'Tendências',
    body: 'Compara a janela atual de 24h com as 24h anteriores. Se uma categoria ou bairro cresce de forma relevante, entra como tendência.',
  },
  {
    title: 'Hotspots',
    body: 'Pontos com reincidência em bases oficiais e cruzamentos EMLURB/Defesa Civil. Servem para identificar lugares que já dão problema repetidamente.',
  },
  {
    title: 'Alta prioridade',
    body: 'Reports que o motor de prioridade marcou como urgente ou alta usando gravidade, IA, votos, recorrência e contexto climático.',
  },
  {
    title: 'Recomendações',
    body: 'Ações sugeridas por regras determinísticas. A IA só transforma essas regras em texto mais claro para o operador.',
  },
]

function categoryLabel(type) {
  return CATEGORY_BY_ID[type]?.label || type || 'Ocorrencia'
}

function priorityLabel(priority) {
  return {
    urgente: 'Urgente',
    alta: 'Alta',
    media: 'Media',
    baixa: 'Baixa',
  }[priority] || 'Media'
}

function OpsMap({ priorities = [], hotspots = [] }) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return

    const map = L.map(hostRef.current, {
      center: RECIFE_CENTER,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map)

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layerRef.current) {
      layerRef.current.remove()
    }

    const group = L.layerGroup()

    hotspots.forEach(h => {
      if (!h.lat || !h.lon) return
      const score = Number(h.recurrence_score || 0)
      const color = score >= 5 ? '#ef4444' : score >= 2 ? '#f97316' : '#eab308'
      L.circleMarker([h.lat, h.lon], {
        radius: Math.min(22, 9 + score),
        color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 2,
      })
        .bindPopup(
          `<strong>${h.neighborhood || 'Hotspot oficial'}</strong><br>` +
          `Recorrencia: ${score.toFixed(1)}<br>` +
          `Via: ${h.nearest_road_name || '-'}`
        )
        .addTo(group)
    })

    priorities.forEach(report => {
      if (!report.lat || !report.lon) return
      const result = report.priority_result || {}
      const color = PRIORITY_COLOR[result.priority] || PRIORITY_COLOR.media
      const imgHtml = report.photo_url
        ? `<br><img src="${report.photo_url}" alt="Foto da ocorrência" class="admin-map-popup-img" style="width: 140px; height: 90px; object-fit: cover; border-radius: 6px; margin-top: 8px; border: 1px solid rgba(255,255,255,0.15);" />`
        : ''
      L.circleMarker([report.lat, report.lon], {
        radius: 8,
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.92,
        weight: 2,
      })
        .bindPopup(
          `<strong>${categoryLabel(report.type)}</strong><br>` +
          `${report.bairro || 'Bairro nao informado'}<br>` +
          `Prioridade: ${priorityLabel(result.priority)} (${result.score ?? 0})` +
          imgHtml
        )
        .addTo(group)
    })

    group.addTo(map)
    layerRef.current = group

    const points = [
      ...hotspots.filter(h => h.lat && h.lon).map(h => [h.lat, h.lon]),
      ...priorities.filter(r => r.lat && r.lon).map(r => [r.lat, r.lon]),
    ]
    if (points.length) {
      map.fitBounds(points, { padding: [28, 28], maxZoom: 13 })
    }

    return () => {
      group.remove()
      if (layerRef.current === group) layerRef.current = null
    }
  }, [priorities, hotspots])

  return <div ref={hostRef} className="admin-ops-map" aria-label="Mapa operacional do Recife" />
}

function AnalyticsBars({ items, labelKey, valueKey = 'count' }) {
  const max = Math.max(...(items || []).map(item => item[valueKey] || 0), 1)
  return (
    <div className="admin-ops-bars">
      {(items || []).slice(0, 6).map(item => (
        <div key={item[labelKey]} className="admin-ops-bar-row">
          <span>{categoryLabel(item[labelKey])}</span>
          <div><i style={{ width: `${((item[valueKey] || 0) / max) * 100}%` }} /></div>
          <strong>{item[valueKey]}</strong>
        </div>
      ))}
    </div>
  )
}

export function AdminOpsDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setWarnings([])
    try {
      const [analyticsResult, hotspotResult] = await Promise.allSettled([
        adminFetchJson('/api/admin/analytics?window_hours=24&narrate=true'),
        fetch('/api/official/hotspots')
          .then(async r => {
            if (!r.ok) {
              let detail = `HTTP ${r.status}`
              try {
                const data = await r.json()
                detail = data.detail || data.error || detail
              } catch {
                /* keep HTTP status */
              }
              throw new Error(detail)
            }
            return r.json()
          }),
      ])

      const nextWarnings = []
      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value)
      } else {
        setAnalytics(EMPTY_ANALYTICS)
        nextWarnings.push(`Analytics indisponível: ${analyticsResult.reason?.message || 'erro ao carregar tendências'}`)
      }

      if (hotspotResult.status === 'fulfilled') {
        setHotspots(hotspotResult.value.data || [])
      } else {
        setHotspots([])
        nextWarnings.push(`Hotspots oficiais indisponíveis: ${hotspotResult.reason?.message || 'erro ao carregar hotspots'}`)
      }

      setWarnings(nextWarnings)
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [load])

  useWebSocket('Recife', load)

  const trends = analytics?.trends || {}
  const recommendations = analytics?.recommendations || []
  const priorities = analytics?.top_priorities || []
  const urgentCount = priorities.filter(r => ['urgente', 'alta'].includes(r.priority_result?.priority)).length
  const narration = analytics?.narration?.text

  const updatedLabel = useMemo(() => {
    if (!updatedAt) return 'Aguardando dados'
    return updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }, [updatedAt])

  return (
    <section className="admin-ops">
      <div className="admin-section-head admin-ops-head">
        <div>
          <h1>Operação Recife</h1>
          <p>Mapa central com reports priorizados, hotspots oficiais, tendências e recomendações acionáveis.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn ${showHelp ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Como ler este painel"
          >
            <Question size={15} weight="bold" />
            Como ler
          </button>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
            <ArrowClockwise size={15} weight="bold" />
            Atualizar
          </button>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <div className="admin-ops-warning" role="status">
          {warnings.map(warning => <span key={warning}>{warning}</span>)}
        </div>
      )}

      <div className="admin-ops-grid">
        <div className="admin-ops-map-panel">
          <OpsMap priorities={priorities} hotspots={hotspots} />
          <div className="admin-ops-map-legend">
            <span><i className="is-report" /> Reports priorizados</span>
            <span><i className="is-hotspot" /> Hotspots oficiais</span>
            <strong>Atualizado {updatedLabel}</strong>
          </div>
        </div>

        <aside className="admin-ops-rail">
          <div className="admin-ops-kpis">
            <div>
              <Siren size={18} weight="bold" />
              <span>Reports 24h</span>
              <strong>{loading ? '-' : trends.current_total ?? 0}</strong>
            </div>
            <div>
              <ChartLineUp size={18} weight="bold" />
              <span>Tendências</span>
              <strong>{loading ? '-' : trends.rising?.length ?? 0}</strong>
            </div>
            <div>
              <Warning size={18} weight="bold" />
              <span>Alta prioridade</span>
              <strong>{loading ? '-' : urgentCount}</strong>
            </div>
            <div>
              <Target size={18} weight="bold" />
              <span>Hotspots</span>
              <strong>{loading ? '-' : hotspots.length}</strong>
            </div>
          </div>

          <div className="admin-ops-panel">
            <div className="admin-ops-panel-head">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Recomendações
                <span
                  title="Ações sugeridas automaticamente quando há picos hiperlocais de ocorrências (crescimento de 3+ em 24h) ou um aumento geral de 50%+ na cidade."
                  style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'rgba(255,255,255,0.45)' }}
                >
                  <Question size={14} weight="bold" />
                </span>
              </h2>
              <span>{recommendations.length}</span>
            </div>
            {narration && <p className="admin-ops-narration">{narration}</p>}
            <div className="admin-ops-rec-list">
              {recommendations.length === 0 && (
                <p className="admin-empty">Sem ação recomendada no momento.</p>
              )}
              {recommendations.map(rec => (
                <article key={rec.id} className={`admin-ops-rec priority-${rec.priority}`}>
                  <div>
                    <strong>{rec.action}</strong>
                    <small>{rec.cause}</small>
                  </div>
                  <span>{priorityLabel(rec.priority)}</span>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="admin-ops-lower">
        {showHelp && (
          <div className="admin-ops-panel admin-ops-help">
            <div className="admin-ops-panel-head">
              <h2>Como ler este painel</h2>
              <span>glossário</span>
            </div>
            <div className="admin-ops-help-grid">
              {OPS_CONCEPTS.map(item => (
                <article key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="admin-ops-panel">
          <div className="admin-ops-panel-head">
            <h2>Categorias em alta</h2>
            <span>24h</span>
          </div>
          <AnalyticsBars items={trends.by_category || []} labelKey="category" />
        </div>

        <div className="admin-ops-panel">
          <div className="admin-ops-panel-head">
            <h2>Bairros mais ativos</h2>
            <span>24h</span>
          </div>
          <div className="admin-ops-bars">
            {(trends.by_bairro || []).slice(0, 6).map(item => (
              <div key={item.bairro} className="admin-ops-bar-row">
                <span><MapPin size={12} weight="bold" /> {item.bairro}</span>
                <div><i style={{ width: `${(item.count / Math.max(...(trends.by_bairro || []).map(x => x.count), 1)) * 100}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-ops-panel">
          <div className="admin-ops-panel-head">
            <h2>Fila priorizada</h2>
            <span>Top 5</span>
          </div>
          <div className="admin-ops-priority-list">
            {priorities.slice(0, 5).map(report => (
              <article key={report.id}>
                <strong>{categoryLabel(report.type)}</strong>
                <small>{report.bairro || 'Sem bairro'} · {priorityLabel(report.priority_result?.priority)} · score {report.priority_result?.score ?? 0}</small>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
