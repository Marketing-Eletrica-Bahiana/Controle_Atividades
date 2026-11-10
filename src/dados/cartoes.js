// Leitura e gravação dos cartões do quadro. O cartão é separado da demanda: ele existe antes de alguém
// ligar o cronômetro e pode reunir o tempo de várias pessoas. Cada pessoa tem a própria demanda ligada a ele.

import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta, useConsultas } from '../hooks/useConsulta.js'
import { formatarData, hojeISO } from '../lib/datas.js'
import { camposDaPostagem, ehPostagem, mudarPostagem, POSTAGEM_VAZIA, postagemDasOpcoes, postagemPadrao, postagensIguais, resumoDaPostagem, rotuloDaData, tiposDaPostagem } from '../lib/postagens.js'
import { camposDeEntrega, colunaDaEtiqueta, COLUNA_ENTREGUES, COLUNAS_PADRAO, etiquetaDoPublico, vinculosSemDemanda } from '../lib/quadro.js'
import { excluirDemanda, refDemanda, registro } from './demandas.js'

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

// O calendário precisa das postagens do mês e do que está em andamento (as que ainda não têm data).
export function useCartoesDoCalendario(mes) {
  return useConsultas(mes && `calendario/${mes}`, () => [
    query(colecao(), where('postagemMes', '==', mes)),
    query(colecao(), where('entregue', '==', false)),
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

function novoCartao(
  { titulo, coluna, etiquetas = [], responsaveis = [], prazo = null, descricao = '', caminho = '', vinculos = [], entregueEm = null, postagem = postagemPadrao(etiquetas) },
  pessoa,
) {
  return {
    titulo: titulo.trim(),
    descricao,
    caminho,
    coluna,
    ordem: Date.now(),
    etiquetas,
    responsaveis,
    prazo,
    ...camposDaPostagem(postagem),
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
        postagem: dados.postagem ?? null,
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

// Campo em branco e campo que o cartão antigo nem tem são a mesma coisa: abrir e salvar não muda nada.
const semVazio = (valor) => (valor === '' || valor === undefined ? null : valor)
const iguais = (a, b) => JSON.stringify(semVazio(a)) === JSON.stringify(semVazio(b))

// Descrição e responsáveis entram no histórico sem os valores, para a linha não virar um texto enorme.
const CAMPOS_EDITAVEIS = {
  titulo: { rotulo: 'Título', comValores: true },
  descricao: { rotulo: 'Descrição' },
  caminho: { rotulo: 'Caminho', comValores: true },
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
  const postagemAntes = cartao.postagem ?? (ehPostagem(cartao) ? POSTAGEM_VAZIA : null)
  if (!postagensIguais(novos.postagem, postagemAntes)) {
    Object.assign(alteracoes, camposDaPostagem(novos.postagem))
    registros.push(registro(quem, 'edicao', 'Postagem', resumoDaPostagem(postagemAntes), resumoDaPostagem(novos.postagem)))
  }
  if (!registros.length) return false
  await updateDoc(refCartao(cartao.id), { ...alteracoes, historico: arrayUnion(...registros), atualizadoEm: serverTimestamp() })
  return true
}

// Arrastar no calendário muda só a data da postagem.
export function moverPostagem(cartao, data, quem) {
  const antes = cartao.postagem ?? POSTAGEM_VAZIA
  return updateDoc(refCartao(cartao.id), {
    ...camposDaPostagem(mudarPostagem(antes, 'data', data)),
    historico: arrayUnion(registro(quem, 'edicao', rotuloDaData(tiposDaPostagem(cartao)), formatarData(antes.data), formatarData(data))),
    atualizadoEm: serverTimestamp(),
  })
}

// Só sai do calendário: o cartão fica no Quadro e o tempo continua nas demandas. Data e redes são apagadas,
// a não ser que ele também seja Envio Interno: aí continua como envio, com a data e o formato.
export function tirarDoCalendario(cartao, quem) {
  const antes = cartao.postagem ?? POSTAGEM_VAZIA
  const depois = postagemDasOpcoes(antes, { redeSocial: false, interna: false, envio: Boolean(antes.envio) })
  return updateDoc(refCartao(cartao.id), {
    ...camposDaPostagem(depois),
    historico: arrayUnion(registro(quem, 'edicao', 'Postagem', resumoDaPostagem(antes), resumoDaPostagem(depois))),
    atualizadoEm: serverTimestamp(),
  })
}

export function comentar(cartao, texto, pessoa) {
  return updateDoc(refCartao(cartao.id), {
    comentarios: arrayUnion({ email: pessoa.email, nome: pessoa.nome, quando: Timestamp.now(), texto: texto.trim() }),
    atualizadoEm: serverTimestamp(),
  })
}

// Limpa a ligação com uma demanda que não existe mais, para a pessoa poder ligar o cronômetro de novo.
export const esquecerDemanda = (cartao, demandaId) =>
  updateDoc(refCartao(cartao.id), { vinculos: vinculosSemDemanda(cartao.vinculos, demandaId), atualizadoEm: serverTimestamp() })

// Só admin. As demandas ligadas continuam existindo, com o tempo registrado.
export const excluirCartao = (cartao) => deleteDoc(refCartao(cartao.id))

// Demandas ligadas aos cartões, de qualquer área e pessoa, lidas uma a uma. As já apagadas ficam de fora.
export async function demandasDosCartoes(cartoes) {
  const ids = [...new Set(cartoes.flatMap((c) => (c.vinculos ?? []).map((v) => v.demandaId)).filter(Boolean))]
  const lidas = await Promise.all(ids.map((id) => getDoc(refDemanda(id))))
  return lidas.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() }))
}

// Só admin. Apaga os cartões do Quadro, e com isso do calendário. Com as demandas, apaga também elas, com o tempo,
// uma a uma para renumerar cada mês. Os cartões vão antes: assim nenhum fica apontando para demanda apagada.
export async function excluirCartoes(cartoes, demandas = []) {
  for (const cartao of cartoes) await deleteDoc(refCartao(cartao.id))
  for (const demanda of demandas) await excluirDemanda(demanda)
}
