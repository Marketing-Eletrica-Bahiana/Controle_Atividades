import { useEffect, useState } from 'react'

// Hora atual que se atualiza a cada segundo enquanto "ativo" (cronômetro rodando).
export function useAgora(ativo) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (!ativo) return undefined
    setAgora(Date.now())
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [ativo])
  return agora
}
