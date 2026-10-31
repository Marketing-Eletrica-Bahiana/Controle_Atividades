import { createContext, useCallback, useContext, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { mensagemDeErro } from '../lib/erros.js'

const ContextoAvisos = createContext(null)

// Avisos rápidos no rodapé da tela: confirmação em azul, erro em vermelho.
export function ProvedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([])

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = `${Date.now()}-${Math.random()}`
    setAvisos((atuais) => [...atuais, { id, texto, tipo }])
    setTimeout(() => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), tipo === 'erro' ? 8000 : 4000)
  }, [])

  // Roda uma gravação e avisa o resultado. Devolve true se deu certo.
  const executar = useCallback(
    async (acao, mensagemDeSucesso) => {
      try {
        await acao()
        if (mensagemDeSucesso) avisar(mensagemDeSucesso)
        return true
      } catch (erro) {
        avisar(mensagemDeErro(erro), 'erro')
        return false
      }
    },
    [avisar],
  )

  return (
    <ContextoAvisos value={{ avisar, executar }}>
      {children}
      <div className="avisos-flutuantes" role="status" aria-live="polite">
        {avisos.map((aviso) => (
          <p key={aviso.id} className={`aviso-flutuante ${aviso.tipo === 'erro' ? 'aviso-flutuante--erro' : ''}`}>
            {aviso.tipo === 'erro' ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
            {aviso.texto}
          </p>
        ))}
      </div>
    </ContextoAvisos>
  )
}

export const useAvisos = () => useContext(ContextoAvisos)
