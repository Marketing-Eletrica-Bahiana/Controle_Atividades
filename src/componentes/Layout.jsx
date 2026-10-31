import { LogOut, Timer } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { useCronometro } from '../dados/demandas.js'
import { useAgora } from '../hooks/useAgora.js'
import { PAPEIS } from '../lib/papeis.js'
import { formatarTempo } from '../lib/tempo.js'
import { primeiroNome } from '../lib/texto.js'
import Assinatura from './Assinatura.jsx'
import Logo from './Logo.jsx'

const USAM_CRONOMETRO = ['admin', 'equipe']

export default function Layout({ telas, children }) {
  const { membro, sair } = useAcesso()

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="cabecalho__barra">
          <Logo formato="linha" cor="branco" altura={28} className="so-largo" />
          <Logo formato="icone" cor="branco" altura={32} className="so-estreito" />
          <span className="cabecalho__titulo">Controle de Atividades</span>
          <div className="cabecalho__pessoa">
            {USAM_CRONOMETRO.includes(membro.papel) && <CronometroNoCabecalho email={membro.email} />}
            <span className="cabecalho__nome">{primeiroNome(membro.nome)}</span>
            <span className="etiqueta etiqueta--escura">{PAPEIS[membro.papel].rotulo}</span>
            <button type="button" className="botao botao--claro" onClick={sair} aria-label="Sair">
              <LogOut aria-hidden="true" />
              <span className="so-largo">Sair</span>
            </button>
          </div>
        </div>
        <nav className="menu" aria-label="Telas">
          {telas.map(({ caminho, rotulo, Icone }) => (
            <NavLink key={caminho} to={caminho} className={({ isActive }) => `menu__item ${isActive ? 'ativo' : ''}`}>
              <Icone aria-hidden="true" />
              {rotulo}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="conteudo">{children}</main>
      <footer className="rodape">
        <Assinatura />
      </footer>
    </div>
  )
}

// Enquanto o cronômetro da pessoa roda, o tempo da sessão aparece no topo de qualquer tela.
function CronometroNoCabecalho({ email }) {
  const { dados } = useCronometro(email)
  const inicio = dados?.rodando ? dados.inicio?.toDate?.() : null
  const agora = useAgora(Boolean(inicio))
  if (!inicio) return null
  return (
    <NavLink to="/cronometro" className="pilula-cronometro" title="Cronômetro rodando. Abrir Meu Cronômetro">
      <Timer aria-hidden="true" />
      <span className="numero">{formatarTempo(Math.max(0, Math.floor((agora - inicio.getTime()) / 1000)))}</span>
    </NavLink>
  )
}
