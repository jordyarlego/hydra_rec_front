export const STATUS_LABELS = {
  pending: 'Novo',
  validated: 'Validado',
  flagged: 'Revisar',
  resolved: 'Resolvido',
  rejected: 'Rejeitado',
}

export const STATUS_HELP = {
  pending: 'Ainda não passou pela triagem.',
  validated: 'Report coerente e pronto para virar chamado.',
  flagged: 'Precisa de checagem humana antes de acionar equipe.',
  resolved: 'Atendimento concluído.',
  rejected: 'Duplicado, inconsistente ou fora do escopo.',
}

export const STATUS_OPTIONS = [
  ['pending', STATUS_LABELS.pending],
  ['validated', STATUS_LABELS.validated],
  ['flagged', STATUS_LABELS.flagged],
  ['resolved', STATUS_LABELS.resolved],
  ['rejected', STATUS_LABELS.rejected],
]

export const PRIORITY_LABELS = {
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export function statusLabel(status) {
  return STATUS_LABELS[status || 'pending'] || status || 'Novo'
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS[priority || 'baixa'] || priority || 'Baixa'
}
