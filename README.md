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
| Build output | `../back_end_hydrarec/static/` |

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

---

## Features implementadas

### Localização automática
Ao abrir o app, usa `navigator.geolocation.getCurrentPosition` para detectar a posição do usuário e aplica a fórmula de **Haversine** contra os 73 bairros cadastrados (`data/bairro_coords.js`), exibindo automaticamente o bairro mais próximo.

### Hydra Score + Explicação IA
Anel circular animado (count-up, glow, shockwave em SEVERO) mostrando o score 0–100. Abaixo do anel, botão **"Por que?"** que chama `GET /api/explain/{bairro}` — a IA (NVIDIA NIM Nemotron Super 49B) explica cada componente do score em linguagem acessível ao morador.

Cache de 5 minutos no backend evita chamadas repetidas.

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
Header do bairro com temperatura grande, condição, sensação térmica, umidade, bússola de vento animada (WindCompass), rajada e precipitação atual. Exibe "Sem chuva" quando `precip = 0` (corrige exibição "0.0 mm/h").

### ChipsBar
Métricas secundárias em chips horizontais com **drag-to-scroll no desktop** (mouse drag via `mousedown/move/up`). Chips: Risco de queimadura (UV), Umidade do ar (com label Seco/Agradável/Úmido/Muito úmido), Visibilidade, Nível do mar, Vento.

### Sidebar (drawer no mobile)
Painel esquerdo com todo o conteúdo: HeroCard, ChipsBar, ForecastHourly, AlertBanner, ConfidenceBadge, tabs (IA Narrativa / Análise de Trajeto / Fontes), NearbyReportsList, BairroSearch.

No mobile: drawer deslizante, ativado pelo botão hamburguer no topo do mapa.

### MapStage (HydraMap)
Mapa Leaflet com:
- Círculo de risco colorido por nível (raio 700m, cor sincronizada com `riskColors.js`)
- Marcadores de reports da comunidade (verde/laranja/vermelho por severidade)
- Pontos críticos de alagamento (ícone ⚠)
- GPS marker "Você está aqui" via `watchPosition`
- Zoom controls em `bottomleft` (não conflita com o FAB)
- `isolation: isolate` no container — resolve conflito z-index Leaflet vs FAB

### Extended FAB "Reportar"
Botão flutuante laranja com ícone megafone + label + ping animado. Abre modal para criar ocorrência (tipo + severidade + descrição opcional). Posicionado em `bottom-right`, bem separado dos controles do mapa.

### MobileNav
Barra de navegação inferior fixa no mobile (z-index 70, sempre acima do sidebar). Alterna entre vista Painel e Mapa.

### Tema Claro/Escuro
Toggle persiste em `localStorage`. Todos os componentes adaptam via prop `light` e classes `.app-root.light`.

### ReportModal
Modal para reportar ocorrência com GPS automático + fallback para coordenadas do bairro. Campos: tipo, severidade, descrição livre.

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

> Antes havia duplicação: `HydraMap.jsx` tinha `ATENCAO: '#86efac'` (verde claro errado). Corrigido para importar `getRiskColor()` do `riskColors.js`.

---

## Estrutura de diretórios

```
front_end_hydrarec/src/
├── App.jsx                      # shell principal + geolocalização + hooks
├── hooks/
│   ├── useDashboard.js          # fetch /api/dashboard/{bairro}
│   ├── useReports.js            # fetch + submit reports
│   ├── useRoute.js              # análise de trajeto
│   ├── useNarrative.js          # fetch narrativa IA
│   ├── useExplain.js            # fetch /api/explain/{bairro} (novo)
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
│   │   └── HydraMap.jsx         # Leaflet + círculo risco + GPS + reports
│   ├── weather/
│   │   ├── HeroCard.jsx         # temperatura + score + vento + botão Por que?
│   │   ├── ChipsBar.jsx         # chips drag-scroll
│   │   ├── ForecastHourly.jsx
│   │   └── WindCompass.jsx
│   ├── risk/
│   │   ├── ScoreRing.jsx        # anel SVG animado
│   │   ├── ScoreExplain.jsx     # modal explicação IA (novo)
│   │   ├── AlertBanner.jsx
│   │   └── ConfidenceBadge.jsx
│   ├── ai/
│   │   └── AIInsight.jsx        # narrativa Gemini
│   ├── route/
│   │   └── RouteAnalysis.jsx    # análise de trajeto
│   ├── benchmark/
│   │   └── DifferentialTable.jsx
│   ├── common/
│   │   ├── BairroSearch.jsx     # autocomplete 73 bairros
│   │   ├── IconBtn.jsx
│   │   └── LiveClock.jsx
│   └── reports/
│       ├── NearbyReportsList.jsx
│       └── ReportModal.jsx
├── styles/
│   └── app.css                  # ~1400 linhas, 20 seções
└── main.jsx
```

---

## Bairros suportados

73 bairros do Recife com coordenadas de centroide. A detecção automática usa Haversine com tolerância de ~500m. Em áreas de divisa (ex: Boa Vista/Paissandu), o bairro detectado pode variar conforme a precisão do GPS do dispositivo.

Usuário pode sempre trocar manualmente via **BairroSearch** (autocomplete).

---

## PWA

- `public/manifest.json`: nome, ícone, cores, `display: standalone`
- `public/icon.svg`: gota azul com anel dourado (tema HydraRec)
- `index.html`: `theme-color: #1a1a1a`
