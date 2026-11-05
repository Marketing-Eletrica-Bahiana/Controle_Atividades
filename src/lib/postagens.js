// Regras do calendário de postagens, sem acesso ao Firestore. A postagem é um campo do cartão:
// o calendário e o Quadro leem o mesmo dado, sem digitar duas vezes.

import { formatarData, mesDe } from './datas.js'
import { COLUNA_ENTREGUES, etiquetaDoPublico } from './quadro.js'
import { diaDaSemana, somarDias } from './semana.js'
import { normalizar } from './texto.js'

const ETIQUETA_EXTERNA = 'Comunicação Externa'
const ETIQUETA_INTERNA = 'Comunicação Interna'
const ETIQUETAS_INTERNAS = [ETIQUETA_INTERNA, 'Endomarketing']
const PUBLICOS_INTERNOS = ['interno', 'interno e externo', 'endomarketing']
export const COLUNA_PROGRAMADO = 'legendado-programado'
const COLUNA_IDEIAS = 'ideias'

export const REDES = ['Instagram', 'LinkedIn', 'LinkedIn do CAE', 'YouTube', 'YouTube Shorts']

// Comunicação interna: ficam em postagem.redes, junto com as redes. O leitor do Trello só procura as de REDES.
export const GRUPOS_INTERNOS = ['WhatsApp', 'Lideranças', 'Grupos do CAE']

export const SO_EXTERNAS = 'Só externas'
export const SO_INTERNAS = 'Só internas'

export const FORMATOS = ['Reels', 'Stories', 'Carrossel', 'Card', 'Vídeo', 'Artigo', 'Ao vivo']

// Só aparecem na postagem interna, depois dos outros.
export const FORMATOS_INTERNOS = ['Foto de Perfil', 'Assinatura de e-Mail', 'Apresentação']

export const POSTAGEM_VAZIA = { data: null, redes: [], formato: '' }

// Cartão gravado antes do calendário não tem o campo: a etiqueta decide. "null" quer dizer que não é postagem.
export const ehPostagem = (cartao) =>
  cartao.postagem !== undefined ? cartao.postagem !== null : (cartao.etiquetas ?? []).includes(ETIQUETA_EXTERNA)

export const postagemPadrao = (etiquetas = []) => (etiquetas.includes(ETIQUETA_EXTERNA) ? POSTAGEM_VAZIA : null)

export const publicoDePostagem = (publico) => etiquetaDoPublico(publico) === ETIQUETA_EXTERNA

export const ehInterno = (etiquetas = []) => etiquetas.some((e) => ETIQUETAS_INTERNAS.includes(e))

export const publicoInterno = (publico) => PUBLICOS_INTERNOS.includes(normalizar(publico))

const ehGrupoInterno = (rede) => GRUPOS_INTERNOS.includes(rede)

// O que o cartão marca: rede social, interna e envio interno. Sem rede informada, quem decide é a etiqueta.
export function tiposDaPostagem(cartao) {
  if (!ehPostagem(cartao)) return { redeSocial: false, interna: false, envio: false }
  const envio = Boolean(cartao.postagem?.envio)
  const redes = cartao.postagem?.redes ?? []
  if (redes.length) return { redeSocial: !redes.every(ehGrupoInterno), interna: redes.some(ehGrupoInterno), envio }
  if (envio) return { redeSocial: false, interna: false, envio }
  const etiquetas = cartao.etiquetas ?? []
  const soInterna = ehInterno(etiquetas) && !etiquetas.includes(ETIQUETA_EXTERNA)
  return { redeSocial: !soInterna, interna: soInterna, envio }
}

// O Envio Interno fica só no cartão: entra no calendário quem também é postagem.
export function entraNoCalendario(cartao) {
  const { redeSocial, interna } = tiposDaPostagem(cartao)
  return redeSocial || interna
}

// A data é uma só para as opções marcadas: o nome diz o que ela representa.
export function rotuloDaData({ redeSocial, interna, envio }) {
  if (!envio) return 'Data da postagem'
  return redeSocial || interna ? 'Data da postagem e do envio' : 'Data do Envio'
}

// Só fica gravado o que está à vista: desmarcar uma opção tira as redes dela. Sem nenhuma opção, não é postagem.
export function postagemDasOpcoes(postagem, { redeSocial, interna, envio }) {
  if (!redeSocial && !interna && !envio) return null
  const { envio: _envioAntes, ...resto } = postagem
  const redes = (postagem.redes ?? []).filter((rede) => (ehGrupoInterno(rede) ? interna : redeSocial))
  return { ...resto, redes, ...(envio ? { envio: true } : {}) }
}

// Cartão criado direto no calendário: as redes escolhidas dizem se é comunicação externa, interna ou as duas.
export function etiquetasDasRedes(redes = []) {
  const interna = redes.some(ehGrupoInterno)
  const externa = !interna || !redes.every(ehGrupoInterno)
  return [externa && ETIQUETA_EXTERNA, interna && ETIQUETA_INTERNA].filter(Boolean)
}

export const camposDaPostagem = (postagem) => ({
  postagem,
  postagemMes: postagem?.data ? mesDe(postagem.data) : null,
})

// Mexer na data ou nas redes confirma o que veio estimado da importação.
export function mudarPostagem(postagem, campo, valor) {
  const nova = { ...postagem, [campo]: valor }
  if (campo === 'data') delete nova.estimada
  if (campo === 'redes') delete nova.redeAConfirmar
  return nova
}

// Compara campo a campo: o Firestore não garante a ordem das chaves.
export function postagensIguais(a, b) {
  if (!a || !b) return !a && !b
  const redes = (p) => [...(p.redes ?? [])].sort().join('|')
  return (a.data ?? null) === (b.data ?? null) && (a.formato ?? '') === (b.formato ?? '') && redes(a) === redes(b)
    && Boolean(a.estimada) === Boolean(b.estimada) && Boolean(a.redeAConfirmar) === Boolean(b.redeAConfirmar)
    && Boolean(a.envio) === Boolean(b.envio)
}

const juntarRedes = (redes) => (redes.length < 2 ? (redes[0] ?? '') : `${redes.slice(0, -1).join(', ')} e ${redes.at(-1)}`)

export function resumoDaPostagem(postagem) {
  if (!postagem) return 'Não é postagem'
  const partes = [postagem.data ? formatarData(postagem.data) : 'Sem data', juntarRedes(postagem.redes ?? []), postagem.formato, postagem.envio && 'Envio Interno']
  return partes.filter(Boolean).join(', ')
}

const FORMATOS_NO_NOME = [
  ['reels', 'Reels'],
  ['reel', 'Reels'],
  ['stories', 'Stories'],
  ['story', 'Stories'],
  ['carrossel', 'Carrossel'],
  ['artigo', 'Artigo'],
  ['card', 'Card'],
  ['cards', 'Card'],
  ['video', 'Vídeo'],
  ['vivo', 'Ao vivo'],
]

export function formatoDoNome(nome) {
  const palavras = normalizar(nome).split(' ')
  return FORMATOS_NO_NOME.find(([palavra]) => palavras.includes(palavra))?.[1] ?? ''
}

export const SITUACOES_POSTAGEM = {
  producao: { rotulo: 'Em produção', classe: 'postagem--producao' },
  programada: { rotulo: 'Programada', classe: 'postagem--programada' },
  postada: { rotulo: 'Postada', classe: 'postagem--postada' },
  atrasada: { rotulo: 'Atrasada', classe: 'postagem--atrasada' },
}

// A situação vem da coluna e da data, sem campo a mais para preencher.
export function situacaoDaPostagem(cartao, hoje) {
  const data = cartao.postagem?.data
  const pronta = cartao.entregue || cartao.coluna === COLUNA_ENTREGUES || cartao.coluna === COLUNA_PROGRAMADO
  if (pronta) return data && data > hoje ? 'programada' : 'postada'
  return data && data < hoje ? 'atrasada' : 'producao'
}

// Dias do mês para a grade de domingo a sábado. Dias de outros meses completam as semanas como null.
export function diasDoCalendario(mes) {
  const primeiro = `${mes}-01`
  const dias = Array(diaDaSemana(primeiro)).fill(null)
  for (let dia = primeiro; mesDe(dia) === mes; dia = somarDias(dia, 1)) dias.push(dia)
  while (dias.length % 7) dias.push(null)
  return dias
}

export function agruparPorDia(cartoes) {
  const grupos = new Map()
  for (const cartao of cartoes) {
    const dia = cartao.postagem?.data
    if (!dia) continue
    if (!grupos.has(dia)) grupos.set(dia, [])
    grupos.get(dia).push(cartao)
  }
  for (const lista of grupos.values()) lista.sort((a, b) => String(a.titulo).localeCompare(b.titulo, 'pt-BR'))
  return grupos
}

function passaNoFiltro(cartao, filtro) {
  if (!filtro) return true
  if (filtro === SO_INTERNAS) return tiposDaPostagem(cartao).interna
  if (filtro === SO_EXTERNAS) return tiposDaPostagem(cartao).redeSocial
  return (cartao.postagem?.redes ?? []).includes(filtro)
}

export const postagensDoMes = (cartoes, mes, filtro = '') =>
  cartoes.filter((c) => entraNoCalendario(c) && mesDe(c.postagem?.data) === mes && passaNoFiltro(c, filtro))

// Ideia ainda não é trabalho a agendar: não entra na lista de postagens sem data.
export const postagensSemData = (cartoes) =>
  cartoes.filter((c) => entraNoCalendario(c) && !c.entregue && !c.postagem?.data && c.coluna !== COLUNA_IDEIAS)

export function resumoDoMes(cartoes, hoje) {
  const resumo = { total: cartoes.length, producao: 0, programada: 0, postada: 0, atrasada: 0 }
  for (const cartao of cartoes) resumo[situacaoDaPostagem(cartao, hoje)] += 1
  return resumo
}
