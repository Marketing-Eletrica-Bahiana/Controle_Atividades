import { useEffect, useState } from 'react'
import { agoraNoServidor } from '../lib/relogio.js'

// Hora atual que se atualiza a cada segundo enquanto "ativo" (cronômetro rodando), na hora do servidor.
export function useAgora(ativo) {
  const [agora, setAgora] = useState(() => agoraNoServidor())
  useEffect(() => {
    if (!ativo) return undefined
    setAgora(agoraNoServidor())
    const relogio = setInterval(() => setAgora(agoraNoServidor()), 1000)
    return () => clearInterval(relogio)
  }, [ativo])
  return agora
}
