import { collection, deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'
import { db, DOMINIO_EMPRESA } from '../firebase.js'
import { useConsulta } from '../hooks/useConsulta.js'

const porNome = (a, b) => String(a.nome).localeCompare(b.nome, 'pt-BR')

export function useMembros() {
  const consulta = useConsulta('membros', () => collection(db, 'membros'))
  return { ...consulta, dados: consulta.dados ? [...consulta.dados].sort(porNome) : null }
}

export function useSolicitacoes() {
  return useConsulta('solicitacoes', () => collection(db, 'solicitacoes'))
}

export function validarEmail(email) {
  const limpo = String(email ?? '').trim().toLowerCase()
  if (!limpo) return 'Informe o e-mail.'
  if (!/^[^\s@]+@[^\s@]+$/.test(limpo)) return 'E-mail inválido.'
  if (!limpo.endsWith(`@${DOMINIO_EMPRESA}`)) return `Só e-mails @${DOMINIO_EMPRESA}.`
  return ''
}

const dadosDoMembro = ({ nome, cargo, papel, areas, ativo }) => ({
  nome: nome.trim(),
  cargo: (cargo ?? '').trim(),
  papel,
  areas,
  ativo,
})

export async function criarMembro(email, dados) {
  const id = email.trim().toLowerCase()
  if ((await getDoc(doc(db, 'membros', id))).exists()) throw new Error('Essa pessoa já está cadastrada.')
  await setDoc(doc(db, 'membros', id), dadosDoMembro(dados))
}

export const atualizarMembro = (email, dados) => setDoc(doc(db, 'membros', email), dadosDoMembro(dados))

// Libera um pedido de acesso: cria o cadastro e apaga o pedido, juntos.
export function liberarPedido(email, dados) {
  const lote = writeBatch(db)
  lote.set(doc(db, 'membros', email), dadosDoMembro(dados))
  lote.delete(doc(db, 'solicitacoes', email))
  return lote.commit()
}

export const recusarPedido = (email) => deleteDoc(doc(db, 'solicitacoes', email))
