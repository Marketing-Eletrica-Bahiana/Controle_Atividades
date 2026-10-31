import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { ProvedorAcesso, useAcesso } from './acesso/ProvedorAcesso.jsx'
import { ProvedorAvisos } from './componentes/Avisos.jsx'
import CarregandoBloco from './componentes/CarregandoBloco.jsx'
import Layout from './componentes/Layout.jsx'
import { PAPEIS, telasDoPapel } from './lib/papeis.js'
import Carregando from './telas/Carregando.jsx'
import Login from './telas/Login.jsx'
import SemAcesso from './telas/SemAcesso.jsx'
import TelaProvisoria from './telas/TelaProvisoria.jsx'

// Telas já construídas, carregadas sob demanda. As demais mostram a tela provisória até a sua fase.
const TELAS_PRONTAS = {
  '/cronometro': lazy(() => import('./telas/cronometro/MeuCronometro.jsx')),
  '/cadastros': lazy(() => import('./telas/cadastros/Cadastros.jsx')),
}

function Rotas() {
  const { situacao, membro } = useAcesso()

  if (situacao === 'carregando') return <Carregando />
  if (situacao === 'fora') return <Login />
  if (situacao !== 'dentro') return <SemAcesso />

  const telas = telasDoPapel(membro.papel)
  return (
    <Layout telas={telas}>
      <Routes>
        {telas.map((tela) => {
          const Tela = TELAS_PRONTAS[tela.caminho]
          return Tela ? (
            <Route
              key={tela.caminho}
              path={`${tela.caminho}/*`}
              element={
                <Suspense fallback={<CarregandoBloco />}>
                  <Tela />
                </Suspense>
              }
            />
          ) : (
            <Route key={tela.caminho} path={tela.caminho} element={<TelaProvisoria tela={tela} />} />
          )
        })}
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
        <ProvedorAvisos>
          <Rotas />
        </ProvedorAvisos>
      </ProvedorAcesso>
    </HashRouter>
  )
}
