import { useMemo } from 'react'
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta } from '../hooks/useConsulta.js'
import { paraId } from '../lib/texto.js'

// IDs previsíveis: reimportar a mesma tabela atualiza em vez de duplicar.
export const idDoTipo = (area, nome) => `${area}--${paraId(nome)}`
export const idDaPalavra = (area, palavra) => `${area}--${paraId(palavra)}`

const ordenar = (lista, campo) => (lista ? [...lista].sort((a, b) => String(a[campo]).localeCompare(b[campo], 'pt-BR')) : null)

// Filtra por área sem orderBy, para não precisar de índice composto; a ordem é feita aqui.
// A lista ordenada só muda quando os dados mudam (lista nova a cada desenho faz telas redesenharem sem parar).
export function useTipos(area) {
  const consulta = useConsulta(area && `tipos/${area}`, () => query(collection(db, 'tipos'), where('area', '==', area)))
  const dados = useMemo(() => ordenar(consulta.dados, 'nome'), [consulta.dados])
  return { ...consulta, dados }
}

export function usePalavras(area) {
  const consulta = useConsulta(area && `palavrasChave/${area}`, () =>
    query(collection(db, 'palavrasChave'), where('area', '==', area)),
  )
  const dados = useMemo(() => ordenar(consulta.dados, 'palavra'), [consulta.dados])
  return { ...consulta, dados }
}

const palavrasDoTipo = (area, nomeTipo) =>
  getDocs(query(collection(db, 'palavrasChave'), where('area', '==', area), where('tipo', '==', nomeTipo)))

// Salva um tipo. Se o nome mudou, o documento troca de ID e as palavras-chave ligadas a ele acompanham.
export async function salvarTipo(area, dados, tipoAntigo) {
  const id = idDoTipo(area, dados.nome)
  const lote = writeBatch(db)
  lote.set(doc(db, 'tipos', id), { area, ...dados })
  if (tipoAntigo && tipoAntigo.id !== id) {
    lote.delete(doc(db, 'tipos', tipoAntigo.id))
    const palavras = await palavrasDoTipo(area, tipoAntigo.nome)
    palavras.forEach((p) => lote.update(p.ref, { tipo: dados.nome }))
  }
  await lote.commit()
}

export async function contarPalavrasDoTipo(area, nomeTipo) {
  return (await palavrasDoTipo(area, nomeTipo)).size
}

// Exclui o tipo e as palavras-chave que apontam para ele.
export async function excluirTipo(tipo) {
  const lote = writeBatch(db)
  lote.delete(doc(db, 'tipos', tipo.id))
  const palavras = await palavrasDoTipo(tipo.area, tipo.nome)
  palavras.forEach((p) => lote.delete(p.ref))
  await lote.commit()
}

export async function salvarPalavra(area, dados, palavraAntiga) {
  const id = idDaPalavra(area, dados.palavra)
  const lote = writeBatch(db)
  lote.set(doc(db, 'palavrasChave', id), { area, palavra: dados.palavra, tipo: dados.tipo })
  if (palavraAntiga && palavraAntiga.id !== id) lote.delete(doc(db, 'palavrasChave', palavraAntiga.id))
  await lote.commit()
}

export function excluirPalavra(palavra) {
  const lote = writeBatch(db)
  lote.delete(doc(db, 'palavrasChave', palavra.id))
  return lote.commit()
}
