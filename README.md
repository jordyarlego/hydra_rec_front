# HydraRec — Frontend

Dashboard de risco climático hiperlocal para os bairros do Recife. Interface mobile-first estilo Apple Weather / Windy.

> **TCC UFPE 2026** · Jordy Arlego

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite 6 |
| Estilo | CSS custom (sem framework), Outfit font |
| Mapa | Leaflet 1.9.4 + CartoDB tiles (sem API key) |
| Som | Web Audio API (singleton `soundManager.js`) |
| Tempo real | WebSocket nativo (`hooks/useWebSocket.js`) |
| PWA | Service Worker (`public/sw.js`) + `manifest.json` |
| Push | VAPID Web Push (`hooks/usePushNotifications.js`) |
| A11y | axe-core + Playwright E2E (`tests/e2e/`) |
| Previsão 6h | Previsão meteorológica horária vinda de `/api/dashboard/{bairro}` (`forecast6h`) |
| Alertas oficiais | APAC boletim oficial integrado via `hooks/useApac.js` + `ApacBanner.jsx` |
| Rotas | `hooks/useRoute.js` + geocodificação Nominatim (OSM) + resultado desenhado no Leaflet (polyline + círculos de hazard) |
| Ícones | `@phosphor-icons/react` — Car, Bicycle, Footprints, NavigationArrow, ArrowsDownUp |
| Build output | `../back_end_hydrarec/static/` |

---

## Fontes de dados consumidas pela interface

| Fonte | Onde aparece |
|---|---|
| Open-Meteo | clima atual, previsão 6h/diária, métricas meteorológicas e fallback principal |
| OpenWeatherMap | consenso de chuva e métricas atmosféricas quando `OPENWEATHER_KEY` está configurada |
| INMET A301/A357 | chuva recente e métricas oficiais no consenso multi-fonte |
| INMET Avisos | alertas oficiais na análise de trajeto |
| APAC boletim | faixa oficial APAC e contexto da IA |
| APAC Geoportal | estações de chuva em tempo real na análise de trajeto |
| FEMAR | maré usada no Hydra Score |
| OpenStreetMap/CartoDB | mapa e tiles Leaflet |
| OSRM público | cálculo da rota carro/bike/a pé |
| Nominatim | busca de endereço em rota e report por endereço próximo |
| GeoJSON Prefeitura do Recife | limites oficiais dos bairros e detecção GPS por polígono |
| Reports da comunidade | marcadores no mapa, lista de reports, alertas comunitários e push |

---

## Rodando localmente

```bash
cd front_end_hydrarec
npm install
npm run dev      # http://localhost:5173
```

Para build de produção (gera os estáticos servidos pelo FastAPI):

```bash
npm run build
```

Para rodar os testes E2E + acessibilidade:

```bash
npm run test:e2e
```

---

## Features implementadas

### PWA — Instalável, atualização automática, sem zoom no iOS
O app é um Progressive Web App completo:
- `public/manifest.json` — nome, ícone, tema, `display: standalone` (abre sem barra do browser)
- `public/sw.js` — service worker registrado em `main.jsx` **apenas em produção** (em dev, SWs registrados são desregistrados automaticamente para evitar cache stale). Estratégia **network-first**: pass-through para a rede; push e notificationclick handlers integrados.
- **Auto-update**: `main.jsx` chama `reg.update()` a cada 15 min e também no `visibilitychange` (volta a foco). Quando um SW novo instala, recebe `SKIP_WAITING` via `postMessage` e o `controllerchange` listener recarrega a página automaticamente. Resultado: PWA já instalado pega versão nova do Vercel/Render sem reinstalar.
- **Sem zoom no iOS**: `index.html` usa `viewport-fit=cover` e CSS força `font-size: 16px` em todos os inputs no mobile (`@media max-width: 768px`). iOS Safari só aplica zoom quando input tem font < 16px, então essa regra resolve.
- Meta tags `apple-mobile-web-app-capable` e `mobile-web-app-capable` para PWA standalone no iOS.
- Instalável via botão "Adicionar à tela inicial" em Android/iOS/Desktop Chrome.

### WebSocket — Dados em tempo real
`hooks/useWebSocket.js` abre uma conexão persistente com `/ws/{bairro}`. O servidor envia o JSON completo do dashboard **a cada 5 minutos** (sem chamadas de IA — só dados meteorológicos, custo zero de tokens). Quando chega uma atualização, o estado do `useDashboard` é atualizado silenciosamente, sem reload visível.

Reconexão automática com backoff exponencial: 2s → 4s → 8s... até 60s máximo. Troca de bairro fecha e reabre a conexão automaticamente.

Por que não usar polling HTTP? WebSocket mantém uma única conexão TCP persistente em vez de abrir e fechar uma nova conexão a cada request — menos overhead de rede para updates frequentes.

### Push Notifications — Alertas de risco com feedback visual
`hooks/usePushNotifications.js` gerencia o ciclo completo de Web Push, com **estados explícitos** (`idle | subscribed | denied | unsupported | error | loading`) e mensagens de erro detalhadas:
1. Aguarda SW estar pronto (`navigator.serviceWorker.ready`)
2. **Pede permissão separadamente** (`Notification.requestPermission()`) — necessário em iOS Safari/PWA
3. Busca chave VAPID em `GET /api/push/vapid-public-key` (erro explícito se backend não configurou `VAPID_PUBLIC_KEY`)
4. Registra subscription via `PushManager.subscribe()`
5. Envia para `POST /api/push/subscribe` (com erro se backend rejeitar)

`components/common/PushBell.jsx` — sino no header da sidebar. **Toast visual** (verde de sucesso ou vermelho de erro) aparece quando o usuário clica, explicando exatamente o que aconteceu. Estados:
- Laranja com ponto verde → ativo
- Cinza → inativo
- Vermelho → erro (com tooltip explicando)
- Desabilitado → permissão bloqueada no browser
- Spinner → loading durante subscribe/unsubscribe

O backend dispara push quando o motor de alertas comunitários cria um alerta por concentração de reports recentes no mesmo bairro. VAPID (Voluntary Application Server Identification) é o padrão W3C para push sem depender de serviços pagos — funciona nativamente em Chrome, Firefox, Edge e Safari 16+.

Quando funciona:
- usuário precisa clicar no sino e permitir notificações;
- em produção precisa estar em HTTPS;
- no Android/Desktop aparece como notificação do Chrome/PWA;
- no iOS precisa instalar o PWA na tela inicial.

Quem recebe hoje: todos os navegadores inscritos no push. A filtragem por bairro/severidade está prevista pela estrutura do banco (`bairro`, `min_severity`), mas ainda não está aplicada no broadcast.

Para testar sem esperar um alerta real, o backend possui `POST /api/push/test`, protegido por `PUSH_TEST_TOKEN`. O navegador precisa ter clicado no sino antes para existir assinatura salva.

### A11y — Acessibilidade WCAG AA
O app segue as diretrizes WCAG 2.1 nível AA. Verificação automatizada com `@axe-core/playwright` nos testes E2E.

**O que foi implementado:**
- **Focus trap nos modais** (`hooks/useFocusTrap.js`) — Tab/Shift+Tab ficam presos dentro do dialog aberto; Escape fecha; foco retorna ao elemento que abriu após fechar. Aplicado em `ReportModal` e `ScoreExplain`.
- **`role="dialog"` correto** — posicionado no painel de conteúdo (não no backdrop), com `aria-labelledby` apontando para o `<h2>` do modal.
- **`aria-live` em estados de loading** — Sidebar e MapStage usam `aria-live="polite"` + `aria-busy="true"` para que leitores de tela anunciem quando os dados carregam.
- **`role="alert"` vs `role="status"`** — `AlertBanner` usa `role="alert"` (announce imediato) só para níveis MODERADO/ALTO/SEVERO; níveis não críticos usam `role="status"` (announce polido).
- **Combobox acessível** — `BairroSearch` tem `aria-expanded`, `aria-controls`, `aria-activedescendant` corretos para que screen readers anunciem as sugestões durante a navegação por teclado.
- **`aria-label` descritivo** em todos os elementos interativos: botões de ícone, seções de dados, forecast, wind row, ConfidenceBadge.
- **Skip link** `<a href="#main">` visível no foco, para pular direto ao conteúdo principal.
- **SVGs decorativos** com `aria-hidden="true"` para não serem lidos duas vezes.

**Testes E2E (`tests/e2e/`):**
- `app.spec.js` — fluxo principal (dashboard, toggle de tema, mobile drawer)
- `a11y.spec.js` — scan axe WCAG AA da página principal, modais, skip link, navegação por teclado

### Localização automática
Ao abrir o app, usa `navigator.geolocation.getCurrentPosition` para detectar a posição do usuário e cruza o ponto GPS com o GeoJSON oficial dos bairros do Recife (`data/geo/recife_bairros_2023.geojson`). Se o ponto cair dentro de um polígono oficial, esse bairro é selecionado. A fórmula de **Haversine** contra `data/bairro_coords.js` fica apenas como fallback quando o GeoJSON não carregar ou quando o ponto estiver fora dos limites cadastrados.

### Hydra Score + Explicação IA
Anel circular animado (count-up, glow, shockwave em SEVERO) mostrando o score 0–100. Abaixo do anel, botão **"Por que?"** que chama `GET /api/explain/{bairro}` — a IA explica cada componente do score em linguagem acessível ao morador.

O hook `useExplain.js` gerencia o estado (loading / text / error) e exibe via `ScoreExplain.jsx` (modal com renderer de markdown simples e focus trap).

#### Cadeia de fallback da explicação IA (backend)

```
Tentativa 1: NVIDIA NIM — nvidia/llama-3.3-nemotron-super-49b-v1
             ↓ falha
Tentativa 2: NVIDIA NIM — meta/llama-3.3-70b-instruct
             ↓ ambos falham OU sem NVIDIA_API_KEY
Tentativa 3: fallback Python local — dados reais do Hydra Score, sem mock, sem API externa
```

A Tentativa 3 usa os valores reais de `risk['components']` e `risk['raw_values']` para gerar um texto estruturado. **Não é um mock** — os dados de chuva, maré, vulnerabilidade e altitude são os mesmos calculados pelo Hydra Score v2.

Cache de 5 minutos no backend evita rechamadas.

### Previsão 6h
A sidebar exibe apenas a previsão meteorológica das próximas 6 horas (`forecast6h`) vinda do dashboard principal. O antigo bloco `RiskForecast` foi removido para reduzir ruído visual e evitar duplicar score com baixa confiança quando fontes externas caem.

### ApacBanner — Boletim Oficial APAC
Faixa de alerta oficial da Agência Pernambucana de Águas e Clima, exibida logo abaixo do `AlertBanner` quando há boletim ativo afetando a Região Metropolitana do Recife.

`hooks/useApac.js` faz polling único em `GET /api/apac/boletim` (cache 30min no backend). `components/risk/ApacBanner.jsx` só renderiza quando `nivel !== 'SEGURO'`. Exibe:
- Badge "APAC · Oficial" com cor do nível
- Título do boletim + texto resumido
- Link "Ver boletim completo →" para a página oficial
- Timestamp da coleta

Usa `role="alert"` + `aria-live="assertive"` — leitores de tela anunciam imediatamente.

### AtmosphericBg
Background animado que muda de gradiente e animações conforme a condição meteorológica atual: `Tempestade`, `Chuva Forte`, `Chuva`, `Garoa`, `Nublado`, `Ensolarado`. Inclui raios animados por CSS + som sincronizado via Web Audio API.

### Sound Manager (`lib/soundManager.js`)
Singleton Web Audio API com:
- Chuva ambiente (intensidade leve / pesada)
- Trovão aleatório agendado com `setTimeout`
- Alerta sonoro quando score cruza 60 subindo
- Click tátil em botões

Sons são opcionais — persiste preferência em `localStorage`.

### HeroCard
Header do bairro com temperatura grande, condição, sensação térmica, umidade, bússola de vento animada (WindCompass), rajada e precipitação atual. Exibe "Sem chuva" quando `precip = 0`.

### ChipsBar
Métricas secundárias em chips horizontais com **drag-to-scroll no desktop** (mouse drag via `mousedown/move/up`). Chips: Risco de queimadura (UV), Umidade do ar (com label Seco/Agradável/Úmido/Muito úmido), Visibilidade, Nível do mar, Vento.

### Sidebar (drawer no mobile)
Painel esquerdo com todo o conteúdo: HeroCard, ChipsBar, ForecastHourly, AlertBanner, ConfidenceBadge, tabs (IA Narrativa / Análise de Trajeto / Fontes), NearbyReportsList, BairroSearch.

**ConfidenceBadge:** pill não-alarmista mostrando número de fontes e nível de confiança (ALTA/MÉDIA). Com confiança BAIXA e 1 fonte, exibe texto discreto "1 fonte · dados parciais" — sem dot pulsante vermelho.

No mobile: drawer deslizante, ativado pelo botão hamburguer no topo do mapa.

### AIInsight (boletim operacional)
Painel "Análise IA" na aba da sidebar. Exibe 4 linhas geradas pela IA como **fluxo narrativo sem labels** — as frases contextualizam a si mesmas:
- **Diagnóstico** — risco atual com score, mm de chuva e fonte (ex.: "Score 53/100 em Santo Amaro — 13mm previstos pelo OpenWeatherMap, risco moderado")
- **Localização** — rua ou ponto de atenção nomeado (ex.: "Canal da Tacaruna e Av. Dantas Barreto merecem atenção")
- **Janela** — duração do cenário baseada em `rain_next_24h_mm` real
- **Ação** — verbo no imperativo, executável agora; destacado em âmbar, sem label "Ação agora" redundante

Badge "IA · [modelo]" muda dinamicamente (`Nemotron 49B`, `Llama 70B`, `Gemini Flash`, ou `Análise local`).

**Enriquecimento com APAC:** `AIInsight` chama `useApac()` e passa o boletim oficial para a narrativa. Alerta SEVERO calibra o tom mesmo com score moderado.

**Métricas multi-fonte:** `fusion.py` cruza umidade, vento e pressão de Open-Meteo + OWM + INMET, expondo médias consensuais.

### RouteAnalysis — Rota inteligente com geocodificação e IA

Input de endereço livre como Google Maps — o usuário digita qualquer rua, bairro ou ponto de referência; o componente consulta o **Nominatim** (OpenStreetMap, gratuito, sem chave) e exibe sugestões em dropdown.

**Fluxo:**
1. Usuário digita origem e destino (texto livre)
2. Debounce 450ms → `GET nominatim.openstreetmap.org/search?q=...+Recife+PE` → dropdown de sugestões
3. Seleção retorna lat/lon → enviado ao backend com o modal escolhido
4. Backend calcula rota OSRM + riscos em tempo real (4 fontes em paralelo)
5. Resultado: polyline azul desenhada no mapa Leaflet + círculos de hazard coloridos

**Modo de transporte:** 🚗 Carro · 🚲 Bike · 🚶 A pé — cada modal usa um servidor OSRM diferente (`routed-car`, `routed-bike`, `routed-foot`) retornando geometria, distância e duração reais para o modal. O multiplicador de risco é aplicado sobre o score final.

**Conteúdo do resultado:**
- Score do trajeto + distância km + tempo estimado
- **Chip APAC com descrição em português** (cor dinâmica por nível): "APAC: atenção preventiva — chuva possível" — não exibe sigla sem contexto
- **Narrativa IA de 3 frases** específica para o modal e situação atual — sem rótulos "Frase 1"
- Alertas ativos INMET para PE (quando houver)
- Hazards: **30 pontos históricos** (Defesa Civil PE / APAC 2018-2024) em raio 0.6km da rota — cobre Boa Viagem (Shopping Recife, Canal dos Setúbal, Av. Domingos Ferreira), Santo Amaro (Canal da Tacaruna), Derby, Arruda, Jordão/Ibura, Tejipió e outros; + estações APAC com chuva ativa (tempo real)
- Badge "Histórico" vs "Tempo real" em cada hazard
- Rodapé: "Rota: OSRM/OSM · Estações: APAC Geoportal (RT) · Alertas: INMET"

**Botão swap ⇅** inverte origem e destino com um clique.

**Loading state profissional:** durante o cálculo, aparece um card com 3 anéis concêntricos animados nas cores do HydraRec (âmbar #e8a030) girando em direções alternadas + texto "Analisando seu trajeto · OSRM · APAC · INMET · Defesa Civil PE". O botão também mostra spinner enquanto carrega.

**No mapa Leaflet:** ao calcular a rota, o mapa faz zoom automático para enquadrar o trajeto. Polyline azul + círculos coloridos (verde/laranja/vermelho) em cada hazard com popup descritivo. Botão "Trajeto" nos controles do mapa para ocultar/mostrar.

### MapStage (HydraMap)
Mapa Leaflet com:
- Polígono oficial do bairro (GeoJSON da Prefeitura do Recife) — círculo de centroide é fallback
- Marcadores de reports da comunidade (verde/laranja/vermelho por severidade)
- Pontos críticos de alagamento (ícone ⚠)
- GPS marker "Você está aqui" via `watchPosition`
- **Polyline azul da rota calculada** + círculos de hazard coloridos (verde/laranja/vermelho) com popup descritivo
- Zoom automático para enquadrar a rota ao analisar trajeto
- Botões de camada: Reports · Críticos · GPS · **Trajeto** (aparece após calcular rota)
- Zoom controls em `bottomleft` (não conflita com o FAB)

### Extended FAB "Reportar"
Botão flutuante laranja com ícone megafone + label + ping animado. Abre modal para criar ocorrência (tipo + severidade + descrição opcional). Posicionado em `bottom-right`, bem separado dos controles do mapa.

### MobileNav
Barra de navegação inferior fixa no mobile (z-index 70, sempre acima do sidebar). Alterna entre vista Painel e Mapa.

### Tema Claro/Escuro
Toggle persiste em `localStorage`. Todos os componentes adaptam via prop `light` e classes `.app-root.light`.

### ReportModal
Modal para reportar ocorrência usando GPS atual do navegador. O usuário escolhe entre:

- **Estou aqui** — reporta exatamente na localização atual;
- **Endereço próximo** — busca uma rua/ponto de referência via Nominatim, limitado a **1,5 km** do GPS atual.

Campos: tipo, severidade, descrição livre. Focus trap via `useFocusTrap`.

### Reports no mapa
Os reports comunitários aparecem como marcadores no mapa e na lista "Reports próximos".

Regra de exibição:
- ficam visíveis por até **24 horas**;
- só aparecem se `resolved = false`;
- a busca usa raio padrão de **2km** ao redor do ponto consultado;
- após enviar um report, o frontend recarrega a lista ao redor do ponto GPS reportado.

Regra anti-spam:
- o backend aceita **1 report a cada 5 minutos por IP hasheado**;
- se o usuário tentar enviar outro dentro desse intervalo, a API retorna `429` com "Aguarde 5 minutos entre reports.".
- o endereço reportado precisa estar a até **1,5 km da localização GPS atual**; pontos mais distantes são bloqueados no frontend e rejeitados pelo backend.

Reports com 3+ ocorrências do mesmo tipo no mesmo bairro em até 1 hora podem gerar alerta comunitário e push notification.

---

## Paleta de risco (fonte única: `lib/riskColors.js`)

Todos os componentes (ScoreRing, AlertBanner, mapa, chips) usam esta paleta central:

| Nível | Score | Cor |
|---|---|---|
| SEGURO | 0–24 | `#22c55e` verde |
| ATENÇÃO | 25–44 | `#facc15` amarelo |
| MODERADO | 45–64 | `#f97316` laranja |
| ALTO | 65–79 | `#ef4444` vermelho |
| SEVERO | 80–100 | `#7c3aed` roxo |

---

## Estrutura de diretórios

```
front_end_hydrarec/src/
├── App.jsx                      # shell principal + geolocalização + hooks
├── hooks/
│   ├── useDashboard.js          # fetch /api/dashboard/{bairro}
│   ├── useReports.js            # fetch + submit reports
│   ├── useRoute.js              # análise de trajeto
│   ├── useNarrative.js          # fetch narrativa IA (model_used dinâmico)
│   ├── useExplain.js            # fetch /api/explain/{bairro}
│   ├── useWebSocket.js          # WS /ws/{bairro} com reconexão automática
│   ├── usePushNotifications.js  # subscribe/unsubscribe VAPID push
│   ├── useFocusTrap.js          # trap Tab/Shift+Tab dentro de dialogs abertos
│   ├── useApac.js               # fetch /api/apac/boletim (boletim oficial APAC)
│   └── useTheme.js              # dark/light + localStorage
├── lib/
│   ├── api.js                   # fetch helpers
│   ├── riskColors.js            # paleta de cores por nível (fonte única)
│   └── soundManager.js          # Web Audio API singleton
├── data/
│   ├── bairro_coords.js         # 73 bairros com lat/lon (centroides IBGE)
│   ├── bairros.js               # lista de nomes para autocomplete
│   └── pontos_criticos.js       # pontos conhecidos de alagamento
├── components/
│   ├── effects/
│   │   ├── AtmosphericBg.jsx    # background animado por condição
│   │   └── HydraLogo.jsx
│   ├── loading/
│   │   └── LoadingScreen.jsx    # splash 4.3s com progresso fake
│   ├── layout/
│   │   ├── Sidebar.jsx          # painel esquerdo completo
│   │   ├── MapStage.jsx         # wrapper do mapa + FAB
│   │   └── MobileNav.jsx        # nav inferior mobile
│   ├── map/
│   │   └── HydraMap.jsx         # Leaflet + polígono bairro + GPS + reports
│   ├── weather/
│   │   ├── HeroCard.jsx         # temperatura + score + vento + botão Por que?
│   │   ├── ChipsBar.jsx         # chips drag-scroll
│   │   ├── ForecastHourly.jsx   # previsão 6h com aria-label por slot
│   │   └── WindCompass.jsx
│   ├── risk/
│   │   ├── ScoreRing.jsx        # anel SVG animado com aria-label descritivo
│   │   ├── ScoreExplain.jsx     # modal explicação IA + focus trap
│   │   ├── AlertBanner.jsx      # role=alert (crítico) / role=status (normal)
│   │   ├── ApacBanner.jsx       # boletim oficial APAC (role=alert, só se nivel≠SEGURO)
│   │   └── ConfidenceBadge.jsx
│   ├── ai/
│   │   └── AIInsight.jsx        # boletim IA com badge de modelo dinâmico
│   ├── route/
│   │   └── RouteAnalysis.jsx    # análise de trajeto
│   ├── benchmark/
│   │   └── DifferentialTable.jsx
│   ├── common/
│   │   ├── BairroSearch.jsx     # combobox acessível: aria-expanded/controls/activedescendant
│   │   ├── PushBell.jsx         # toggle de notificações push
│   │   ├── IconBtn.jsx
│   │   └── LiveClock.jsx
│   └── reports/
│       ├── NearbyReportsList.jsx
│       └── ReportModal.jsx      # dialog acessível + focus trap
├── styles/
│   └── app.css                  # ~1400 linhas, 20 seções
└── main.jsx
tests/e2e/
├── app.spec.js                  # fluxo principal + mobile
└── a11y.spec.js                 # scan axe WCAG AA + skip link + teclado
```

---

## Bairros suportados

73 bairros do Recife com coordenadas de centroide para fallback. A detecção automática principal usa ponto-dentro-do-polígono no GeoJSON oficial; Haversine só entra se o limite oficial não estiver disponível.

Usuário pode sempre trocar manualmente via **BairroSearch** (combobox com autocomplete e navegação por teclado).

---

## PWA

- `public/manifest.json`: nome, ícone, cores, `display: standalone`
- `public/icon.svg`: gota azul com anel dourado (tema HydraRec)
- `index.html`: `theme-color: #1a1a1a`
- Service Worker registrado só em `PROD` — em dev, SWs existentes são desregistrados automaticamente
