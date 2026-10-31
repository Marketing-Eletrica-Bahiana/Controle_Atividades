import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { ProvedorAcesso, useAcesso } from './acesso/ProvedorAcesso.jsx'
import Layout from './componentes/Layout.jsx'
import { PAPEIS, telasDoPapel } from './lib/papeis.js'
import Carregando from './telas/Carregando.jsx'
import Login from './telas/Login.jsx'
import SemAcesso from './telas/SemAcesso.jsx'
import TelaProvisoria from './telas/TelaProvisoria.jsx'

function Rotas() {
  const { situacao, membro } = useAcesso()

  if (situacao === 'carregando') return <Carregando />
  if (situacao === 'fora') return <Login />
  if (situacao !== 'dentro') return <SemAcesso />

  const telas = telasDoPapel(membro.papel)
  return (
    <Layout telas={telas}>
      <Routes>
        {telas.map((tela) => (
          <Route key={tela.caminho} path={tela.caminho} element={<TelaProvisoria tela={tela} />} />
        ))}
        {/* Qualquer outro endereço, inclusive a entrada, leva à tela inicial do papel (diretoria: Painel). */}
        <Route path="*" element={<Navigate to={PAPEIS[membro.papel].telaInicial} replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ProvedorAcesso>
        <Rotas />
      </ProvedorAcesso>
    </HashRouter>
  )
}
