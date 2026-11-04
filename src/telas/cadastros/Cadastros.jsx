import { FileSpreadsheet, FlaskConical, Import, Layers, ListChecks, Settings, Shapes, SquareKanban, Tags, Users } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import Areas from './Areas.jsx'
import ColunasQuadro from './ColunasQuadro.jsx'
import ImportarTrello from './ImportarTrello.jsx'
import Listas from './Listas.jsx'
import Palavras from './Palavras.jsx'
import Pessoas from './Pessoas.jsx'
import Planilhas from './Planilhas.jsx'
import TestarClassificacao from './TestarClassificacao.jsx'
import Tipos from './Tipos.jsx'

const ABAS = [
  { caminho: 'pessoas', rotulo: 'Pessoas', Icone: Users, Tela: Pessoas },
  { caminho: 'areas', rotulo: 'Áreas', Icone: Layers, Tela: Areas },
  { caminho: 'planilhas', rotulo: 'Planilhas', Icone: FileSpreadsheet, Tela: Planilhas },
  { caminho: 'tipos', rotulo: 'Tipos', Icone: Shapes, Tela: Tipos },
  { caminho: 'palavras-chave', rotulo: 'Palavras-chave', Icone: Tags, Tela: Palavras },
  { caminho: 'testar-classificacao', rotulo: 'Testar classificação', Icone: FlaskConical, Tela: TestarClassificacao },
  { caminho: 'listas', rotulo: 'Listas', Icone: ListChecks, Tela: Listas },
  { caminho: 'quadro', rotulo: 'Quadro', Icone: SquareKanban, Tela: ColunasQuadro },
  { caminho: 'trello', rotulo: 'Trello', Icone: Import, Tela: ImportarTrello },
]

// Tela Administração: só o papel admin chega aqui (o menu e as rotas já filtram pelo papel).
export default function Cadastros() {
  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <Settings aria-hidden="true" />
          Administração
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>
      <nav className="abas" aria-label="Partes da administração">
        {ABAS.map(({ caminho, rotulo, Icone }) => (
          <NavLink key={caminho} to={`/administracao/${caminho}`} className={({ isActive }) => `abas__item ${isActive ? 'ativo' : ''}`}>
            <Icone aria-hidden="true" />
            {rotulo}
          </NavLink>
        ))}
      </nav>
      <Routes>
        {ABAS.map(({ caminho, Tela }) => (
          <Route key={caminho} path={caminho} element={<Tela />} />
        ))}
        <Route path="*" element={<Navigate to="/administracao/pessoas" replace />} />
      </Routes>
    </section>
  )
}
