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

async function mockApi(page) {
  await page.route('**/api/dashboard/**', route => route.fulfill({ json: dashboardPayload }))
  await page.route('**/api/reports/nearby**', route => route.fulfill({ json: { reports: [] } }))
  await page.route('**/api/narrative', route => route.fulfill({ json: { narrative: 'Risco moderado em monitoramento.' } }))
  await page.route('**/api/apac/boletim', route => route.fulfill({ json: { status: 'ok', acumulados: [] } }))
}

test('opens dashboard and toggles theme', async ({ page }) => {
  await mockApi(page)

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel(/Hydra Score 52, MODERADO/i)).toBeVisible()

  await page.getByRole('button', { name: /Abrir painel/i }).click()
  const themeToggle = page.getByRole('button', { name: /Modo claro/i })
  await themeToggle.click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('mobile starts on panel and keeps map controls visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)

  await page.goto('/')

  await expect(page.locator('.sidebar-panel.mobile.open')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })

  await page.getByRole('button', { name: 'Fechar' }).click()

  await expect(page.locator('.map-stage')).toBeVisible()
  await expect(page.locator('.leaflet-control-zoom')).toBeVisible()
  await expect(page.locator('.leaflet-control-zoom-in')).toBeInViewport()
  await expect(page.locator('.leaflet-control-zoom-out')).toBeInViewport()
})

test('report flow blocks gracefully without browser location', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByRole('button', { name: /Reportar ocorrência/i })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /Reportar ocorrência/i }).click()

  const dialog = page.getByRole('dialog', { name: /Reportar ocorrência/i })
  await expect(dialog).toBeVisible()
  await expect(page.getByText(/Localização do navegador necessária/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled()
})

test('admin route shows login screen', async ({ page }) => {
  await page.goto('/admin')

  await expect(page.locator('.admin-login-panel')).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel(/Email/i)).toBeVisible()
  await expect(page.getByLabel(/Senha/i)).toBeVisible()
})
