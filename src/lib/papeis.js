import { CalendarCheck, CalendarDays, ChartColumn, ClipboardList, Settings, SquareKanban, Timer } from 'lucide-react'

export const PAPEIS = {
  admin: { rotulo: 'Administração', telaInicial: '/cronometro' },
  equipe: { rotulo: 'Equipe', telaInicial: '/cronometro' },
  gestor: { rotulo: 'Gestão', telaInicial: '/demandas' },
  diretoria: { rotulo: 'Diretoria', telaInicial: '/painel' },
}

const TODOS = Object.keys(PAPEIS)

export const TELAS = [
  { caminho: '/cronometro', rotulo: 'Meu Cronômetro', Icone: Timer, papeis: ['admin', 'equipe'] },
  { caminho: '/quadro', rotulo: 'Quadro', Icone: SquareKanban, papeis: TODOS },
  { caminho: '/calendario', rotulo: 'Calendário', Icone: CalendarCheck, papeis: TODOS },
  { caminho: '/demandas', rotulo: 'Demandas', Icone: ClipboardList, papeis: TODOS },
  { caminho: '/semana', rotulo: 'Semana', Icone: CalendarDays, papeis: TODOS },
  { caminho: '/painel', rotulo: 'Painel', Icone: ChartColumn, papeis: TODOS },
  { caminho: '/administracao', rotulo: 'Administração', Icone: Settings, papeis: ['admin'] },
]

export const papelValido = (papel) => Object.hasOwn(PAPEIS, papel)

export const telasDoPapel = (papel) => TELAS.filter((tela) => tela.papeis.includes(papel))

// Admin, gestão e diretoria veem todas as áreas; equipe vê só as próprias.
export const veTodasAsAreas = (papel) => ['admin', 'gestor', 'diretoria'].includes(papel)

// Equipe edita e reabre só as próprias demandas; admin, de todos; gestão e diretoria só leem.
export const podeEditar = (membro, demanda) =>
  membro.papel === 'admin' || (membro.papel === 'equipe' && demanda?.responsavelEmail === membro.email)

export const podeExcluir = (membro) => membro.papel === 'admin'

// Quadro: admin e equipe criam, editam e movem qualquer cartão; gestão e diretoria só leem; excluir é só do admin.
export const podeMexerNoQuadro = (membro) => ['admin', 'equipe'].includes(membro.papel)

export const podeExcluirCartao = (membro) => membro.papel === 'admin'
