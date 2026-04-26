/**
 * Chama o endpoint /api/narrative do backend.
 * A chave Gemini fica no servidor — nunca exposta no cliente.
 */
export async function generateRiskExplanation(cityName, riskData) {
  try {
    const response = await fetch('/api/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityName, riskData }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.narrative;
  } catch (error) {
    console.error("Narrative API Error:", error);
    return "Ocorreu um erro ao gerar o boletim de análise. Verifique se o servidor está rodando.";
  }
}
