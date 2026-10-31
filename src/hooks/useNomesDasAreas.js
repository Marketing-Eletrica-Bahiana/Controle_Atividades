import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

// Troca os IDs das áreas pelos nomes cadastrados em areas/{id}. Sem cadastro, mostra o próprio ID.
export function useNomesDasAreas(ids = []) {
  const [nomes, setNomes] = useState({})
  const chave = ids.join('|')

  useEffect(() => {
    let ativo = true
    const lista = chave ? chave.split('|') : []
    Promise.all(
      lista.map((id) =>
        getDoc(doc(db, 'areas', id))
          .then((snap) => [id, snap.exists() ? snap.data().nome : id])
          .catch(() => [id, id]),
      ),
    ).then((pares) => {
      if (ativo) setNomes(Object.fromEntries(pares))
    })
    return () => {
      ativo = false
    }
  }, [chave])

  return ids.map((id) => nomes[id] ?? id)
}
