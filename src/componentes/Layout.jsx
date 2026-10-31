import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { PAPEIS } from '../lib/papeis.js'
import { primeiroNome } from '../lib/texto.js'
import Assinatura from './Assinatura.jsx'
import Logo from './Logo.jsx'

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
