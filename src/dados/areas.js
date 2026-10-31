import { useMemo } from 'react'
import { collection, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta } from '../hooks/useConsulta.js'
import { paraId } from '../lib/texto.js'

export const AREAS_PADRAO = [
  { id: 'designs', nome: 'Designs', ordem: 1 },
  { id: 'marketing', nome: 'Marketing', ordem: 2 },
  { id: 'gerencia', nome: 'Gerência', ordem: 3 },
]

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(b.nome, 'pt-BR')

export function useAreas() {
  const consulta = useConsulta('areas', () => collection(db, 'areas'))
  // A lista ordenada só muda quando os dados mudam (lista nova a cada desenho travava a tela Planilhas).
  const dados = useMemo(() => (consulta.dados ? [...consulta.dados].sort(porOrdem) : null), [consulta.dados])
  return { ...consulta, dados }
}

export function criarAreasPadrao() {
  const lote = writeBatch(db)
  for (const { id, nome, ordem } of AREAS_PADRAO) lote.set(doc(db, 'areas', id), { nome, ordem, ativa: true })
  return lote.commit()
}

export async function criarArea(nome, ordem) {
  const id = paraId(nome)
  if (!id) throw new Error('Informe o nome da área.')
  if ((await getDoc(doc(db, 'areas', id))).exists()) throw new Error('Já existe uma área com esse nome.')
  await setDoc(doc(db, 'areas', id), { nome: nome.trim(), ordem, ativa: true })
  return id
}

export const atualizarArea = (id, dados) => updateDoc(doc(db, 'areas', id), dados)

// Troca a ordem de duas áreas vizinhas.
export function trocarOrdem(areaA, areaB) {
  const lote = writeBatch(db)
  lote.update(doc(db, 'areas', areaA.id), { ordem: areaB.ordem })
  lote.update(doc(db, 'areas', areaB.id), { ordem: areaA.ordem })
  return lote.commit()
}
