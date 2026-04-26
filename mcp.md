# HydraRec MCP (Master Context Plan)

Este arquivo atua como o rastreador de arquitetura persistente do sistema.
Utilize-o para revisar os endpoints, modelos de dados e estratégias de raspagem que estão ativas no Frontend (Evitando hardcode em memórias passadas).

## 1. APIs Oficiais (Open-Meteo)
- **Geocoding**: `geocoding-api.open-meteo.com` (Converte nome do bairro/cidade em Lat/Lon).
- **Tempo e Chuva**: `api.open-meteo.com/v1/forecast` com queries `past_hours=24` e `forecast_hours=24`.
- **Topografia**: `api.open-meteo.com/v1/elevation` (Descobre a altitude em metros - Penaliza score do bairro se muito baixo).

## 2. Scraping Service Local (TideScraperService)
Como a aplicação está sendo construída apenas no Frontend via Vite (sem backend acoplado em runtime), criamos um serviço puramente HTTP utilizando um Proxy de CORS gratuito de mercado:
- **Proxy**: `https://api.allorigins.win/get?url=`
- **Alvo da Raspagem**: `https://tabuademares.com/br/pernambuco/recife`
- **Métrica Alvo**: Extraímos o `<div class="margin-bottom">` que contém os status da próxima maré (ex: "Enchendo para 2.4m" ou semelhante) para transformar em multiplicador dinâmico de risco (ex: Maré alta = peso 100).

## 3. Composição de Interface (UI)
- Lógica Cinemática: `App.jsx` dita vídeos MP4 ou fallbacks (Unsplash) com base em `is_day` e `weather_code`.
- Estabilidade Flexbox: `index.css` porta todo o Layout Split (Painel Transparente e Conteúdo Principal) para evitar o crash de renderização ocorrido na V2.
- A Interface de API do Gemini está suprimida. A narrativa de IA será delegada a um endpoint no futuro e atualmente consta como "Offline - Aguardando Chave."
