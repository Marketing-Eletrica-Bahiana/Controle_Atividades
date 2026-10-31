import { useState } from 'react'
import { CircleAlert, LoaderCircle, LogOut, RotateCw, Send } from 'lucide-react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import FundoMarca from '../componentes/FundoMarca.jsx'
import Logo from '../componentes/Logo.jsx'
import { mensagemDeErro } from '../lib/erros.js'
import { mascotes } from '../lib/marca.js'
import { primeiroNome } from '../lib/texto.js'

// Quem entrou com o Google mas ainda não pode usar o sistema: sem cadastro, desativado ou com cadastro incompleto.
export default function SemAcesso() {
  const { situacao, usuario, erro, sair, pedirAcesso } = useAcesso()
  const [pedido, setPedido] = useState('')
  const [erroPedido, setErroPedido] = useState('')
  const nome = primeiroNome(usuario?.displayName)

  const textos = {
    'sem-cadastro': {
      titulo: nome ? `Oi, ${nome}! Falta pouco.` : 'Falta pouco!',
      texto: 'Seu acesso ainda não foi liberado. Peça acesso e a administração libera para você.',
    },
    inativo: {
      titulo: 'Acesso desativado',
      texto: 'Seu acesso está desativado no momento. Se isso for engano, fale com a administração.',
    },
    'sem-papel': {
      titulo: 'Cadastro incompleto',
      texto: 'Seu cadastro está sem um papel válido. Fale com a administração para ajustar.',
    },
    erro: {
      titulo: 'Não deu para carregar seu cadastro',
      texto: erro,
    },
  }
  const { titulo, texto } = textos[situacao] ?? textos.erro

  async function aoPedir() {
    setPedido('enviando')
    setErroPedido('')
    try {
      await pedirAcesso()
      setPedido('enviado')
    } catch (e) {
      setPedido('')
      setErroPedido(mensagemDeErro(e))
    }
  }

  return (
    <FundoMarca>
      <div className="sem-acesso">
        <img className="sem-acesso__mascote" src={mascotes.ebinha} alt="" />
        <section className="janela sem-acesso__janela">
          <Logo formato="compacto" cor="azul" altura={64} />
          <div className="linha-circuito" aria-hidden="true" />
          <h1 className="titulo-destaque">{titulo}</h1>
          <p>{texto}</p>
          {usuario?.email && <p className="texto-suave texto-pequeno">Conta: {usuario.email}</p>}

          {situacao === 'sem-cadastro' && pedido !== 'enviado' && (
            <button
              type="button"
              className="botao botao--principal botao--grande"
              onClick={aoPedir}
              disabled={pedido === 'enviando'}
            >
              {pedido === 'enviando' ? (
                <LoaderCircle className="girando" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              Pedir acesso
            </button>
          )}
          {pedido === 'enviado' && (
            <p className="aviso aviso--ok" role="status">
              Pedido enviado! Assim que liberarem, é só entrar de novo.
            </p>
          )}
          {erroPedido && (
            <p className="aviso aviso--erro" role="alert">
              <CircleAlert aria-hidden="true" />
              {erroPedido}
            </p>
          )}

          <div className="acoes">
            {situacao === 'erro' && (
              <button type="button" className="botao botao--secundario" onClick={() => window.location.reload()}>
                <RotateCw aria-hidden="true" />
                Tentar de novo
              </button>
            )}
            <button type="button" className="botao botao--secundario" onClick={sair}>
              <LogOut aria-hidden="true" />
              Sair
            </button>
          </div>
        </section>
      </div>
    </FundoMarca>
  )
}
