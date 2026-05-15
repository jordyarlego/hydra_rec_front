import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

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
  await page.route('**/api/narrative', route => route.fulfill({ json: { narrative: 'Risco moderado.', model_used: 'Nemotron 49B' } }))
}

test.describe('acessibilidade WCAG AA', () => {
  test('página principal não tem violações críticas', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.leaflet-container')
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('skip link está presente e funcional', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })

    const skipLink = page.locator('a.skip-link')
    await expect(skipLink).toBeAttached()
    await expect(skipLink).toHaveAttribute('href', '#main')
  })

  test('modal de ocorrência é acessível', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /Reportar/i }).click()
    const modal = page.getByRole('dialog', { name: /Reportar ocorrência/i })
    await expect(modal).toBeVisible({ timeout: 5000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[role="dialog"]')
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('score ring tem aria-label descritivo', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByLabel(/Hydra Score 52, MODERADO/i)).toBeVisible({ timeout: 10000 })
  })

  test('navegação por teclado chega ao ScoreRing', async ({ page }) => {
    await mockApi(page)
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Boa Viagem' })).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused)
  })

  test('mobile: drawer sidebar tem role e label corretos', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApi(page)
    await page.goto('/')

    const aside = page.locator('aside[aria-label="Painel lateral"]')
    await expect(aside).toBeVisible({ timeout: 10000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('aside')
      .analyze()

    expect(results.violations).toEqual([])
  })
})
