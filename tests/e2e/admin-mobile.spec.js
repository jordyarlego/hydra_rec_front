import { expect, test } from '@playwright/test'

const future = Math.floor(Date.now() / 1000) + 3600
const fakeAdminSession = {
  access_token: 'test-token',
  refresh_token: 'refresh-token',
  expires_at: future,
  user: { user_metadata: { role: 'admin' } },
}

const report = {
  id: 'report-1',
  type: 'buraco',
  severity: 'moderado',
  bairro: 'Boa Viagem',
  description: 'Buraco grande ocupando a faixa da direita.',
  lat: -8.12,
  lon: -34.9,
  likes_up: 4,
  likes_down: 0,
  status: 'pending',
  bucket: 'revisar',
  ai_validation_score: 0.68,
  created_at: '2026-05-16T09:00:00Z',
  priority_result: { priority: 'alta', score: 78, reasons: ['Report coerente com os dados disponíveis'] },
  weather: { rain_1h_mm: 0, rain_24h_mm: 1.4, station_name: 'Torreao' },
  audit: [],
}

const tickets = [
  {
    id: 'ticket-1',
    report_id: 'report-1',
    type: 'buraco',
    bairro: 'Boa Viagem',
    priority: 'alta',
    status: 'aberto',
    kanban_state: 'aberto',
    assigned_org: 'EMLURB_PAVIMENTACAO',
    notes: 'Buraco na via em Boa Viagem',
    created_at: '2026-05-16T09:05:00Z',
  },
  {
    id: 'ticket-2',
    type: 'alagamento',
    bairro: 'Torre',
    priority: 'urgente',
    status: 'aberto',
    kanban_state: 'em_atendimento',
    assigned_org: 'EMLURB_DRENAGEM',
    created_at: '2026-05-16T08:40:00Z',
  },
]

async function mockAdmin(page) {
  await page.addInitScript(session => {
    localStorage.setItem('hydrarec_admin_session', JSON.stringify(session))
  }, fakeAdminSession)

  await page.route('**/api/admin/reports/counts-by-bucket', route => route.fulfill({
    json: { revisar: 1, filtrado: 0, auto_validado: 0, sem_bucket: 0 },
  }))
  await page.route('**/api/admin/reports/report-1/duplicates', route => route.fulfill({ json: { data: [], count: 0 } }))
  await page.route('**/api/admin/reports/report-1/address', route => route.fulfill({
    json: {
      address: {
        street: 'Rua dos Navegantes',
        number: '100',
        neighborhood: 'Boa Viagem',
        full_address: 'Rua dos Navegantes, 100 - Boa Viagem',
      },
      landmarks: [{ name: 'Escola Municipal', kind: 'escola' }],
    },
  }))
  await page.route('**/api/admin/reports/report-1/official-crossing', route => route.fulfill({
    json: { available: false, reason: 'Sem base oficial cruzada ainda.', priority_result: null },
  }))
  await page.route('**/api/admin/reports/report-1', route => route.fulfill({ json: report }))
  await page.route('**/api/admin/reports?**', route => route.fulfill({
    json: { data: [report], count: 1, limit: 20, offset: 0 },
  }))
  await page.route('**/api/admin/tickets?**', route => route.fulfill({ json: { data: tickets, count: tickets.length } }))
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(async () => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth + 2
  ))).toBe(true)
}

test('admin mobile keeps triage and kanban usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockAdmin(page)

  await page.goto('/admin/reports')
  await expect(page.getByRole('heading', { name: 'Triagem de reports' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: /Buraco/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Detalhe do report' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Aprovar e gerar chamado/i })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.getByRole('heading', { name: 'Detalhe do report' })).toBeHidden()

  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('button', { name: /Chamados/i }).click()
  await expect(page.getByRole('heading', { name: 'Chamados em andamento' })).toBeVisible()
  await expect(page.locator('.kanban-column')).toHaveCount(3)
  await expect.poll(async () => page.locator('.kanban-board').evaluate(el => (
    getComputedStyle(el).gridTemplateColumns.split(' ').length
  ))).toBe(1)
  await expectNoHorizontalOverflow(page)
})
