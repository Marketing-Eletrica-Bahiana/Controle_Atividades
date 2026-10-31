import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

// Horários gravados com serverTimestamp aparecem já com a estimativa local, sem ficar vazios.
const lerDocumento = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })

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
        const dados = 'docs' in snap ? snap.docs.map(lerDocumento) : snap.exists() ? lerDocumento(snap) : null
        setEstado({ dados, carregando: false, erro: null })
      },
      (erro) => setEstado({ dados: null, carregando: false, erro }),
    )
    // criarReferencia depende só da chave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return estado
}

// Várias consultas de lista ao mesmo tempo, juntas numa lista só (sem repetir documentos).
export function useConsultas(chave, criarReferencias) {
  const [estado, setEstado] = useState({ dados: null, carregando: Boolean(chave), erro: null })

  useEffect(() => {
    if (!chave) {
      setEstado({ dados: null, carregando: false, erro: null })
      return undefined
    }
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }))
    const referencias = criarReferencias()
    const partes = referencias.map(() => null)
    const cancelar = referencias.map((referencia, i) =>
      onSnapshot(
        referencia,
        (snap) => {
          partes[i] = snap.docs.map(lerDocumento)
          if (partes.every(Boolean)) {
            const porId = new Map(partes.flat().map((d) => [d.id, d]))
            setEstado({ dados: [...porId.values()], carregando: false, erro: null })
          }
        },
        (erro) => setEstado({ dados: null, carregando: false, erro }),
      ),
    )
    return () => cancelar.forEach((parar) => parar())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return estado
}
