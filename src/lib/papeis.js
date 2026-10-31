import { CalendarDays, ChartColumn, ClipboardList, Settings, Timer } from 'lucide-react'

export const PAPEIS = {
  admin: { rotulo: 'Administração', telaInicial: '/cronometro' },
  equipe: { rotulo: 'Equipe', telaInicial: '/cronometro' },
  gestor: { rotulo: 'Gestão', telaInicial: '/demandas' },
  diretoria: { rotulo: 'Diretoria', telaInicial: '/painel' },
}

const TODOS = Object.keys(PAPEIS)

// "fase" é a fase do projeto em que a tela ganha conteúdo de verdade.
export const TELAS = [
  { caminho: '/cronometro', rotulo: 'Meu Cronômetro', Icone: Timer, papeis: ['admin', 'equipe'], fase: 3 },
  { caminho: '/demandas', rotulo: 'Demandas', Icone: ClipboardList, papeis: TODOS, fase: 4 },
  { caminho: '/semana', rotulo: 'Semana', Icone: CalendarDays, papeis: TODOS, fase: 5 },
  { caminho: '/painel', rotulo: 'Painel', Icone: ChartColumn, papeis: TODOS, fase: 5 },
  { caminho: '/cadastros', rotulo: 'Cadastros', Icone: Settings, papeis: ['admin'], fase: 2 },
]

export const papelValido = (papel) => Object.hasOwn(PAPEIS, papel)

export const telasDoPapel = (papel) => TELAS.filter((tela) => tela.papeis.includes(papel))
