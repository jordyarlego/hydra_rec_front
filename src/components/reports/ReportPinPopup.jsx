import { CATEGORY_BY_ID } from '../../data/report_categories.js'

function relativeTime(value) {
  if (!value) return ''
  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return `há ${Math.floor(hours / 24)} d`
}

function weatherLine(weather) {
  if (!weather) return 'Snapshot APAC indisponível.'
  const rain = weather.rain_1h_mm ?? weather.rain_24h_mm
  const station = weather.station_name || 'estação APAC'
  const distance = weather.station_distance_m != null ? ` (${weather.station_distance_m} m)` : ''
  return rain != null
    ? `No momento do report: chuva ${Number(rain).toFixed(1)} mm na ${station}${distance}.`
    : `No momento do report: dados da ${station}${distance}.`
}

export function ReportPinPopup({ report, onClose, onVote }) {
  if (!report) return null
  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const score = report.ai_validation_score

  return (
    <div className="modal-overlay report-detail-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <article className="modal-panel report-pin-popup" role="dialog" aria-modal="true" aria-labelledby="report-pin-title">
        <header className="modal-header">
          <div>
            <h2 id="report-pin-title" className="modal-title">
              <span aria-hidden="true">{cat.emoji}</span> {cat.label}
            </h2>
            <div className="modal-subtitle">{report.severity || 'moderado'} · {relativeTime(report.created_at)}</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        {report.photo_url && <img className="report-popup-photo" src={report.photo_url} alt="Foto enviada no report" loading="lazy" />}

        <div className="report-popup-block">{weatherLine(report.weather)}</div>

        {report.description && <p className="report-popup-description">{report.description}</p>}

        {(report.photo_ai_description || score != null) && (
          <div className="report-popup-block">
            {report.photo_ai_description && <p>{report.photo_ai_description}</p>}
            {score != null && (
              <div className="credibility-line">
                <span>Credibilidade</span>
                <div className="credibility-bar" title={report.ai_validation_notes || ''}>
                  <span style={{ width: `${Math.round(score * 100)}%` }} />
                </div>
                <strong>{Math.round(score * 100)}%</strong>
              </div>
            )}
          </div>
        )}

        <div className="report-votes" aria-label="Validação comunitária">
          <button type="button" onClick={() => onVote?.(report.id, 1)} aria-label="Curtir report">↑ {report.likes_up ?? 0}</button>
          <button type="button" onClick={() => onVote?.(report.id, -1)} aria-label="Descurtir report">↓ {report.likes_down ?? 0}</button>
        </div>
      </article>
    </div>
  )
}
