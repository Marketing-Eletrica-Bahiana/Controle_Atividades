import { useCallback, useState } from 'react'
import Janela from './Janela.jsx'

// Pergunta de confirmação. Uso: const [janela, confirmar] = useConfirmar(); if (await confirmar({...})) ...
export function useConfirmar() {
  const [pedido, setPedido] = useState(null)

  const confirmar = useCallback((opcoes) => new Promise((resolve) => setPedido({ ...opcoes, resolve })), [])

  function responder(resposta) {
    pedido?.resolve(resposta)
    setPedido(null)
  }

  const janela = (
    <Janela aberta={Boolean(pedido)} titulo={pedido?.titulo ?? ''} aoFechar={() => responder(false)} largura={440}>
      <p>{pedido?.texto}</p>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={() => responder(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className={`botao ${pedido?.perigo ? 'botao--perigo' : 'botao--principal'}`}
          onClick={() => responder(true)}
        >
          {pedido?.botao ?? 'Confirmar'}
        </button>
      </div>
    </Janela>
  )

  return [janela, confirmar]
}
