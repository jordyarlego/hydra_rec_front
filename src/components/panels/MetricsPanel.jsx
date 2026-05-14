import { HydraScoreTooltip } from '../risk/HydraScoreTooltip.jsx'
import { ScoreRing } from '../risk/ScoreRing.jsx'
import { AIInsight } from '../ai/AIInsight.jsx'
import { DifferentialTable } from '../benchmark/DifferentialTable.jsx'
import { RouteInput } from '../route/RouteInput.jsx'
import { RouteResultPanel } from '../route/RouteResultPanel.jsx'
import { useRoute } from '../../hooks/useRoute.js'

function Metric({ label, value, help }) {
  return (
    <>
      <dt title={help}>{label}</dt>
      <dd>{value ?? '--'}</dd>
    </>
  )
}

export function MetricsPanel({ current, risk, consensus, bairro, reports }) {
  const rawValues = risk?.rawValues || risk?.raw_values
  const { result: routeResult, loading: routeLoading, error: routeError, analyze } = useRoute()

  return (
    <>
      {current && (
        <section className="card weather-card" aria-label="Condições atuais">
          <h2 className="card-title">Condições atuais</h2>
          <dl className="metrics-grid">
            <Metric
              label="Chuva atual"
              value={`${current.precipitation ?? 0} mm`}
              help="Precipitação medida no horário atual."
            />
            <Metric label="Umidade" value={`${current.relative_humidity_2m ?? '--'}%`} />
            <Metric
              label="Vento"
              value={`${Math.round(current.wind_speed_10m ?? 0)} km/h`}
            />
            <Metric
              label="Pressão"
              value={`${Math.round(current.surface_pressure ?? 0)} hPa`}
              help="Queda rápida indica tempestade se aproximando."
            />
            <Metric
              label="UV"
              value={current.uv_index ?? '--'}
              help="Acima de 6 requer proteção solar."
            />
            <Metric
              label="Fontes"
              value={consensus?.sources_count ?? '--'}
              help="Open-Meteo, INMET, OpenWeatherMap."
            />
          </dl>
        </section>
      )}

      {rawValues && (
        <section className="card score-card" aria-label="Hydra Score">
          <HydraScoreTooltip>
            <h2 className="card-title">Hydra Score</h2>
          </HydraScoreTooltip>
          <div className="score-card-body">
            <ScoreRing risk={risk} />
            <dl className="metrics-grid">
              <Metric
                label="Chuva prevista"
                value={`${rawValues.chuvaPrevista ?? rawValues.chuva_prevista_24h ?? '--'} mm`}
                help="Chuva prevista para as próximas 24h."
              />
              <Metric
                label="Chuva 24h"
                value={`${rawValues.chuva24h ?? rawValues.chuva_acumulada_24h ?? '--'} mm`}
              />
              <Metric
                label="Maré"
                value={`${rawValues.mareAltura ?? rawValues.mare_altura ?? '--'} m (${rawValues.mareTrend ?? rawValues.mare_trend ?? '--'})`}
                help="Altura e tendência da maré."
              />
              <Metric
                label="Altitude"
                value={`${rawValues.altitude ?? rawValues.altitude_m ?? '--'} m`}
                help="Áreas baixas (< 5m) têm maior risco."
              />
            </dl>
          </div>
        </section>
      )}

      <section className="card route-card" id="route" aria-label="Análise de trajeto">
        <RouteInput
          currentBairro={bairro}
          onAnalyze={analyze}
          loading={routeLoading}
        />
        <RouteResultPanel result={routeResult} error={routeError} />
      </section>

      <DifferentialTable consensus={consensus} risk={risk} />

      <AIInsight
        bairro={bairro}
        risk={risk}
        consensus={consensus}
        reports={reports}
      />
    </>
  )
}
