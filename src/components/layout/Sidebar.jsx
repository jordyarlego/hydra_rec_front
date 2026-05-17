import { useExplain } from '../../hooks/useExplain.js'
import { useApac } from '../../hooks/useApac.js'
import { BairroSearch } from '../common/BairroSearch.jsx'
import { IconBtn } from '../common/IconBtn.jsx'
import { PushBell } from '../common/PushBell.jsx'
import { HydraLogo } from '../effects/HydraLogo.jsx'
import { HeroCard } from '../weather/HeroCard.jsx'
import { WeatherOutlook } from '../weather/WeatherOutlook.jsx'
import { NearbyReportsList } from '../reports/NearbyReportsList.jsx'
import { ApacBanner } from '../risk/ApacBanner.jsx'
import { ScoreExplain } from '../risk/ScoreExplain.jsx'
import { soundMgr } from '../../lib/soundManager.js'
import { SpeakerHigh, SpeakerSlash, Sun, Moon, X } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   Sidebar v3 — FIEL ao layout atual do user.
   Mudanças do v2 são MÍNIMAS:
   • Atom updates (botões usam .btn .btn-* novo, IconBtn novo)
   • Hairlines visuais sutis (não muda hierarquia)
   • Animação de entrada da hero card preservada
   • HeroCard mantém "CHOVENDO X mm/h" (queixa do user no v3 inicial
     foi mal interpretada — user quer manter, só não "avulsa")

   NÃO mexer em:
   • Ordem das seções: Search → Hero → APAC → Como está o clima
     (WeatherOutlook) → Ocorrências próximas → Footer
   • Conteúdo: WeatherOutlook continua sendo "Está caindo chuva
     fraca em N estações" + "VER SENSORES" + "Chuva moderada a
     caminho" (lista de estações)
   ════════════════════════════════════════════════════ */

function Hairline() { return <div className="hairline" /> }

function Section({ label, right, children }) {
  return (
    <div>
      <div className="section-label">
        <span>{label}</span>
        {right && <span className="section-label-right">{right}</span>}
      </div>
      {children}
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
  const explain = useExplain()
  const { boletim: apacBoletim } = useApac()

  const header = (
    <div className="sidebar-header">
      <HydraLogo size={32} showText light={light} />
      <div className="sidebar-header-actions">
        <PushBell />
        <IconBtn label={soundOn ? 'Silenciar' : 'Ativar som'} onClick={onSoundToggle} active={!soundOn}>
          {soundOn ? <SpeakerHigh size={14} weight="bold" /> : <SpeakerSlash size={14} weight="bold" style={{ color: 'var(--risk-alto)' }} />}
        </IconBtn>
        <IconBtn label={light ? 'Modo escuro' : 'Modo claro'} onClick={onThemeToggle}>
          {light ? <Moon size={14} weight="bold" /> : <Sun size={14} weight="bold" />}
        </IconBtn>
        {mobile && onClose && (
          <IconBtn label="Fechar" onClick={onClose}><X size={14} weight="bold" /></IconBtn>
        )}
      </div>
    </div>
  )

  if (loading && !data) {
    return (
      <div className="sidebar-wrap">
        {header}
        <div className="sidebar-scroll">
          <BairroSearch value={bairro} onChange={onBairroChange} />
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
            <HydraLogo size={48} showText={false} light={light} />
            <p style={{ marginTop: 12 }}>Carregando {bairro}…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="sidebar-wrap">
        {header}
        <div className="sidebar-scroll">
          <BairroSearch value={bairro} onChange={onBairroChange} />
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--risk-alto)', fontWeight: 600 }}>Erro ao carregar dados</p>
            <small style={{ color: 'var(--text-3)' }}>{error}</small>
            <button type="button" onClick={onRetry} className="btn btn-primary" style={{ marginTop: 12 }}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar-wrap">
      {header}

      <ScoreExplain
        open={explain.open}
        loading={explain.loading}
        text={explain.text}
        error={explain.error}
        onClose={explain.close}
        light={light}
      />

      <div className="sidebar-scroll scroll-y">
        <BairroSearch value={bairro} onChange={onBairroChange} />

        <HeroCard
          bairro={bairro}
          weather={data.weather}
          risk={data.risk}
          light={light}
          onExplain={() => { soundMgr.playClick(); explain.explain(bairro) }}
        />

        {apacBoletim && <ApacBanner boletim={apacBoletim} light={light} />}

        <Hairline />

        {/* "Como está o clima na região" — WeatherOutlook do v2.
            Conteúdo: "Está caindo chuva fraca em N estações por perto"
            + botão "+ VER SENSORES (N)" + "Chuva moderada a caminho"
            com lista de 3 estações por proximidade. */}
        <Section label="Como está o clima na região">
          <WeatherOutlook
            lat={data.location?.latitude}
            lon={data.location?.longitude}
            light={light}
          />
        </Section>

        <Hairline />

        <Section label="Ocorrências próximas" right={`${reports?.length || 0} reports · raio 2 km`}>
          <NearbyReportsList reports={reports} onConfirm={onConfirmReport} />
        </Section>
      </div>

      <div className="sidebar-footer">
        <strong>HYDRAREC</strong>
        <small>Plataforma cívica · Recife</small>
      </div>
    </div>
  )
}
