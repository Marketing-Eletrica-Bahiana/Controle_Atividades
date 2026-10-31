import { FileUp, Layers, ListChecks, Settings, Shapes, Tags, Users } from 'lucide-react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import Areas from './Areas.jsx'
import Importar from './Importar.jsx'
import Listas from './Listas.jsx'
import Palavras from './Palavras.jsx'
import Pessoas from './Pessoas.jsx'
import Tipos from './Tipos.jsx'

const ABAS = [
  { caminho: 'pessoas', rotulo: 'Pessoas', Icone: Users, Tela: Pessoas },
  { caminho: 'areas', rotulo: 'Áreas', Icone: Layers, Tela: Areas },
  { caminho: 'tipos', rotulo: 'Tipos de atividade', Icone: Shapes, Tela: Tipos },
  { caminho: 'palavras-chave', rotulo: 'Palavras-chave', Icone: Tags, Tela: Palavras },
  { caminho: 'listas', rotulo: 'Listas', Icone: ListChecks, Tela: Listas },
  { caminho: 'importar', rotulo: 'Importar planilha', Icone: FileUp, Tela: Importar },
]

// Só a administração chega aqui (o menu e as rotas já filtram pelo papel).
export default function Cadastros() {
  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <Settings aria-hidden="true" />
          Cadastros
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>
      <nav className="abas" aria-label="Partes dos cadastros">
        {ABAS.map(({ caminho, rotulo, Icone }) => (
          <NavLink key={caminho} to={`/cadastros/${caminho}`} className={({ isActive }) => `abas__item ${isActive ? 'ativo' : ''}`}>
            <Icone aria-hidden="true" />
            {rotulo}
          </NavLink>
        ))}
      </nav>
      <Routes>
        {ABAS.map(({ caminho, Tela }) => (
          <Route key={caminho} path={caminho} element={<Tela />} />
        ))}
        <Route path="*" element={<Navigate to="/cadastros/pessoas" replace />} />
      </Routes>
    </section>
  )
}
