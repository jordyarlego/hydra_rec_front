/* Util de parsing de timestamp APAC — defensivo.

   APAC publica horários como 'YYYY-MM-DD HH:MM:SS' SEM timezone. O dado
   real é UTC. Se o backend ainda estiver rodando código antigo (sem
   normalização) OU se o cache do navegador entregar um shape velho,
   o frontend precisa garantir a conversão correta.

   Regras:
     • Se já tem 'Z', '+HH:MM' ou '-HH:MM' depois do 'T' → parse direto
     • Se NÃO tem TZ → assume UTC e adiciona '+00:00'
     • Substitui espaço por 'T' (formato APAC bruto)
*/

export function parseApacDate(raw) {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s) return null

  // Já tem TZ (T...Z, +HH:MM, -HH:MM depois do T)
  const hasTz = /T.*([Zz]|[+-]\d{2}:?\d{2})$/.test(s)
  if (!hasTz) {
    s = s.replace(' ', 'T')
    if (s.includes('.')) s = s.split('.', 1)[0]
    s += '+00:00'
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function exactTimeRecife(raw) {
  const d = parseApacDate(raw)
  if (!d) return null
  try {
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Recife',
    })
  } catch {
    return null
  }
}

export function timeAgoFromApac(raw) {
  const d = parseApacDate(raw)
  if (!d) return null
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return null
  const min = Math.floor(diffMs / 60000)
  if (min < 1)  return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} dia${h >= 48 ? 's' : ''}`
}
