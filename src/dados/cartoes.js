// Leitura e gravação dos cartões do quadro. O cartão é separado da demanda: ele existe antes de alguém
// ligar o cronômetro e pode reunir o tempo de várias pessoas. Cada pessoa tem a própria demanda ligada a ele.

import { arrayUnion, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta, useConsultas } from '../hooks/useConsulta.js'
import { hojeISO } from '../lib/datas.js'
import { camposDeEntrega, colunaDaEtiqueta, COLUNA_ENTREGUES, COLUNAS_PADRAO, etiquetaDoPublico } from '../lib/quadro.js'
import { refDemanda, registro } from './demandas.js'

const colecao = () => collection(db, 'cartoes')
const refCartao = (id) => doc(db, 'cartoes', id)
const refColunas = () => doc(db, 'config', 'quadro')

// ---------- Leitura ----------

// Tudo o que está em andamento e o que foi entregue no mês escolhido.
export function useCartoesDoQuadro(mesEntrega) {
  return useConsultas(mesEntrega && `quadro/${mesEntrega}`, () => [
    query(colecao(), where('entregue', '==', false)),
    query(colecao(), where('mesEntrega', '==', mesEntrega)),
  ])
}

export function useColunas() {
  const consulta = useConsulta('config/quadro', refColunas)
  return { ...consulta, dados: consulta.carregando ? null : (consulta.dados?.colunas ?? COLUNAS_PADRAO) }
}

export const salvarColunas = (colunas) => setDoc(refColunas(), { colunas })

export async function contarCartoesNaColuna(coluna) {
  const snap = await getDocs(query(colecao(), where('coluna', '==', coluna), where('entregue', '==', false)))
  return snap.size
}

// ---------- Criação ----------

function novoCartao({ titulo, coluna, etiquetas = [], responsaveis = [], prazo = null, descricao = '', vinculos = [], entregueEm = null }, pessoa) {
  return {
    titulo: titulo.trim(),
    descricao,
    coluna,
    ordem: Date.now(),
    etiquetas,
    responsaveis,
    prazo,
    ...camposDeEntrega(coluna, entregueEm ?? hojeISO()),
    vinculos,
    comentarios: [],
    historico: [registro(pessoa.email, 'criacao')],
    criadoPor: pessoa.email,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
}

export const criarCartao = (dados, pessoa) => setDoc(doc(colecao()), novoCartao(dados, pessoa))

// Demanda criada no cronômetro ou no lançamento manual ganha o próprio cartão, ligado a ela.
export async function criarCartaoDaDemanda(demandaId, dados, pessoa, colunas, { concluidaEm = null } = {}) {
  const etiqueta = etiquetaDoPublico(dados.publico)
  const ref = doc(colecao())
  const lote = writeBatch(db)
  lote.set(
    ref,
    novoCartao(
      {
        titulo: dados.nome,
        coluna: concluidaEm ? COLUNA_ENTREGUES : colunaDaEtiqueta(etiqueta, colunas),
        etiquetas: etiqueta ? [etiqueta] : [],
        responsaveis: [pessoa.email],
        entregueEm: concluidaEm,
        vinculos: [{ demandaId, area: dados.area, email: pessoa.email, nome: pessoa.nome }],
      },
      pessoa,
    ),
  )
  lote.update(refDemanda(demandaId), { cartaoId: ref.id })
  await lote.commit()
  return ref.id
}

// ---------- Alteração ----------

const mudancaDeColuna = (cartao, coluna, ordem, quem, nomeDaColuna) => ({
  coluna,
  ordem,
  // Quem já estava entregue e continua em Entregues mantém a data da entrega.
  ...(cartao.entregue && coluna === COLUNA_ENTREGUES ? {} : camposDeEntrega(coluna, hojeISO())),
  registro: registro(quem, 'movimento', 'Coluna', nomeDaColuna(cartao.coluna), nomeDaColuna(coluna)),
})

export function moverCartao(cartao, coluna, ordem, quem, nomeDaColuna) {
  const { registro: linha, ...campos } = mudancaDeColuna(cartao, coluna, ordem, quem, nomeDaColuna)
  const mudouDeColuna = coluna !== cartao.coluna
  return updateDoc(refCartao(cartao.id), {
    ...campos,
    ...(mudouDeColuna ? { historico: arrayUnion(linha) } : {}),
    atualizadoEm: serverTimestamp(),
  })
}

const iguais = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Descrição e responsáveis entram no histórico sem os valores, para a linha não virar um texto enorme.
const CAMPOS_EDITAVEIS = {
  titulo: { rotulo: 'Título', comValores: true },
  descricao: { rotulo: 'Descrição' },
  etiquetas: { rotulo: 'Etiquetas', comValores: true },
  responsaveis: { rotulo: 'Responsáveis' },
  prazo: { rotulo: 'Prazo', comValores: true },
}

export async function salvarCartao(cartao, novos, quem, nomeDaColuna, mostrarValor = String) {
  const alteracoes = {}
  const registros = []
  for (const [campo, { rotulo, comValores }] of Object.entries(CAMPOS_EDITAVEIS)) {
    if (iguais(novos[campo], cartao[campo])) continue
    alteracoes[campo] = novos[campo]
    registros.push(registro(quem, 'edicao', rotulo, comValores ? mostrarValor(cartao[campo], campo) : '', comValores ? mostrarValor(novos[campo], campo) : ''))
  }
  if (novos.coluna !== cartao.coluna) {
    const { registro: linha, ...campos } = mudancaDeColuna(cartao, novos.coluna, Date.now(), quem, nomeDaColuna)
    Object.assign(alteracoes, campos)
    registros.push(linha)
  }
  if (!registros.length) return false
  await updateDoc(refCartao(cartao.id), { ...alteracoes, historico: arrayUnion(...registros), atualizadoEm: serverTimestamp() })
  return true
}

export function comentar(cartao, texto, pessoa) {
  return updateDoc(refCartao(cartao.id), {
    comentarios: arrayUnion({ email: pessoa.email, nome: pessoa.nome, quando: Timestamp.now(), texto: texto.trim() }),
    atualizadoEm: serverTimestamp(),
  })
}

// Só admin. As demandas ligadas continuam existindo, com o tempo registrado.
export const excluirCartao = (cartao) => deleteDoc(refCartao(cartao.id))
