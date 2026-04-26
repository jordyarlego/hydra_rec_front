/**
 * Client do backend FastAPI.
 * Usa URLs relativas (/api/...) — em dev o Vite proxy redireciona para localhost:8000.
 */

export function translateWeatherCode(code) {
  if (code === 0) return "Céu limpo";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([51, 53, 55].includes(code)) return "Garoa";
  if ([61, 63, 65].includes(code)) return "Chuva";
  if ([80, 81, 82].includes(code)) return "Pancadas de chuva";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Desconhecido";
}

export async function getDashboardDataForCity(cityName) {
  const response = await fetch(`/api/dashboard/${encodeURIComponent(cityName)}`);
  if (!response.ok) {
    throw new Error(`Erro na API (${response.status}): ${response.statusText}`);
  }
  return response.json();
}
