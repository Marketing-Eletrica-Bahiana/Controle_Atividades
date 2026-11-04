// Leitura do arquivo do Trello, sem gravar nada (a gravação fica em dados/importacaoTrello.js). Os cartões
// reais nunca entram no repositório: o arquivo é escolhido na tela pelo admin.
//
// O Trello continua em uso, então a importação pode ser repetida. O ID do documento vem do cartão do Trello,
// e o que foi mudado no site não é sobrescrito sem a pessoa pedir.

import { diasEntre, hojeISO, mesDe, montarISO } from './datas.js'
import { formatoDoNome, POSTAGEM_VAZIA, REDES } from './postagens.js'
import { COLUNA_ENTREGUES, ETIQUETAS } from './quadro.js'
import { normalizar, paraId } from './texto.js'

const CAMPOS_DOS_CARTOES = 'name,desc,due,dueComplete,idList,idLabels,closed,dateLastActivity,idMembers,shortUrl,pos'

// Arquivo completo do quadro. A exportação padrão do Trello traz só as 1000 ações mais recentes de todos os
// tipos e perderia comentários; este endereço pede só os comentários.
export const enderecoDoArquivo = (quadro) =>
  `https://trello.com/1/boards/${quadro}?fields=name&lists=all&list_fields=name,closed,pos&labels=all&label_fields=name,color` +
  `&cards=all&card_fields=${CAMPOS_DOS_CARTOES}&members=all&member_fields=fullName,username` +
  '&actions=commentCard&actions_limit=1000&action_fields=type,date,data&action_memberCreator_fields=fullName'

const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}
const NOMES_DOS_MESES = Object.keys(MESES).join('|')
const RE_DATA_POR_EXTENSO = new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${NOMES_DOS_MESES})\\b(?:\\s*de\\s*(\\d{4}))?`)
const RE_DATA_COM_BARRA = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
const RE_LISTA_DE_ENTREGUES = new RegExp(`^(${NOMES_DOS_MESES})\\b.*pront`)
const RE_FALA_DE_POSTAGEM = /post(ar|ad|agem)|public(ar|ad|ac)|agend|program/
const RE_REPROGRAMADO = /reprogram/
const RE_ROTULO_DO_MODELO = /^\s*(redes|postagem|formato|referencia|legenda|texto|prazo)\s*:/

const semAcentos = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const semMarcacao = (texto) => String(texto ?? '').replace(/[_*]/g, '')

const criadoEmDoId = (id) => new Date(Number.parseInt(String(id).slice(0, 8), 16) * 1000).toISOString()

// Sem ano escrito: a postagem vem depois da criação do cartão, com folga para o cartão aberto depois de postar.
const FOLGA_ANTES_DA_CRIACAO = 45

function anoDaData(mes, dia, referencia) {
  const ano = Number(referencia.slice(0, 4))
  const depoisDaCriacao = (a) => {
    const iso = montarISO(a, mes, dia)
    return iso && diasEntre(referencia, iso) >= -FOLGA_ANTES_DA_CRIACAO
  }
  return [ano - 1, ano, ano + 1].find(depoisDaCriacao) ?? ano
}

export function dataDoTexto(texto, referencia) {
  const limpo = semAcentos(texto)
  const extenso = limpo.match(RE_DATA_POR_EXTENSO)
  const barra = limpo.match(RE_DATA_COM_BARRA)
  // Quando há as duas formas, vale a que aparece primeiro.
  const usarExtenso = extenso && (!barra || extenso.index <= barra.index)
  if (!usarExtenso && !barra) return null
  const dia = Number(usarExtenso ? extenso[1] : barra[1])
  const mes = usarExtenso ? MESES[extenso[2]] : Number(barra[2])
  const anoEscrito = usarExtenso ? extenso[3] : barra[3]
  if (mes < 1 || mes > 12) return null
  const ano = anoEscrito ? (anoEscrito.length === 2 ? 2000 + Number(anoEscrito) : Number(anoEscrito)) : anoDaData(mes, dia, referencia)
  return montarISO(ano, mes, dia)
}

// Valor de um rótulo do modelo do cartão ("Redes:", "Postagem:"...), inclusive quando continua nas linhas de baixo.
export function campoDoModelo(descricao, rotulo) {
  const linhas = semMarcacao(descricao).split(/\r?\n/)
  const inicio = new RegExp(`(?:^|\\s)${rotulo}\\s*:(.*)$`)
  const i = linhas.findIndex((linha) => inicio.test(semAcentos(linha)))
  if (i === -1) return null
  const valores = [semAcentos(linhas[i]).match(inicio)[1]]
  for (let j = i + 1; j < linhas.length; j += 1) {
    if (RE_ROTULO_DO_MODELO.test(semAcentos(linhas[j]))) break
    valores.push(semAcentos(linhas[j]))
  }
  return valores.join(' ').trim()
}

export function redesDoTexto(texto) {
  const limpo = normalizar(texto)
  const achadas = new Set()
  if (/\binstagram\b|\binsta\b/.test(limpo)) achadas.add('Instagram')
  if (/\blinkedin (do )?cae\b/.test(limpo)) achadas.add('LinkedIn do CAE')
  if (/\blinkedin\b/.test(limpo.replace(/\blinkedin (do )?cae\b/g, ''))) achadas.add('LinkedIn')
  return REDES.filter((rede) => achadas.has(rede))
}

function dataEmLinhaDePostagem(texto, referencia, padrao = RE_FALA_DE_POSTAGEM) {
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    const limpa = semAcentos(semMarcacao(linha))
    if (!padrao.test(limpa) || limpa.includes('prazo')) continue
    const data = dataDoTexto(limpa, referencia)
    if (data) return data
  }
  return null
}

// Cartões com o modelo "Postagem nas Redes Sociais" têm a data escrita: é exata. Nos demais, a data é um
// palpite (comentário, descrição, prazo ou entrega) e fica marcada como estimada, para a pessoa conferir.
export function postagemDoCartao({ nome, descricao, comentarios = [], etiquetas = [], prazo = null, entregueEm = null, criadoEm }) {
  const modelo = /postagem nas redes sociais/i.test(descricao ?? '')
  const externa = etiquetas.includes('Comunicação Externa')
  if (!modelo && !externa) return null

  const textoDasRedes = campoDoModelo(descricao, 'redes')
  // Comentários do mais novo para o mais antigo: o último combinado é o que vale.
  const textosDosComentarios = [...comentarios].reverse().map((c) => c.texto)
  const reprogramada = textosDosComentarios.map((t) => dataEmLinhaDePostagem(t, criadoEm, RE_REPROGRAMADO)).find(Boolean) ?? null
  const dataEscrita = dataDoTexto(campoDoModelo(descricao, 'postagem') ?? '', criadoEm)
  const formatoEscrito = campoDoModelo(descricao, 'formato')
  const formato = formatoDoNome(formatoEscrito ?? '') || formatoDoNome(nome)

  if (modelo) {
    const redes = redesDoTexto(textoDasRedes ?? '')
    // O modelo diz a rede, e ela é outra (YouTube, por exemplo): fora do calendário.
    if (textoDasRedes && !redes.length) return null
    const data = reprogramada ?? dataEscrita
    return {
      ...POSTAGEM_VAZIA,
      data,
      redes,
      formato,
      ...(reprogramada ? { estimada: true } : {}),
      ...(redes.length ? {} : { redeAConfirmar: true }),
    }
  }

  const redes = redesDoTexto(`${nome}\n${descricao ?? ''}\n${textosDosComentarios.join('\n')}`)
  const data =
    reprogramada ??
    textosDosComentarios.map((t) => dataEmLinhaDePostagem(t, criadoEm)).find(Boolean) ??
    dataEscrita ??
    dataEmLinhaDePostagem(descricao, criadoEm) ??
    prazo ??
    entregueEm
  return {
    ...POSTAGEM_VAZIA,
    data: data ?? null,
    redes,
    formato,
    ...(data ? { estimada: true } : {}),
    ...(redes.length ? {} : { redeAConfirmar: true }),
  }
}

// Mês da lista "Outubro - Prontos e entregues". O nome não tem ano: vale o último outubro até a atividade do
// cartão, com um mês de folga para o que foi adiantado (cartão de janeiro mexido em dezembro é do janeiro seguinte).
export function mesDaLista(nomeDaLista, referencia) {
  const achado = semAcentos(nomeDaLista).trim().match(RE_LISTA_DE_ENTREGUES)
  if (!achado) return null
  const numero = MESES[achado[1]]
  const ano = Number(referencia.slice(0, 4))
  const limite = ano * 12 + Number(referencia.slice(5, 7)) + 1
  const anoDaLista = [ano + 1, ano, ano - 1].find((a) => a * 12 + numero <= limite)
  return `${anoDaLista}-${String(numero).padStart(2, '0')}`
}

const etiquetaOficial = (nome) => ETIQUETAS.find((e) => normalizar(e) === normalizar(nome)) ?? nome

// Lê o arquivo sem depender do que já está gravado. Devolve um erro claro se o arquivo não for de um quadro.
export function lerArquivoDoTrello(texto, colunas) {
  let quadro
  try {
    quadro = JSON.parse(texto)
  } catch {
    throw new Error('Esse arquivo não é um JSON válido. Baixe de novo pelo link desta tela.')
  }
  if (!Array.isArray(quadro?.cards) || !Array.isArray(quadro?.lists)) {
    throw new Error('Esse arquivo não parece ser um quadro do Trello. Baixe de novo pelo link desta tela.')
  }

  const listas = new Map(quadro.lists.map((l) => [l.id, l]))
  const rotulos = new Map((quadro.labels ?? []).map((l) => [l.id, l.name]))
  const colunaPeloNome = new Map(colunas.map((c) => [normalizar(c.nome), c.id]))
  const colunasNovas = new Map()

  const comentariosDoCartao = new Map()
  const acoes = (quadro.actions ?? []).filter((a) => a.type === 'commentCard' && a.data?.card?.id)
  // A ordem de chegada é do mais novo para o mais antigo; no cartão fica do mais antigo para o mais novo.
  for (const acao of [...acoes].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    if (!comentariosDoCartao.has(acao.data.card.id)) comentariosDoCartao.set(acao.data.card.id, [])
    comentariosDoCartao.get(acao.data.card.id).push({
      idDoTrello: acao.id,
      idDoMembro: acao.idMemberCreator ?? acao.memberCreator?.id ?? null,
      nome: acao.memberCreator?.fullName ?? '',
      quando: acao.date,
      texto: acao.data.text ?? '',
    })
  }

  const itens = []
  let arquivados = 0
  for (const cartao of quadro.cards) {
    const lista = listas.get(cartao.idList)
    if (cartao.closed || !lista || lista.closed) {
      arquivados += 1
      continue
    }
    const atividade = hojeISO(new Date(cartao.dateLastActivity ?? criadoEmDoId(cartao.id)))
    const criadoEm = hojeISO(new Date(criadoEmDoId(cartao.id)))
    const prazo = cartao.due ? hojeISO(new Date(cartao.due)) : null
    const mesEntrega = mesDaLista(lista.name, atividade)
    let coluna = COLUNA_ENTREGUES
    let entregueEm = null
    if (mesEntrega) {
      // O dia exato da entrega não existe no Trello: usa o prazo ou a última atividade, se forem desse mês.
      entregueEm = mesDe(prazo) === mesEntrega ? prazo : mesDe(atividade) === mesEntrega ? atividade : `${mesEntrega}-01`
    } else {
      coluna = colunaPeloNome.get(normalizar(lista.name))
      if (!coluna) {
        coluna = paraId(lista.name)
        colunasNovas.set(coluna, { id: coluna, nome: lista.name })
      }
    }
    const etiquetas = (cartao.idLabels ?? []).map((id) => rotulos.get(id)).filter(Boolean).map(etiquetaOficial)
    const comentarios = comentariosDoCartao.get(cartao.id) ?? []
    itens.push({
      id: `trello-${cartao.id}`,
      idDoTrello: cartao.id,
      url: cartao.shortUrl ?? '',
      ultimaAtividade: cartao.dateLastActivity ?? '',
      criadoEm: criadoEmDoId(cartao.id),
      titulo: String(cartao.name ?? '').trim() || 'Sem título',
      descricao: cartao.desc ?? '',
      coluna,
      ordem: Number(cartao.pos) || 0,
      etiquetas,
      idsDosMembros: cartao.idMembers ?? [],
      prazo,
      entregue: Boolean(mesEntrega),
      entregueEm,
      mesEntrega,
      comentarios,
      postagem: postagemDoCartao({ nome: cartao.name, descricao: cartao.desc, comentarios, etiquetas, prazo, entregueEm, criadoEm }),
    })
  }

  return {
    nome: quadro.name ?? '',
    itens,
    arquivados,
    colunasNovas: [...colunasNovas.values()],
    pessoas: (quadro.members ?? []).map((m) => ({ id: m.id, nome: m.fullName ?? m.username ?? m.id })),
    // O Trello entrega no máximo 1000 ações por arquivo.
    comentariosNoLimite: acoes.length >= 1000,
  }
}

export function resumoDasPostagens(itens) {
  const resumo = { total: 0, exatas: 0, estimadas: 0, redeAConfirmar: 0, semData: 0, porMes: new Map() }
  for (const { postagem } of itens) {
    if (!postagem) continue
    resumo.total += 1
    if (!postagem.data) resumo.semData += 1
    else if (postagem.estimada) resumo.estimadas += 1
    else resumo.exatas += 1
    if (postagem.redeAConfirmar) resumo.redeAConfirmar += 1
    if (postagem.data) resumo.porMes.set(mesDe(postagem.data), (resumo.porMes.get(mesDe(postagem.data)) ?? 0) + 1)
  }
  return resumo
}

// Separa o que entra, o que muda, o que fica igual e o que foi mexido nos dois lugares.
export function planejarImportacao(itens, existentes = []) {
  const porId = new Map(existentes.map((c) => [c.id, c]))
  const plano = { novos: [], atualizar: [], conflitos: [], semMudanca: [], foraDoArquivo: [] }
  const noArquivo = new Set(itens.map((i) => i.id))
  for (const item of itens) {
    const atual = porId.get(item.id)
    if (!atual) plano.novos.push(item)
    else if (atual.trello?.ultimaAtividade === item.ultimaAtividade) plano.semMudanca.push(item)
    else if (foiMudadoNoSite(atual)) plano.conflitos.push(item)
    else plano.atualizar.push(item)
  }
  for (const cartao of existentes) if (!noArquivo.has(cartao.id)) plano.foraDoArquivo.push(cartao)
  return plano
}

const milissegundos = (momento) => momento?.toMillis?.() ?? 0

// Na importação, "atualizadoEm" e "importadoEm" recebem o mesmo momento; qualquer gravação do site passa à frente.
export const foiMudadoNoSite = (cartao) => milissegundos(cartao.atualizadoEm) > milissegundos(cartao.trello?.importadoEm)

const camposDoTrello = (item, { pessoaDoTrello, paraMomento }) => ({
  titulo: item.titulo,
  descricao: item.descricao,
  coluna: item.coluna,
  ordem: item.ordem,
  etiquetas: item.etiquetas,
  responsaveis: [...new Set(item.idsDosMembros.map(pessoaDoTrello).filter(Boolean))],
  prazo: item.prazo,
  entregue: item.entregue,
  entregueEm: item.entregueEm,
  mesEntrega: item.mesEntrega,
  postagem: item.postagem,
  postagemMes: item.postagem?.data ? mesDe(item.postagem.data) : null,
  comentarios: item.comentarios.map((c) => ({
    idDoTrello: c.idDoTrello,
    email: pessoaDoTrello(c.idDoMembro) ?? '',
    nome: c.nome,
    quando: paraMomento(c.quando),
    texto: c.texto,
  })),
})

const dadosDoTrello = (item, agora) => ({ id: item.idDoTrello, url: item.url, ultimaAtividade: item.ultimaAtividade, importadoEm: agora })

export function cartaoNovoDoTrello(item, { quem, agora, pessoaDoTrello, paraMomento }) {
  return {
    ...camposDoTrello(item, { pessoaDoTrello, paraMomento }),
    vinculos: [],
    historico: [{ quem, quando: agora, acao: 'importacao', campo: '', antes: '', depois: '' }],
    origem: 'trello',
    trello: dadosDoTrello(item, agora),
    criadoPor: quem,
    criadoEm: paraMomento(item.criadoEm),
    atualizadoEm: agora,
  }
}

// Reimportação: atualiza o que vem do Trello e mantém o que só existe no site (tempo e comentários daqui).
export function alteracoesDoTrello(item, atual, { quem, agora, pessoaDoTrello, paraMomento }) {
  const campos = camposDoTrello(item, { pessoaDoTrello, paraMomento })
  return {
    ...campos,
    comentarios: [...(atual.comentarios ?? []).filter((c) => !c.idDoTrello), ...campos.comentarios],
    historico: [...(atual.historico ?? []), { quem, quando: agora, acao: 'importacao', campo: '', antes: '', depois: '' }],
    trello: dadosDoTrello(item, agora),
    atualizadoEm: agora,
  }
}
