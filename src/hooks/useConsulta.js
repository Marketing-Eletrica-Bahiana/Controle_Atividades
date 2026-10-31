import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

// Escuta uma consulta (lista) ou um documento do Firestore em tempo real.
// "chave" identifica a consulta: quando muda, a escuta recomeça. Chave vazia não consulta nada.
export function useConsulta(chave, criarReferencia) {
  const [estado, setEstado] = useState({ dados: null, carregando: Boolean(chave), erro: null })

  useEffect(() => {
    if (!chave) {
      setEstado({ dados: null, carregando: false, erro: null })
      return undefined
    }
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }))
    return onSnapshot(
      criarReferencia(),
      (snap) => {
        const dados =
          'docs' in snap
            ? snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            : snap.exists()
              ? { id: snap.id, ...snap.data() }
              : null
        setEstado({ dados, carregando: false, erro: null })
      },
      (erro) => setEstado({ dados: null, carregando: false, erro }),
    )
    // criarReferencia depende só da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return estado
}
