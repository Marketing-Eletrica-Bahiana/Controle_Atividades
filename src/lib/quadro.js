// Regras do quadro de demandas, sem acesso ao Firestore.

import { mesDe } from './datas.js'
import { normalizar, paraId, primeiroNome } from './texto.js'

export const COLUNA_ENTREGUES = 'entregues'

// As mesmas colunas do Trello. As listas "Prontos e entregues" de cada mês viram uma coluna só, filtrada por mês.
export const COLUNAS_PADRAO = [
  { id: 'comunicacao-interna', nome: 'Comunicação Interna' },
  { id: 'comunicacao-externa', nome: 'Comunicação Externa' },
  { id: 'cae', nome: 'CAE' },
  { id: 'endomarketing', nome: 'Endomarketing' },
  { id: 'aprovacao-ivie-tais', nome: 'Aprovação Ivie → Taís' },
  { id: 'ajustar', nome: 'Ajustar' },
  { id: 'aprovacao-tais-adelaide', nome: 'Aprovação Taís → Adelaide' },
  { id: 'legendar-postar', nome: 'Legendar - Postar' },
  { id: 'legendado-programado', nome: 'Legendado - Programado' },
  { id: 'aguardando-terceiros', nome: 'Aguardando aprovação de terceiros' },
  { id: COLUNA_ENTREGUES, nome: 'Entregues' },
  { id: 'ideias', nome: 'Ideias' },
]

export const ETIQUETAS = ['Comunicação Externa', 'Comunicação Interna', 'Endomarketing', 'CAE', 'Comunicação Visual', 'Nova Identidade Visual']

export const classeDaEtiqueta = (etiqueta) => `etiqueta-cartao--${paraId(etiqueta)}`

const ETIQUETA_DO_PUBLICO = {
  externo: 'Comunicação Externa',
  'interno e externo': 'Comunicação Externa',
  interno: 'Comunicação Interna',
  endomarketing: 'Endomarketing',
  cae: 'CAE',
}

const PUBLICO_DA_ETIQUETA = {
  'Comunicação Externa': 'Externo',
  'Comunicação Interna': 'Interno',
  Endomarketing: 'Endomarketing',
  CAE: 'CAE',
}

export const etiquetaDoPublico = (publico) => ETIQUETA_DO_PUBLICO[normalizar(publico)] ?? null

export const publicoDaEtiqueta = (etiquetas = []) => PUBLICO_DA_ETIQUETA[etiquetas.find((e) => PUBLICO_DA_ETIQUETA[e])] ?? ''

// Atividades de rotina (almoço, reunião) ficam só no cronômetro; o resto vira cartão, salvo se a pessoa desmarcar.
// Comunicação externa vem desmarcada: legendas e afins nem sempre viram cartão, e a pessoa decide.
export const vaiParaOQuadro = (publico) => {
  const etiqueta = etiquetaDoPublico(publico)
  return Boolean(etiqueta) && etiqueta !== 'Comunicação Externa'
}

const primeiraColuna = (colunas) => colunas.find((c) => c.id !== COLUNA_ENTREGUES)?.id

export function colunaDaEtiqueta(etiqueta, colunas) {
  const alvo = etiqueta && colunas.find((c) => normalizar(c.nome) === normalizar(etiqueta))
  return alvo ? alvo.id : primeiraColuna(colunas)
}

export const etiquetaDaColuna = (nomeDaColuna) => ETIQUETAS.find((e) => normalizar(e) === normalizar(nomeDaColuna)) ?? null

// Entregues mostra primeiro o que foi entregue por último; as outras colunas seguem a ordem arrastada.
export function agruparPorColuna(cartoes, colunas) {
  const grupos = new Map(colunas.map((c) => [c.id, []]))
  const reserva = primeiraColuna(colunas)
  for (const cartao of cartoes) {
    const destino = cartao.entregue ? COLUNA_ENTREGUES : grupos.has(cartao.coluna) ? cartao.coluna : reserva
    grupos.get(destino)?.push(cartao)
  }
  for (const [id, lista] of grupos) {
    lista.sort(
      id === COLUNA_ENTREGUES
        ? (a, b) => String(b.entregueEm ?? '').localeCompare(String(a.entregueEm ?? '')) || (a.ordem ?? 0) - (b.ordem ?? 0)
        : (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
    )
  }
  return grupos
}

const DISTANCIA = 1000

export function ordemEntre(antes, depois) {
  if (antes == null && depois == null) return DISTANCIA
  if (antes == null) return depois - DISTANCIA
  if (depois == null) return antes + DISTANCIA
  return (antes + depois) / 2
}

// Posição de um cartão solto em uma coluna: logo antes de "idAntesDe" ou, sem ele, no fim.
export function ordemParaSoltar(lista, idMovido, idAntesDe = null) {
  const outros = lista.filter((c) => c.id !== idMovido)
  const i = idAntesDe ? outros.findIndex((c) => c.id === idAntesDe) : -1
  if (i === -1) return ordemEntre(outros.at(-1)?.ordem, null)
  return ordemEntre(outros[i - 1]?.ordem, outros[i].ordem)
}

export function filtrarCartoes(cartoes, { busca = '', etiqueta = '', pessoa = '' } = {}) {
  const termo = normalizar(busca)
  return cartoes.filter(
    (c) =>
      (!termo || normalizar(c.titulo).includes(termo)) &&
      (!etiqueta || (c.etiquetas ?? []).includes(etiqueta)) &&
      (!pessoa || (c.responsaveis ?? []).includes(pessoa)),
  )
}

// Tira do cartão a demanda apagada e, ao juntar, coloca no lugar a que ficou (sem repetir).
export function vinculosSemDemanda(vinculos = [], demandaId, novo = null) {
  const restantes = vinculos.filter((v) => v.demandaId !== demandaId)
  if (!novo || restantes.some((v) => v.demandaId === novo.demandaId)) return restantes
  return [...restantes, novo]
}

export const cartaoAtrasado = (cartao, hoje) => Boolean(cartao.prazo && !cartao.entregue && cartao.prazo < hoje)

export function camposDeEntrega(coluna, dia) {
  const entregue = coluna === COLUNA_ENTREGUES
  return { entregue, entregueEm: entregue ? dia : null, mesEntrega: entregue ? mesDe(dia) : null }
}

// Cada pessoa tem uma cor de bolinha, dentro da paleta. Quem entrar depois recebe uma das cores de reserva.
const CORES_DAS_PESSOAS = { ivie: 'brilhante', tais: 'vermelho', adelaide: 'marinho', gleidiane: 'preto', gleide: 'preto' }
const CORES_DE_RESERVA = ['medio', 'vermelho-escuro']

export function corDaPessoa(nome) {
  const primeiro = normalizar(primeiroNome(nome))
  if (CORES_DAS_PESSOAS[primeiro]) return CORES_DAS_PESSOAS[primeiro]
  const soma = [...primeiro].reduce((total, letra) => total + letra.charCodeAt(0), 0)
  return CORES_DE_RESERVA[soma % CORES_DE_RESERVA.length]
}

export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase()
}
