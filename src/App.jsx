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

// Cada tela é carregada sob demanda, só quando a pessoa abre.
const TELAS = {
  '/cronometro': lazy(() => import('./telas/cronometro/MeuCronometro.jsx')),
  '/demandas': lazy(() => import('./telas/demandas/Demandas.jsx')),
  '/semana': lazy(() => import('./telas/semana/Semana.jsx')),
  '/painel': lazy(() => import('./telas/painel/Painel.jsx')),
  '/administracao': lazy(() => import('./telas/cadastros/Cadastros.jsx')),
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
          const Tela = TELAS[tela.caminho]
          return (
            <Route
              key={tela.caminho}
              path={`${tela.caminho}/*`}
              element={
                <Suspense fallback={<CarregandoBloco />}>
                  <Tela />
                </Suspense>
              }
            />
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
