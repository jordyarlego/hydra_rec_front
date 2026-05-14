import { useState } from 'react'
import { BairroSearch } from '../common/BairroSearch.jsx'
import { IconBtn } from '../common/IconBtn.jsx'
import { HydraLogo } from '../effects/HydraLogo.jsx'
import { HeroCard } from '../weather/HeroCard.jsx'
import { ChipsBar } from '../weather/ChipsBar.jsx'
import { ForecastHourly } from '../weather/ForecastHourly.jsx'
import { AlertBanner } from '../risk/AlertBanner.jsx'
import { ConfidenceBadge } from '../risk/ConfidenceBadge.jsx'
import { AIInsight } from '../ai/AIInsight.jsx'
import { RouteAnalysis } from '../route/RouteAnalysis.jsx'
import { DifferentialTable } from '../benchmark/DifferentialTable.jsx'
import { NearbyReportsList } from '../reports/NearbyReportsList.jsx'
import { soundMgr, wmoToCondition } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   Sidebar — painel lateral esquerdo (drawer no mobile)
   Contém TODO o conteúdo do dashboard: header, busca,
   hero, alert, chips, forecast horário, tabs (IA, Trajeto,
   Fontes), reports próximos, footer.
   ════════════════════════════════════════════════════ */

function Hairline() {
  return <div className="sidebar-hairline" />
}

function SectionLabel({ children, right }) {
  return (
    <div className="sidebar-section-label">
      <span>{children}</span>
      {right && <span className="sidebar-section-right">{right}</span>}
    </div>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="sidebar-tabs" role="tablist">
      {tabs.map(t => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => { soundMgr.playClick(); onChange(t.id) }}
            className={`sidebar-tab${isActive ? ' active' : ''}`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

export function Sidebar({
  data, loading, error, onRetry,
  bairro, onBairroChange,
  reports, onConfirmReport,
  light, soundOn, onSoundToggle, onThemeToggle,
  mobile, onClose,
}) {
  const [tab, setTab] = useState('ia')

  /* Derive a UI-friendly condition label */
  const condition = wmoToCondition(data?.weather?.current?.weather_code ?? 0)

  /* ── Header (sticky) ── */
  const header = (
    <div className="sidebar-header">
      <HydraLogo size={32} showText={true} light={light} />
      <div className="sidebar-header-actions">
        <IconBtn
          label={soundOn ? 'Silenciar' : 'Ativar som'}
          onClick={onSoundToggle}
          active={!soundOn}
          danger={!soundOn}
        >
          {soundOn ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </IconBtn>
        <IconBtn
          label={light ? 'Modo escuro' : 'Modo claro'}
          onClick={onThemeToggle}
        >
          {light ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </IconBtn>
        {mobile && onClose && (
          <IconBtn label="Fechar" onClick={onClose}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </IconBtn>
        )}
      </div>
    </div>
  )

  /* ── Loading state ── */
  if (loading && !data) {
    return (
      <div className="sidebar-wrap">
        {header}
        <div className="sidebar-search-wrap">
          <BairroSearch value={bairro} onChange={onBairroChange} />
        </div>
        <div className="sidebar-status">
          <div className="sidebar-status-logo"><HydraLogo size={48} showText={false} light={light} /></div>
          <div className="sidebar-status-msg">Carregando {bairro}...</div>
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (error && !data) {
    return (
      <div className="sidebar-wrap">
        {header}
        <div className="sidebar-search-wrap">
          <BairroSearch value={bairro} onChange={onBairroChange} />
        </div>
        <div className="sidebar-status sidebar-status-error">
          <div className="sidebar-status-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div className="sidebar-status-title">Erro ao carregar dados</div>
            <div className="sidebar-status-detail">{error}</div>
          </div>
          <button type="button" onClick={onRetry} className="btn-primary">Tentar novamente</button>
        </div>
      </div>
    )
  }

  /* ── Normal state ── */
  return (
    <div className="sidebar-wrap">
      {header}
      <div className="sidebar-scroll scroll-y">
        <div className="sidebar-content">

          <BairroSearch value={bairro} onChange={onBairroChange} />

          <HeroCard
            bairro={bairro}
            condition={condition}
            current={data.weather?.current}
            risk={data.risk}
            light={light}
          />

          <AlertBanner risk={data.risk} bairro={bairro} />

          <div>
            <ConfidenceBadge consensus={data.consensus} />
          </div>

          <Hairline />

          <div>
            <SectionLabel>Métricas Atuais</SectionLabel>
            <ChipsBar current={data.weather?.current} risk={data.risk} light={light} />
          </div>

          <Hairline />

          <div>
            <SectionLabel>Próximas 6 Horas</SectionLabel>
            <ForecastHourly forecast={data.forecast6h || []} light={light} />
          </div>

          <Hairline />

          <div>
            <TabBar
              tabs={[
                { id: 'ia',   label: 'Análise IA' },
                { id: 'rota', label: 'Trajeto' },
                { id: 'dif',  label: 'Fontes' },
              ]}
              active={tab}
              onChange={setTab}
            />
            <div className="sidebar-tab-body">
              {tab === 'ia' && (
                <AIInsight
                  bairro={bairro}
                  risk={data.risk}
                  consensus={data.consensus}
                  reports={reports}
                />
              )}
              {tab === 'rota' && <RouteAnalysis currentBairro={bairro} />}
              {tab === 'dif'  && <DifferentialTable consensus={data.consensus} risk={data.risk} />}
            </div>
          </div>

          <Hairline />

          <div>
            <SectionLabel right={`${reports?.length || 0} reports · raio 2km`}>
              Ocorrências Próximas
            </SectionLabel>
            <NearbyReportsList reports={reports} onConfirm={onConfirmReport} />
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-footer-title">HYDRAREC · DEFESA CIVIL PE</div>
            <div className="sidebar-footer-sub">v2.0 · Open-Meteo · INMET · OpenWeather</div>
          </div>
        </div>
      </div>
    </div>
  )
}
