import {
  collection, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { segundosParaHoras } from '../lib/tempo.js'
import { juntarSemRepetir } from './listas.js'
import { idDaPalavra, idDoTipo } from './tipos.js'

const TAMANHO_DO_LOTE = 400

// Demandas que já existem para uma pessoa num mês (a consulta sempre filtra por área).
export async function demandasExistentes(area, email, mes) {
  const snap = await getDocs(
    query(
      collection(db, 'demandas'),
      where('area', '==', area),
      where('responsavelEmail', '==', email),
      where('mes', '==', mes),
    ),
  )
  return snap.docs.map((d) => ({ id: d.id, importada: d.data().importada === true }))
}

export const agoraFirestore = () => Timestamp.now()
export const marcaDoServidor = () => serverTimestamp()

// Grava tudo em lotes. Ordem: apaga as demandas substituídas, atualiza tabelas e listas, cria as demandas.
export async function gravarImportacao({ area, apagar = [], tipos = [], palavras = [], listas, listasAtuais, demandas = [], aoAvancar }) {
  const operacoes = [
    ...apagar.map((id) => (lote) => lote.delete(doc(db, 'demandas', id))),
    ...tipos.map((t) => (lote) =>
      lote.set(doc(db, 'tipos', idDoTipo(area, t.nome)), {
        area,
        nome: t.nome,
        minH: segundosParaHoras(t.minSeg),
        maxH: segundosParaHoras(t.maxSeg),
        publico: t.publico,
        prazoEstimadoDias: t.prazoEstimadoDias,
      }),
    ),
    ...palavras.map((p) => (lote) =>
      lote.set(doc(db, 'palavrasChave', idDaPalavra(area, p.palavra)), { area, palavra: p.palavra, tipo: p.tipo }),
    ),
    ...demandas.map((d) => (lote) => lote.set(doc(collection(db, 'demandas')), d)),
  ]

  if (listas && (listas.publicos.length || listas.solicitantes.length)) {
    await setDoc(
      doc(db, 'config', 'listas'),
      {
        publicos: juntarSemRepetir(listasAtuais?.publicos, listas.publicos),
        solicitantes: juntarSemRepetir(listasAtuais?.solicitantes, listas.solicitantes),
      },
      { merge: true },
    )
  }

  let feitas = 0
  for (let inicio = 0; inicio < operacoes.length; inicio += TAMANHO_DO_LOTE) {
    const lote = writeBatch(db)
    const parte = operacoes.slice(inicio, inicio + TAMANHO_DO_LOTE)
    parte.forEach((operacao) => operacao(lote))
    await lote.commit()
    feitas += parte.length
    aoAvancar?.(feitas, operacoes.length)
  }
}
