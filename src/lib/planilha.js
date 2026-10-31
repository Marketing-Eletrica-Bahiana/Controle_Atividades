// Leitura das planilhas de histórico. Funções puras: recebem a pasta de trabalho do SheetJS e devolvem
// os dados encontrados, sem gravar nada. Aceita os formatos conhecidos:
// - planilha mensal antiga ("Julho 2026", título na linha 1, com Nome da Demanda, Nº e Ajuste);
// - "Relatório Designers - Mês" (nome da tarefa em Tipo de Demanda e o tipo em Tipo de Atividade);
// - a exportação do próprio sistema (mesmas colunas da planilha mensal).
// As colunas são achadas pelo nome do cabeçalho, sem depender da posição.

import { SSF, utils } from 'xlsx'
import { lerAjustes, lerData, montarISO, NOMES_MESES } from './datas.js'
import { lerTempo } from './tempo.js'
import { normalizar } from './texto.js'

const COLUNAS_DEMANDA = {
  tipoDemanda: ['tipo de demanda'],
  tipoAtividade: ['tipo de atividade automatico', 'tipo de atividade'],
  nome: ['nome da demanda'],
  dataSolicitacao: ['data de solicitacao'],
  ajuste: ['ajuste', 'ajustes'],
  dataEntrega: ['data de entrega'],
  tempoGasto: ['tempo gasto'],
  usoIA: ['uso de ia'],
  usoTemplate: ['uso de template'],
  solicitante: ['solicitante', 'setor solicitante'],
  publico: ['publico automatico', 'publico'],
  numero: ['n', 'no', 'numero'],
  tempoMin: ['tempo minimo estimado sem ia h', 'tempo minimo estimado sem ia'],
  tempoMax: ['tempo maximo estimado sem ia h', 'tempo maximo estimado sem ia'],
  responsavel: ['responsavel', 'designer'],
}

const COLUNAS_TIPO = {
  nome: ['tipo de atividade'],
  min: ['tempo minimo h', 'tempo minimo'],
  max: ['tempo maximo h', 'tempo maximo'],
  prazo: ['prazo estimado dias', 'prazo estimado'],
  publico: ['publico'],
}

const COLUNAS_PALAVRA = {
  palavra: ['palavra chave'],
  tipo: ['tipo de atividade'],
}

const COLUNAS_LISTA = {
  solicitantes: ['setor solicitante', 'solicitante'],
  publicos: ['publico'],
}

const celula = (ws, linha, coluna) => (coluna == null ? undefined : ws[utils.encode_cell({ r: linha, c: coluna })])

const texto = (cel) => (cel ? String(cel.w ?? cel.v ?? '').trim() : '')

const vazia = (cel) => !cel || cel.v == null || String(cel.v).trim() === ''

function acharCabecalho(ws, mapa, obrigatorios) {
  const area = utils.decode_range(ws['!ref'])
  for (let linha = area.s.r; linha <= Math.min(area.e.r, area.s.r + 5); linha++) {
    const colunas = {}
    for (let coluna = area.s.c; coluna <= area.e.c; coluna++) {
      const nome = normalizar(texto(celula(ws, linha, coluna)))
      if (!nome) continue
      for (const [campo, apelidos] of Object.entries(mapa)) {
        if (colunas[campo] == null && apelidos.includes(nome)) colunas[campo] = coluna
      }
    }
    if (obrigatorios.every((campo) => colunas[campo] != null)) return { linha, colunas, ultima: area.e.r }
  }
  return null
}

// Datas: número de série do Excel, objeto Date ou texto DD/MM/AAAA. undefined quando há algo ilegível.
function dataDaCelula(cel, anoPadrao) {
  if (vazia(cel)) return null
  if (cel.t === 'n') {
    const partes = SSF.parse_date_code(cel.v)
    return (partes && montarISO(partes.y, partes.m, partes.d)) ?? undefined
  }
  if (cel.t === 'd') return montarISO(cel.v.getFullYear(), cel.v.getMonth() + 1, cel.v.getDate()) ?? undefined
  return lerData(texto(cel), anoPadrao) ?? undefined
}

// Célula de data que pode trazer mais de uma data, como "08/07 e 09/07/2026".
// Devolve { datas: [...] } em ordem, ou { datas: null } quando é ilegível.
function datasDaCelula(cel) {
  const unica = dataDaCelula(cel)
  if (unica !== undefined) return { datas: unica ? [unica] : [] }
  const ano = Number(texto(cel).match(/\b(20\d{2})\b/)?.[1]) || undefined
  const varias = lerAjustes(texto(cel), ano)
  return { datas: varias?.length ? [...varias].sort() : null }
}

// Tempos em segundos. Célula com formato de hora vale como fração de dia; número sem formato de hora vale
// como horas decimais quando "decimaisSaoHoras" (tabelas de tempo estimado). undefined quando é ilegível.
function tempoDaCelula(cel, { decimaisSaoHoras }) {
  if (vazia(cel)) return null
  const mostrado = texto(cel)
  if (cel.t === 'n') {
    if (mostrado.includes(':')) return Math.round(cel.v * 86400)
    return decimaisSaoHoras ? Math.round(cel.v * 3600) : Math.round(cel.v * 86400)
  }
  if (mostrado.includes(':')) return lerTempo(mostrado) ?? undefined
  const numero = Number(mostrado.replace(',', '.'))
  if (decimaisSaoHoras && mostrado && Number.isFinite(numero)) return Math.round(numero * 3600)
  return undefined
}

function simNao(valor) {
  const n = normalizar(valor)
  if (!n) return ''
  if (n === 'sim' || n === 's') return 'Sim'
  if (n === 'nao' || n === 'n') return 'Não'
  return undefined
}

function anoMaisComum(datas) {
  const contagem = {}
  for (const iso of datas) if (iso) contagem[iso.slice(0, 4)] = (contagem[iso.slice(0, 4)] ?? 0) + 1
  const [ano] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0] ?? []
  return ano ? Number(ano) : null
}

// "Julho 2026" ou "Relatório Designers - Julho" (o ano vem das datas da própria aba).
function mesDaAba(nomeAba, datas) {
  const nome = normalizar(nomeAba)
  const indice = NOMES_MESES.findIndex((mes) => new RegExp(`\\b${normalizar(mes)}\\b`).test(nome))
  if (indice < 0) return null
  const anoNoNome = nome.match(/\b(20\d{2})\b/)
  const ano = anoNoNome ? Number(anoNoNome[1]) : anoMaisComum(datas)
  return ano ? `${ano}-${String(indice + 1).padStart(2, '0')}` : null
}

function lerAbaDeDemandas(ws, nomeAba, { linha: linhaCabecalho, colunas, ultima }) {
  const pegar = (linha, campo) => celula(ws, linha, colunas[campo])
  const temColunaDeTipo = colunas.tipoAtividade != null
  const linhas = []

  for (let linha = linhaCabecalho + 1; linha <= ultima; linha++) {
    const tipo = texto(pegar(linha, temColunaDeTipo ? 'tipoAtividade' : 'tipoDemanda'))
    const nomeInformado = texto(pegar(linha, temColunaDeTipo && colunas.nome == null ? 'tipoDemanda' : 'nome'))
    const tempoGastoSeg = tempoDaCelula(pegar(linha, 'tempoGasto'), { decimaisSaoHoras: false })
    const celEntrega = pegar(linha, 'dataEntrega')
    const celSolicitacao = pegar(linha, 'dataSolicitacao')
    // Linha sem nome e sem tempo é linha vazia ou só de fórmulas: fica de fora.
    if (!tipo && !nomeInformado && tempoGastoSeg == null) continue

    const avisos = []
    const ajustesDasDatas = []
    // Entrega pode vir como "08/07 e 09/07/2026": a última é a entrega, as outras vão para o Ajuste.
    const entregas = datasDaCelula(celEntrega)
    let dataEntrega = entregas.datas?.at(-1) ?? null
    if (!entregas.datas) avisos.push(`Data de Entrega ilegível: "${texto(celEntrega)}"`)
    else ajustesDasDatas.push(...entregas.datas.slice(0, -1))
    const solicitacoes = datasDaCelula(celSolicitacao)
    const dataSolicitacao = solicitacoes.datas?.[0] ?? null
    if (!solicitacoes.datas) avisos.push(`Data de Solicitação ilegível: "${texto(celSolicitacao)}"`)
    else ajustesDasDatas.push(...solicitacoes.datas.slice(1))
    if (!dataEntrega && !dataSolicitacao) avisos.push('Sem data de solicitação e de entrega')

    let erro = null
    if (!tipo && !nomeInformado) erro = 'Sem nome da demanda'
    else if (tempoGastoSeg === undefined) erro = `Tempo gasto ilegível: "${texto(pegar(linha, 'tempoGasto'))}"`
    else if (tempoGastoSeg == null) avisos.push('Sem tempo gasto (fica 00:00:00)')

    const tempoMinSeg = tempoDaCelula(pegar(linha, 'tempoMin'), { decimaisSaoHoras: true })
    const tempoMaxSeg = tempoDaCelula(pegar(linha, 'tempoMax'), { decimaisSaoHoras: true })
    if (tempoMinSeg === undefined || tempoMaxSeg === undefined) avisos.push('Tempo estimado ilegível (usa o da tabela de tipos)')

    const usoIA = simNao(texto(pegar(linha, 'usoIA')))
    const usoTemplate = simNao(texto(pegar(linha, 'usoTemplate')))
    if (usoIA === undefined) avisos.push(`Uso de IA não reconhecido: "${texto(pegar(linha, 'usoIA'))}"`)
    if (usoTemplate === undefined) avisos.push(`Uso de Template não reconhecido: "${texto(pegar(linha, 'usoTemplate'))}"`)
    if (!tipo) avisos.push('Sem tipo de atividade')

    const numero = Number(texto(pegar(linha, 'numero')))

    linhas.push({
      aba: nomeAba,
      linha: linha + 1,
      nome: nomeInformado || tipo,
      tipo,
      dataSolicitacao,
      dataEntrega,
      ajusteTexto: texto(pegar(linha, 'ajuste')),
      celAjuste: pegar(linha, 'ajuste'),
      ajustesDasDatas,
      tempoGastoSeg: tempoGastoSeg ?? 0,
      tempoMinSeg: tempoMinSeg ?? null,
      tempoMaxSeg: tempoMaxSeg ?? null,
      usoIA: usoIA ?? '',
      usoTemplate: usoTemplate ?? '',
      solicitante: texto(pegar(linha, 'solicitante')),
      publico: texto(pegar(linha, 'publico')),
      numeroPlanilha: Number.isInteger(numero) && numero > 0 ? numero : null,
      responsavel: texto(pegar(linha, 'responsavel')),
      avisos,
      erro,
    })
  }

  const mesAba = mesDaAba(nomeAba, linhas.flatMap((l) => [l.dataEntrega, l.dataSolicitacao]))
  const anoAba = mesAba ? Number(mesAba.slice(0, 4)) : null

  return linhas.map(({ celAjuste, ajusteTexto, ajustesDasDatas, ...l }) => {
    const anoDaLinha = Number((l.dataEntrega ?? l.dataSolicitacao ?? '').slice(0, 4)) || anoAba
    let ajustes = [...ajustesDasDatas]
    if (!vazia(celAjuste)) {
      const lidos = celAjuste.t === 'n' ? [dataDaCelula(celAjuste)] : lerAjustes(ajusteTexto, anoDaLinha)
      if (lidos && lidos.every(Boolean)) ajustes.push(...lidos)
      else l.avisos.push(`Ajuste ilegível: "${ajusteTexto}"`)
    }
    // Ajuste guarda só datas que não são a solicitação nem a entrega, sem repetir.
    const datasAjuste = [...new Set(ajustes)].filter((d) => d !== l.dataSolicitacao && d !== l.dataEntrega).sort()
    // O mês da demanda é o da aba quando a aba diz o mês; senão, o da data.
    const mes = mesAba ?? (l.dataEntrega ?? l.dataSolicitacao)?.slice(0, 7) ?? null
    if (!mes) l.erro ??= 'Não deu para saber o mês desta linha'
    return { ...l, datasAjuste, mes }
  })
}

function lerTipos(ws, { linha: linhaCabecalho, colunas, ultima }) {
  const tipos = []
  for (let linha = linhaCabecalho + 1; linha <= ultima; linha++) {
    const nome = texto(celula(ws, linha, colunas.nome))
    if (!nome) continue
    const minSeg = tempoDaCelula(celula(ws, linha, colunas.min), { decimaisSaoHoras: true })
    const maxSeg = tempoDaCelula(celula(ws, linha, colunas.max), { decimaisSaoHoras: true })
    const prazo = Number(texto(celula(ws, linha, colunas.prazo)))
    const avisos = []
    if (minSeg === undefined || maxSeg === undefined) avisos.push('Tempo mínimo ou máximo ilegível')
    tipos.push({
      linha: linha + 1,
      nome,
      minSeg: minSeg ?? null,
      maxSeg: maxSeg ?? null,
      prazoEstimadoDias: texto(celula(ws, linha, colunas.prazo)) && Number.isFinite(prazo) ? prazo : null,
      publico: texto(celula(ws, linha, colunas.publico)),
      avisos,
    })
  }
  return tipos
}

function lerPalavras(ws, { linha: linhaCabecalho, colunas, ultima }) {
  const palavras = []
  for (let linha = linhaCabecalho + 1; linha <= ultima; linha++) {
    const palavra = texto(celula(ws, linha, colunas.palavra))
    const tipo = texto(celula(ws, linha, colunas.tipo))
    if (palavra && tipo) palavras.push({ linha: linha + 1, palavra, tipo })
  }
  return palavras
}

function lerListas(ws, { linha: linhaCabecalho, colunas, ultima }) {
  const listas = { publicos: [], solicitantes: [] }
  for (const campo of Object.keys(listas)) {
    if (colunas[campo] == null) continue
    for (let linha = linhaCabecalho + 1; linha <= ultima; linha++) {
      const valor = texto(celula(ws, linha, colunas[campo]))
      if (valor && !listas[campo].includes(valor)) listas[campo].push(valor)
    }
  }
  return listas
}

export const PAPEIS_DE_ABA = {
  demandas: 'Demandas do mês',
  tipos: 'Tipos de atividade',
  palavras: 'Palavras-chave',
  listas: 'Listas',
  ignorar: 'Ignorar',
}

// O que cada papel precisa achar no cabeçalho.
const CABECALHOS = {
  demandas: () => [COLUNAS_DEMANDA, ['tempoGasto']],
  tipos: () => [COLUNAS_TIPO, ['nome', 'min', 'max']],
  palavras: () => [COLUNAS_PALAVRA, ['palavra', 'tipo']],
}

const PROBLEMAS = {
  demandas: 'Não achei a coluna Tempo gasto nas primeiras linhas.',
  tipos: 'Não achei as colunas Tipo de Atividade, Tempo mínimo e Tempo máximo.',
  palavras: 'Não achei as colunas Palavra-chave e Tipo de Atividade.',
  listas: 'Não achei as colunas Público ou Setor solicitante.',
}

function cabecalhoDaLista(ws) {
  const cab = acharCabecalho(ws, COLUNAS_LISTA, [])
  return cab && (cab.colunas.publicos != null || cab.colunas.solicitantes != null) ? cab : null
}

// Papel que o sistema reconhece sozinho (gráficos, painéis e instruções ficam como "ignorar").
function identificarAba(ws, nomeAba) {
  if (acharCabecalho(ws, COLUNAS_DEMANDA, ['dataEntrega', 'tempoGasto'])) return 'demandas'
  if (acharCabecalho(ws, COLUNAS_TIPO, ['nome', 'min', 'max'])) return 'tipos'
  if (acharCabecalho(ws, COLUNAS_PALAVRA, ['palavra', 'tipo'])) return 'palavras'
  if (normalizar(nomeAba).includes('lista') && cabecalhoDaLista(ws)) return 'listas'
  return 'ignorar'
}

// "papeis" corrige o que foi identificado: { 'Nome da aba': 'demandas' | 'tipos' | 'palavras' | 'listas' | 'ignorar' }.
export function lerPlanilha(pasta, { papeis = {} } = {}) {
  const resultado = {
    abas: [],
    demandas: [],
    abasDeDemandas: [],
    tipos: [],
    palavras: [],
    listas: { publicos: [], solicitantes: [] },
    temResponsavel: false,
    abasIgnoradas: [],
  }

  for (const nomeAba of pasta.SheetNames) {
    const ws = pasta.Sheets[nomeAba]
    if (!ws || !ws['!ref']) continue
    const identificado = identificarAba(ws, nomeAba)
    const papel = papeis[nomeAba] ?? identificado
    const aba = { aba: nomeAba, identificado, papel, linhas: 0, problema: '' }
    resultado.abas.push(aba)

    if (papel === 'ignorar') {
      resultado.abasIgnoradas.push(nomeAba)
      continue
    }
    const cab = papel === 'listas' ? cabecalhoDaLista(ws) : acharCabecalho(ws, ...CABECALHOS[papel]())
    if (!cab) {
      aba.problema = PROBLEMAS[papel]
      continue
    }
    if (papel === 'demandas') {
      const linhas = lerAbaDeDemandas(ws, nomeAba, cab)
      resultado.demandas.push(...linhas)
      resultado.abasDeDemandas.push({ aba: nomeAba, linhas: linhas.length })
      if (cab.colunas.responsavel != null) resultado.temResponsavel = true
      aba.linhas = linhas.length
    } else if (papel === 'tipos') {
      const tipos = lerTipos(ws, cab)
      resultado.tipos.push(...tipos)
      aba.linhas = tipos.length
    } else if (papel === 'palavras') {
      const palavras = lerPalavras(ws, cab)
      resultado.palavras.push(...palavras)
      aba.linhas = palavras.length
    } else if (papel === 'listas') {
      const listas = lerListas(ws, cab)
      resultado.listas.publicos.push(...listas.publicos.filter((v) => !resultado.listas.publicos.includes(v)))
      resultado.listas.solicitantes.push(...listas.solicitantes.filter((v) => !resultado.listas.solicitantes.includes(v)))
      aba.linhas = listas.publicos.length + listas.solicitantes.length
    }
  }

  return resultado
}
