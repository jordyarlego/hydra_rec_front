import { expect, test } from '@playwright/test'

const dashboardPayload = {
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
}

test('opens dashboard and toggles theme', async ({ page }) => {
  await page.route('**/api/dashboard/**', route => route.fulfill({ json: dashboardPayload }))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible()
  await expect(page.getByLabel(/Hydra Score 52 de 100/i)).toBeVisible()

  const themeToggle = page.getByRole('button', { name: /Mudar para tema/i })
  await themeToggle.click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
