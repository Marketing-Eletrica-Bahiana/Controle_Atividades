// Gravação da importação do Trello. O ID do documento vem do cartão do Trello, então repetir não duplica.

import { collection, doc, getDocs, query, Timestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { alteracoesDoTrello, cartaoNovoDoTrello } from '../lib/trello.js'

const TAMANHO_DO_LOTE = 400

const colecao = () => collection(db, 'cartoes')

export async function cartoesImportados() {
  const snap = await getDocs(query(colecao(), where('origem', '==', 'trello')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function gravarImportacaoDoTrello({ novos, atualizar, existentes, quem, pessoaDoTrello }, aoProgredir = () => {}) {
  const agora = Timestamp.now()
  const opcoes = { quem, agora, pessoaDoTrello, paraMomento: (iso) => Timestamp.fromDate(new Date(iso)) }
  const porId = new Map(existentes.map((c) => [c.id, c]))
  const operacoes = [
    ...novos.map((item) => (lote) => lote.set(doc(colecao(), item.id), cartaoNovoDoTrello(item, opcoes))),
    ...atualizar.map((item) => (lote) => lote.update(doc(colecao(), item.id), alteracoesDoTrello(item, porId.get(item.id), opcoes))),
  ]
  for (let i = 0; i < operacoes.length; i += TAMANHO_DO_LOTE) {
    const lote = writeBatch(db)
    operacoes.slice(i, i + TAMANHO_DO_LOTE).forEach((aplicar) => aplicar(lote))
    await lote.commit()
    aoProgredir(Math.min(i + TAMANHO_DO_LOTE, operacoes.length), operacoes.length)
  }
  return operacoes.length
}
