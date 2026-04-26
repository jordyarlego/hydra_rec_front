import React, { useState, useEffect } from 'react';
import { CloudRain, Cloud, Sun, Moon, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { getDashboardDataForCity } from './services/WeatherRiskService';
import { generateRiskExplanation } from './services/GeminiNarrativeService';
import SearchableDropdown from './components/SearchableDropdown';
import WeatherAnimation from './components/WeatherAnimation';

// ---------------------------------------------------------------------------
// Componentes auxiliares fora do App — evita re-mount a cada render
// ---------------------------------------------------------------------------
function WeatherIcon({ weatherCode, isDay }) {
  if (weatherCode >= 50) return <CloudRain size={48} color="#fff" strokeWidth={1} />;
  if (!isDay)            return <Moon      size={48} color="#fff" strokeWidth={1} />;
  if (weatherCode > 2)   return <Cloud     size={48} color="#fff" strokeWidth={1} />;
  return                        <Sun       size={48} color="#fff" strokeWidth={1} />;
}

function ForecastIcon({ code }) {
  if (code >= 50) return <CloudRain size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />;
  if (code > 2)   return <Cloud     size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />;
  return                 <Sun       size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />;
}

function SkeletonBlock() {
  return (
    <div className="skeleton-section">
      <div className="skeleton skeleton-line w-50" />
      <div className="skeleton skeleton-line w-full" />
      <div className="skeleton skeleton-line w-75" />
      <div className="skeleton skeleton-line w-full" />
      <div className="skeleton skeleton-line w-50" />
      <div className="skeleton skeleton-line w-75" />
      <div className="skeleton skeleton-line w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------
export default function App() {
  const [city, setCity] = useState("Boa Viagem");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchCityData("Boa Viagem");
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCityData = async (cityName) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardDataForCity(cityName);
      if (!data?.weather) throw new Error("Resposta inválida da API");
      setDashboardData(data);
      setCity(cityName);
      handleGenerateNarrative(cityName, data.risk);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os dados. Verifique se o servidor FastAPI está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNarrative = async (cityName, riskData) => {
    setNarrativeLoading(true);
    const result = await generateRiskExplanation(cityName, riskData);
    setNarrative(result);
    setNarrativeLoading(false);
  };

  const getRiskColor = (nivel) => {
    switch (nivel) {
      case 'BAIXO':    return 'var(--risk-baixo)';
      case 'MODERADO': return 'var(--risk-moderado)';
      case 'ALTO':     return 'var(--risk-alto)';
      case 'SEVERO':   return 'var(--risk-severo)';
      default:         return 'var(--text-primary)';
    }
  };

  const weatherCode = dashboardData?.weather?.current?.weather_code ?? 0;
  const isDay       = dashboardData?.weather?.current?.is_day ?? 1;
  const currentTemp = dashboardData?.weather?.current?.temperature_2m;
  const currentWind = dashboardData?.weather?.current?.wind_speed_10m;
  const currentHumidity = dashboardData?.weather?.current?.relative_humidity_2m;
  const currentRain = dashboardData?.weather?.current?.precipitation;

  const getBgKey = () => {
    if (weatherCode >= 50)              return "rain";
    if (!isDay)                         return "night";
    if (weatherCode > 2 && weatherCode < 50) return "clouds";
    return "sun";
  };

  const weatherLabel =
    weatherCode >= 50 ? "Chuvoso"
    : !isDay          ? "Noite Limpa"
    : weatherCode > 2 ? "Nublado"
    : "Ensolarado";

  return (
    <div className="main-container">

      {/* BACKGROUND */}
      <div className={`video-bg-container fallback-${getBgKey()}`}>
        <WeatherAnimation bgKey={getBgKey()} />
        <div className="video-bg-overlay" />
      </div>

      {/* PAINEL ESQUERDO */}
      <div className="left-panel">
        <header className="brand">
          <span style={{ fontWeight: 800 }}>hydra.</span>rec
        </header>

        <div className="main-temp-display">
          <h1 className="temperature">
            {loading ? "--" : Math.round(currentTemp)}&deg;
          </h1>
          <div className="location-info">
            <h2 className="city-name">{loading ? "Atualizando..." : city}</h2>
            <p className="datetime">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              <span className="datetime-date">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </p>
          </div>
          <div className="weather-icon-group">
            <WeatherIcon weatherCode={weatherCode} isDay={isDay} />
            <span className="weather-desc">{weatherLabel}</span>
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO (glass) */}
      <div className="right-panel">

        <div className="search-section">
          <SearchableDropdown
            selectedCity={city}
            onCitySelect={(bairro) => fetchCityData(bairro)}
            disabled={loading}
          />
        </div>

        {/* Banner de erro */}
        {error && (
          <div className="error-banner">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="divider" style={{ marginTop: '10px' }} />

        {loading && <SkeletonBlock />}

        {/* Detalhes do clima */}
        {!loading && !error && dashboardData && (
          <div className="weather-details fade-in">
            <h3>Detalhes do Clima</h3>
            <ul className="details-list">
              <li><span>Umidade</span>       <span>{currentHumidity}%</span></li>
              <li><span>Vento</span>         <span>{currentWind} km/h</span></li>
              <li><span>Chuva (Agora)</span> <span>{currentRain} mm</span></li>
            </ul>
          </div>
        )}

        <div className="divider" />

        {/* Risk Dashboard */}
        {!loading && !error && dashboardData && (
          <div className="risk-dashboard fade-in slide-up">
            <h3>Análise de Risco Municipal</h3>

            <div className="risk-score-display">
              <div
                className="risk-badge"
                style={{ backgroundColor: getRiskColor(dashboardData.risk.nivel) }}
              >
                {dashboardData.risk.nivel}
              </div>
              <span className="score-value">Hydra Score: {dashboardData.risk.score}/100</span>
            </div>

            <ul className="details-list sub-list">
              <li><span>Previsão Satélite (próx 24h)</span>  <span>{dashboardData.risk.rawValues.chuvaPrevista} mm</span></li>
              <li><span>Acumulado Histórico (24h)</span>     <span>{dashboardData.risk.rawValues.chuva24h} mm</span></li>
              <li><span>Tábua de Marés (Recife)</span>       <span>{dashboardData.risk.rawValues.mareAltura} m — {dashboardData.risk.rawValues.mareTrend}</span></li>
              <li><span>Radiação UV Total</span>             <span>{dashboardData.risk.rawValues.uvIndex}</span></li>
              <li><span>Rajadas Vento Máx</span>            <span>{dashboardData.risk.rawValues.rajadaVento} km/h</span></li>
              <li><span>Pressão Atmosférica (msl)</span>    <span>{dashboardData.risk.rawValues.pressao} hPa</span></li>
              <li><span>Saturação Hídrica (Solo)</span>     <span>{(dashboardData.risk.rawValues.saturacaoSolo * 100).toFixed(0)}%</span></li>
            </ul>

            {/* Boletim IA */}
            <div className="gemini-container">
              <h4>
                <Info size={16} style={{ marginRight: '6px' }} />
                Boletim IA de Defesa Civil
              </h4>
              <div className="narrative-box">
                {narrativeLoading ? (
                  <div className="loader">
                    <Loader2 className="spin" size={20} />
                    Processando matriz analítica...
                  </div>
                ) : (
                  <p>{narrative}</p>
                )}
              </div>
            </div>

            {/* Previsão 6h */}
            {dashboardData.forecast6h?.length > 0 && (
              <div className="forecast-strip">
                <h3>Próximas 6 horas</h3>
                <div className="forecast-cards">
                  {dashboardData.forecast6h.map((h, i) => (
                    <div key={i} className="forecast-card">
                      <span className="fc-hour">
                        {h.time ? new Date(h.time).getHours() + 'h' : '--'}
                      </span>
                      <ForecastIcon code={h.weather_code ?? 0} />
                      <span className="fc-temp">
                        {h.temperature != null ? Math.round(h.temperature) + '°' : '--'}
                      </span>
                      <span className="fc-rain">
                        {h.precipitation > 0 ? `${h.precipitation.toFixed(1)}mm` : '0mm'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
