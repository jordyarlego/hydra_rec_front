# hydra.rec — Frontend

Dashboard de **alerta de risco climático hiperlocal** para os bairros do Recife, PE.  
Monitora chuva, marés, saturação do solo e altitude para gerar um **Hydra Score** (0-100) por bairro, com boletim de Defesa Civil gerado por IA.

---

## Funcionalidades

- **87 bairros do Recife** selecionáveis via busca
- **Hydra Score** — índice de risco de enchente/deslizamento em tempo real
- **Boletim IA** — análise gerada pelo Gemini, estilo Defesa Civil
- **Previsão das próximas 6 horas** — temperatura e precipitação por hora
- **Background dinâmico** — animações de chuva, nuvens, sol ou noite conforme o clima real
- **Responsivo** — funciona em desktop e mobile

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 |
| Build | Vite 6 |
| Ícones | Lucide React |
| Estilo | CSS puro (sem framework) |
| Dados | Backend HydraRec (FastAPI) |

---

## Pré-requisitos

- **Node.js** 18 ou superior
- **Backend HydraRec** rodando em `http://localhost:8000`  
  → [hydra_rec_back](https://github.com/jordyarlego/hydra_rec_back)

---

## Instalação e execução

```bash
# 1. Clone o repositório
git clone https://github.com/jordyarlego/hydra_rec_front.git
cd hydra_rec_front

# 2. Instale as dependências
npm install

# 3. Rode em desenvolvimento
npm run dev
```

Acesse em `http://localhost:5173`

---

## Build para produção

```bash
npm run build
npm run preview
```

---

## Variáveis de ambiente

Nenhuma chave de API é necessária no frontend.  
O Gemini e todos os dados climáticos são chamados **exclusivamente pelo backend**.

> Nunca adicione `VITE_GEMINI_API_KEY` aqui — o prefixo `VITE_` expõe o valor no bundle JavaScript.

---

## Estrutura do projeto

```
src/
├── components/
│   ├── ErrorBoundary.jsx     # Tela de fallback em caso de crash
│   ├── SearchableDropdown.jsx # Seletor de bairro com busca
│   └── WeatherAnimation.jsx  # Partículas animadas (chuva, estrelas, nuvens, sol)
├── data/
│   └── recifeBairros.js      # Lista estática dos 87 bairros
├── services/
│   ├── GeminiNarrativeService.js  # Chama /api/narrative no backend
│   └── WeatherRiskService.js      # Chama /api/dashboard/{bairro}
├── App.jsx                   # Componente principal (layout split-panel)
├── index.css                 # Todos os estilos (variáveis CSS, animações, layout)
└── main.jsx                  # Entrada — wrappado com ErrorBoundary
```

---

## Como funciona

```
Usuário seleciona bairro
        ↓
GET /api/dashboard/{bairro}  (backend)
        ↓
Exibe temperatura, risco, maré, saturação, previsão 6h
        ↓
POST /api/narrative           (backend → Gemini)
        ↓
Exibe boletim de 3 linhas da Defesa Civil
```

---

## Proxy de desenvolvimento

O `vite.config.js` redireciona `/api/*` para `http://localhost:8000` automaticamente em dev — sem CORS e sem hardcode de URL no código.
