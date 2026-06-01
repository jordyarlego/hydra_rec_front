# HydraRec — Frontend (React 18 · Vite 6)

App cívico mobile-first do projeto HydraRec — mapa do Recife com risco
climático em tempo real, reports comunitários (com câmera + IA),
notificações push, modo offline e painel administrativo separado em `/admin`.

> Plataforma cívica · Recife.
> Backend: [hydra_rec_back](https://github.com/jordyarlego/hydra_rec_back)

---

## 1. Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | **React 18.3** | concorrência + Suspense pra code-split do admin |
| Build | **Vite 6** | HMR rápido, build pequeno (124KB gzip do bundle público) |
| Mapa | **Leaflet 1.9** + **leaflet.markercluster** | tiles OSM, sem chave; cluster pra performance com N pins |
| Ícones | **@phosphor-icons/react** | consistência visual, tree-shakeable |
| Tempo real | **socket.io-client** | recebe alertas APAC e pins novos |
| Testes unit | **Vitest** + **@testing-library/react** + **jsdom** | fast feedback |
| E2E + A11y | **Playwright** + **@axe-core/playwright** | WCAG AA verification |
| Lint | **ESLint 9** (flat config) | |
| PWA | Service Worker custom + Web App Manifest | offline + push notifications |

**Decisão proposital:** sem framework de routing (react-router), sem
estado global (Redux/Zustand). `main.jsx` decide entre `App` e
`AdminPage` pelo `window.location.pathname`. Estado vive em hooks
locais. Justificativa: projeto < 50 componentes, lazy loading
do admin já segura o bundle público em 124KB gzip.

---

## 2. Estrutura de pastas

```
front_end_hydrarec/
├── public/                       # estáticos servidos pela raiz
├── src/
│   ├── main.jsx                  # entry, decide App vs AdminPage, registra SW
│   ├── App.jsx                   # shell público (sidebar + mapa)
│   │
│   ├── pages/
│   │   └── AdminPage.jsx         # shell admin (login + 4 seções)
│   │
│   ├── components/
│   │   ├── layout/               # Sidebar, MapStage, MobileNav
│   │   ├── map/                  # HydraMap, EmojiCategoryPicker
│   │   ├── reports/              # PhotoCapture, QuickReportSheet, ReportPinPopup
│   │   ├── weather/              # HeroCard, ForecastHourly, WeatherOutlook, WindCompass, Sparkline
│   │   ├── risk/                 # ScoreRing, ScoreExplain, ApacBanner, AlertBanner
│   │   ├── ai/                   # AIInsight (narrativa) + DifferentialTable
│   │   ├── panels/               # ChipsBar (categorias)
│   │   ├── common/               # BairroSearch, IconBtn, LiveClock, SchemaWarning, PushBell, Chip
│   │   ├── loading/              # LoadingScreen
│   │   ├── effects/              # AtmosphericBg + HydraLogo (background animado)
│   │   ├── benchmark/            # debug, escondido em prod
│   │   └── admin/                # 10 componentes do painel admin
│   │       ├── AdminLogin.jsx
│   │       ├── AdminLayout.jsx
│   │       ├── AdminOpsDashboard.jsx      # Mapa Central: analytics + hotspots + prioridades
│   │       ├── AdminReportsTable.jsx       # lista com 3 cards-bucket (Triagem v2)
│   │       ├── AdminReportDetail.jsx       # painel direito, 3 botões de decisão
│   │       ├── AdminTickets.jsx            # Kanban 4 colunas (Triagem v2)
│   │       ├── AdminMetrics.jsx            # KPIs e top bairros
│   │       ├── BatchApproveCard.jsx        # aprovar lote do bucket auto_validado
│   │       ├── TicketCreateForm.jsx        # form org+título pré-preenchidos
│   │       ├── OfficialDataStatus.jsx      # status das bases oficiais
│   │       ├── OfficialCrossingPanel.jsx   # bairro/RPA/via/reincidência
│   │       ├── HotspotsMapLayer.jsx        # camada de hotspots oficiais no mapa
│   │       ├── ExportPanel.jsx             # CSV/GeoJSON
│   │       └── adminLabels.js              # i18n local de status/prioridade
│   │
│   ├── hooks/
│   │   ├── useAuth.js                      # sessão admin (Supabase token)
│   │   ├── useDashboard.js                 # /api/dashboard/{bairro}
│   │   ├── useReports.js                   # CRUD + fila offline
│   │   ├── useNarrative.js                 # narrativa IA
│   │   ├── useExplain.js                   # explicação do HydraScore
│   │   ├── useApac.js                      # boletins + outlook
│   │   ├── useWebSocket.js                 # /ws (alertas tempo real)
│   │   ├── usePushNotifications.js         # VAPID subscribe + UI
│   │   ├── useTheme.js                     # dark/light persistido
│   │   └── useFocusTrap.js                 # modal A11y
│   │
│   ├── lib/                                # adapters, NÃO componentes
│   │   ├── api.js                          # wrapper fetch público (sem auth)
│   │   ├── auth.js                         # Supabase login + refresh proativo
│   │   ├── adminFetch.js                   # wrapper com auto-refresh + retry em 401
│   │   ├── offlineReports.js               # IndexedDB queue
│   │   ├── bairroGeo.js                    # point-in-polygon nos 73 bairros
│   │   ├── riskColors.js                   # tokens de cor por nível de risco
│   │   └── soundManager.js                 # toques de alerta por condição APAC
│   │
│   ├── data/
│   │   ├── bairro_coords.js                # centro dos 73 bairros
│   │   ├── bairros.js                      # lista pra autocomplete
│   │   ├── pontos_criticos.js              # pontos de inundação histórica
│   │   ├── report_categories.js            # 9 categorias com ícone PNG + emoji
│   │   └── geo/                            # GeoJSON dos bairros (carregado on-demand)
│   │
│   ├── styles/
│   │   ├── tokens.css                      # CSS variables (cores, espaçamento, raios)
│   │   ├── globals.css                     # reset + body
│   │   └── app.css                         # tudo o resto (componentes, dark/light, responsive)
│   │
│   └── assets/                             # PNGs categorias + ícones marca
│
├── tests/                                  # vitest unit
├── e2e/                                    # playwright (a11y axe-core)
├── public/                                 # manifest, sw.js, icon.svg
├── vite.config.js                          # proxy /api + /ws pra :8000
├── package.json
└── eslint.config.js
```

---

## 3. Fluxo principal (cidadão)

```
1. main.jsx → App (rota /)
2. App.jsx:
   • Loading screen (3-frame atmosphere)
   • Geolocalização do usuário (navigator.geolocation)
   • Hook useDashboard pega HydraScore do bairro
   • Hook useReports + offlineReports.js: fila local IndexedDB
   • Hook useWebSocket recebe alertas APAC em tempo real
3. Render:
   • Sidebar  → HeroCard (chuva agora + outlook)
                ScoreRing (HydraScore visual)
                ApacBanner (boletim oficial se houver)
                ChipsBar (filtros do mapa)
                Categorias → QuickReportSheet ao clicar
   • MapStage → HydraMap (Leaflet) com pins de reports
                Hotspots oficiais como overlay
   • MobileNav (drawer abas em <900px)
4. Cidadão tira foto → POST /api/ai/describe-photo (preview na hora)
                    → IA sugere categoria + descrição
                    → ao confirmar: POST /api/reports/with-photo
                    → backend processa pipeline IA + cruzamento oficial
                    → WebSocket avisa todos os apps abertos do novo pin
5. SW intercepta fetch quando offline → fila no IndexedDB
   → flusha quando volta online
```

---

## 4. Fluxo admin

```
/admin → main.jsx detecta path → carrega AdminPage (lazy)

AdminPage:
  • useAuth → escuta evento hydrarec-auth-expired
  • Se sem sessão: AdminLogin (Supabase signIn)
  • Se sem role admin: tela "Sem permissão"
  • Senão: AdminLayout com navegação lateral

Abas:
  1. Mapa Central → AdminOpsDashboard
     • Primeira tela do admin
     • Mapa Leaflet com reports priorizados e hotspots oficiais
     • KPIs:
        - Reports 24h: volume atual de reports
        - Tendências: categorias/bairros subindo contra a janela anterior
        - Alta prioridade: reports urgentes/alta prioridade
        - Hotspots: recorrências vindas das bases oficiais
     • Recomendações:
        - Regras determinísticas do backend
        - IA só narra a decisão; não inventa prioridade
     • Se analytics/hotspots falharem, mostra aviso amarelo e mantém a tela útil

  2. /admin/reports  → AdminReportsTable + AdminReportDetail
     • 3 cards-bucket no topo: Precisa de você / Filtrados / Auto-validados
     • Pill colorido de veredito por linha
     • Detalhe lateral com:
        - Card "Apoio da IA" com banner colorido (Suspeito/Inconclusivo/Coerente/Alta)
        - Sugestão de órgão destino
        - Banner amarelo de duplicata (se houver)
        - 3 botões: Validar e gerar chamado | Marcar revisão | Rejeitar
        - Validar → TicketCreateForm (org + título auto)
        - Rejeitar → radio buttons (duplicado | foto inválida | fora de escopo | trote)
     • BatchApproveCard quando bucket = auto_validado

  3. /admin/tickets  → AdminTickets (Kanban)
     • 4 colunas: Aberto | Em atendimento | Resolvido | Fechado
     • Card pisca quando passa SLA
     • Borda lateral colorida por prioridade
     • Botão "→ próxima coluna" pra mover
     • Despacho abre o e-mail pronto e já marca o chamado como encaminhado

  4. /admin/metrics  → AdminMetrics
     • KPIs últimas 24h, pendentes, validados, resolvidos
     • Top bairros (barras horizontais)

  4. /admin/official → OfficialDataStatus + ExportPanel
     • Botão "Importar agora" das bases EMLURB/Defesa Civil
     • Exportar CSV / GeoJSON
```

**Auth refresh proativo (Triagem v2):**

```
lib/auth.js
  • signIn salva access_token + refresh_token + expires_at
  • getSessionFresh() refresh se exp <= 60s
  • dedup: _refreshPromise compartilhado

lib/adminFetch.js
  • Wraps fetch com Authorization automático
  • Se 401 → tenta refresh + retry 1x
  • Se ainda falhar → dispatch hydrarec-auth-expired
  • AdminPage escuta evento → toast + tela de login (sem perder estado)
```

---

## 5. PWA + Offline

- **Service Worker** (`public/sw.js`): cache de assets + bypass de `/api`
- **Manifest**: instalável (`add to home screen`)
- **Fila offline** (`lib/offlineReports.js`): grava em IndexedDB
  quando POST falha; flusha ao voltar online
- **Auto-update**: SW checa update a cada 15min + ao focar a aba
- **Push Notifications**: VAPID via `usePushNotifications.js` + `PushBell.jsx`
- **Localização opcional no push**: ao assinar notificações, o hook tenta anexar `lat/lon`. Se o usuário negar GPS, a inscrição continua funcionando para alertas gerais e status do próprio ticket; só o convite de validação por proximidade fica indisponível.

---

## 6. A11y (WCAG AA)

- `useFocusTrap.js`: modais não escapam o foco (Tab cycling)
- Roles ARIA explícitos: `role="alert"`, `role="status"`, `role="tab"`
- Combobox acessível em `BairroSearch.jsx`
- Contraste verificado pelo axe-core no E2E (`playwright + @axe-core`)
- `<button type="button">` em tudo que não é submit
- Skip-links e foco visível garantidos pelos tokens CSS

---

## 7. Design system

`src/styles/tokens.css`:

- Cores semânticas: `--risk-seguro / atencao / moderado / alto / severo`
- Cores de marca: `--brand-accent`, `--brand-bg`, `--brand-fg`
- Espaçamento: escala `--space-1 ... --space-6` (4 → 32px)
- Raios: `--radius-sm / md / lg`
- Sombras: `--shadow-sm / md / lg`

`src/styles/app.css`:

- Tema escuro default + `.app-root.light` overrides
- Mobile-first com breakpoints em 700 / 900 / 1100px
- 280 linhas adicionais no fim pra Triagem v2 (kanban, buckets, veredito)

---

## 8. Setup local

```bash
# 1. Node 20+ + npm
npm install

# 2. (opcional) variáveis Vite
# .env.local com:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJh...
# Se vazias, o front pega de /api/public-config no backend

# 3. Rodar dev (proxy /api + /ws → :8000)
npm run dev
# abre http://localhost:5173

# 4. Testes
npm test           # vitest unit
npm run test:e2e   # playwright + axe

# 5. Build prod
npm run build      # sai em ../back_end_hydrarec/static/
```

---

## 9. Comunicação com backend

- **REST**: `/api/*` proxy do Vite para `:8000` (ver `vite.config.js`)
- **WebSocket**: `/ws` proxy idem; usado pelo `useWebSocket.js` pra
  alertas APAC (boletim novo, mudança de severidade)
- **Public config**: backend serve `GET /api/public-config` com a anon
  key Supabase — frontend usa pra autenticação admin (sem `.env` local)

---

## 10. Roadmap

Fases 1-11 entregues. **Triagem v2** (2026-05-16) — Kanban admin,
3 buckets IA, refresh token, veredito visual. **Ciclo 3** entregue:
Mapa Central admin, recomendações analíticas, validação por timer e
push de validação por proximidade quando houver GPS na subscription.
