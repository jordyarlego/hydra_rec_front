import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

// Leaflet doesn't run in jsdom — stub the whole map component
vi.mock('./components/map/HydraMap.jsx', () => ({
  HydraMap: () => <div data-testid="hydra-map" />,
}))

vi.mock('./hooks/useReports.js', () => ({
  useReports: () => ({
    reports: [],
    loading: false,
    error: null,
    loadNearby: vi.fn(),
    submitReport: vi.fn(),
    confirmReport: vi.fn(),
  }),
}))

vi.mock('./hooks/useDashboard.js', () => ({
  useDashboard: () => ({
    loading: false,
    error: null,
    data: {
      location: { name: 'Boa Viagem' },
      weather: {
        current: {
          temperature_2m: 29,
          apparent_temperature: 33,
          precipitation: 1.2,
          relative_humidity_2m: 82,
          wind_speed_10m: 14,
          surface_pressure: 1012,
          uv_index: 7,
        },
      },
      risk: {
        score: 52,
        nivel: 'MODERADO',
        rawValues: {
          chuvaPrevista: 18.4,
          chuva24h: 22.1,
          mareAltura: 1.7,
          mareTrend: 'subindo',
          altitude: 8,
        },
      },
      consensus: { confidence: 'ALTA', sources_count: 3 },
      heatIndex: { value: 36, risk: 'ATENCAO' },
      traffic: { label: 'Lento' },
      forecast6h: [
        { time: '2026-05-13T16:00', precipitation: 1.2, temperature: 29 },
      ],
    },
  }),
}))

describe('App', () => {
  it('renders the modular war room dashboard', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Boa Viagem' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Hydra Score 52 de 100/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Risco MODERADO, score 52 de 100/i)).toBeInTheDocument()
    expect(screen.getByText('Open-Meteo · INMET · OpenWeatherMap')).toBeInTheDocument()
  })
})
