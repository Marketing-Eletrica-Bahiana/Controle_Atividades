import { CalendarDays, ChartColumn, ClipboardList, Settings, Timer } from 'lucide-react'

export const PAPEIS = {
  admin: { rotulo: 'Administração', telaInicial: '/cronometro' },
  equipe: { rotulo: 'Equipe', telaInicial: '/cronometro' },
  gestor: { rotulo: 'Gestão', telaInicial: '/demandas' },
  diretoria: { rotulo: 'Diretoria', telaInicial: '/painel' },
}

const TODOS = Object.keys(PAPEIS)

export const TELAS = [
  { caminho: '/cronometro', rotulo: 'Meu Cronômetro', Icone: Timer, papeis: ['admin', 'equipe'] },
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
