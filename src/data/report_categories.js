import alagamentoIcon from '../assets/report-categories/alagamento.png'
import deslizamentoIcon from '../assets/report-categories/deslizamento.png'
import quedaArvoreIcon from '../assets/report-categories/queda-arvore.png'
import viaFechadaIcon from '../assets/report-categories/via-fechada.png'
import posteCaidoIcon from '../assets/report-categories/poste-caido.png'
import buracoIcon from '../assets/report-categories/buraco.png'
import lixoIcon from '../assets/report-categories/lixo.png'
import iluminacaoIcon from '../assets/report-categories/iluminacao.png'
import outroIcon from '../assets/report-categories/outro.png'

export const CATEGORIES = [
  { id: 'alagamento',        icon: alagamentoIcon,        emoji: '🌊', label: 'Alagamento',      sev: 'alto' },
  { id: 'deslizamento',      icon: deslizamentoIcon,      emoji: '⛰️', label: 'Deslizamento',    sev: 'severo' },
  { id: 'queda_arvore',      icon: quedaArvoreIcon,       emoji: '🌳', label: 'Árvore caída',    sev: 'moderado' },
  { id: 'via_intransitavel', icon: viaFechadaIcon,        emoji: '🚧', label: 'Via fechada',     sev: 'moderado' },
  { id: 'poste_caido',       icon: posteCaidoIcon,        emoji: '💡', label: 'Poste caído',     sev: 'alto' },
  { id: 'buraco',            icon: buracoIcon,            emoji: '🕳️', label: 'Buraco na via',   sev: 'moderado' },
  { id: 'lixo',              icon: lixoIcon,              emoji: '🗑️', label: 'Acúmulo de lixo', sev: 'leve' },
  { id: 'iluminacao',        icon: iluminacaoIcon,        emoji: '🔦', label: 'Iluminação',      sev: 'leve' },
  { id: 'outro',             icon: outroIcon,             emoji: '❓', label: 'Outro',           sev: 'moderado' },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))
