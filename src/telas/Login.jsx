import { useState } from 'react'
import { CircleAlert, LoaderCircle, LogIn } from 'lucide-react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import FundoMarca from '../componentes/FundoMarca.jsx'
import Logo from '../componentes/Logo.jsx'
import { DOMINIO_EMPRESA } from '../firebase.js'
import { mascotes } from '../lib/marca.js'

export default function Login() {
  const { entrar, erro } = useAcesso()
  const [entrando, setEntrando] = useState(false)

  async function aoEntrar() {
    setEntrando(true)
    try {
      await entrar()
    } finally {
      setEntrando(false)
    }
  }

  return (
    <FundoMarca>
      <div className="login">
        <img className="login__mascote login__mascote--ebinho" src={mascotes.ebinho} alt="" />
        <section className="janela login__janela">
          <Logo formato="compacto" cor="azul" altura={80} />
          <div className="linha-circuito" aria-hidden="true" />
          <h1 className="titulo-destaque">Controle de Atividades</h1>
          <p>
            Cada minuto do seu trabalho conta. Entre com o seu e-mail da Elétrica Bahiana e bora registrar o que
            você faz de melhor!
          </p>
          <button
            type="button"
            className="botao botao--principal botao--grande"
            onClick={aoEntrar}
            disabled={entrando}
          >
            {entrando ? <LoaderCircle className="girando" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            Entrar com Google
          </button>
          <p className="texto-suave texto-pequeno">Acesso só com e-mail @{DOMINIO_EMPRESA}.</p>
          {erro && (
            <p className="aviso aviso--erro" role="alert">
              <CircleAlert aria-hidden="true" />
              {erro}
            </p>
          )}
        </section>
        <img className="login__mascote login__mascote--ebinha" src={mascotes.ebinha} alt="" />
      </div>
    </FundoMarca>
  )
}
