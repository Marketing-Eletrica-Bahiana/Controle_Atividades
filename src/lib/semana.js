// Contas por dia e por período (telas Semana e Painel). Funções puras.

import { hojeISO } from './datas.js'

const NOMES_DOS_DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const utc = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const iso = (data) => data.toISOString().slice(0, 10)

export const somarDias = (dia, dias) => {
  const data = utc(dia)
  data.setUTCDate(data.getUTCDate() + dias)
  return iso(data)
}

export const diaDaSemana = (dia) => utc(dia).getUTCDay()

export const nomeDoDia = (dia) => NOMES_DOS_DIAS[diaDaSemana(dia)]

// Segunda-feira da semana do dia informado (a semana de trabalho vai de segunda a sábado).
export function segundaDaSemana(dia = hojeISO()) {
  const semana = utc(dia).getUTCDay()
  return somarDias(dia, semana === 0 ? -6 : 1 - semana)
}

// Segunda a sábado; o domingo entra só se tiver trabalho registrado.
export const diasDaSemana = (segunda) => Array.from({ length: 7 }, (_, i) => somarDias(segunda, i))

export const mesesEntre = (inicio, fim) => {
  const meses = []
  let atual = `${inicio.slice(0, 7)}-01`
  while (atual.slice(0, 7) <= fim.slice(0, 7)) {
    meses.push(atual.slice(0, 7))
    const data = utc(atual)
    data.setUTCMonth(data.getUTCMonth() + 1)
    atual = iso(data)
  }
  return meses
}

const diaDaSessao = (sessao) => {
  const data = sessao.inicio?.toDate?.() ?? (sessao.inicio instanceof Date ? sessao.inicio : null)
  return data ? hojeISO(data) : null
}

// Tempo de uma demanda em cada dia, pelas sessões do cronômetro. Editar o Tempo Gasto não mexe nas sessões, e o
// total dos dias precisa bater com ele: o que sobra sai dos dias mais recentes (quem esqueceu o cronômetro ligado
// corrige o fim) e o que falta entra no último dia com sessão.
export function segundosPorDia(demanda) {
  const porDia = new Map()
  for (const sessao of demanda.sessoes ?? []) {
    const dia = diaDaSessao(sessao)
    if (dia) porDia.set(dia, (porDia.get(dia) ?? 0) + (sessao.seg ?? 0))
  }
  const dias = [...porDia.keys()].sort()
  if (!dias.length || typeof demanda.tempoGastoSeg !== 'number') return porDia
  let diferenca = demanda.tempoGastoSeg - [...porDia.values()].reduce((soma, seg) => soma + seg, 0)
  if (diferenca > 0) porDia.set(dias.at(-1), porDia.get(dias.at(-1)) + diferenca)
  for (let i = dias.length - 1; diferenca < 0 && i >= 0; i -= 1) {
    const tirar = Math.min(porDia.get(dias[i]), -diferenca)
    porDia.set(dias[i], porDia.get(dias[i]) - tirar)
    diferenca += tirar
  }
  return porDia
}

// Tempo de cada demanda em cada dia do período: pelas sessões do cronômetro; sem sessões
// (demandas importadas), o tempo todo vai para a data de entrega (ou de solicitação).
export function tempoPorDia(demandas, inicio, fim) {
  const itens = []
  for (const demanda of demandas) {
    const sessoes = demanda.sessoes ?? []
    if (sessoes.length) {
      for (const [dia, segundos] of segundosPorDia(demanda)) {
        if (dia >= inicio && dia <= fim) itens.push({ dia, demanda, segundos })
      }
    } else {
      const dia = demanda.dataEntrega ?? demanda.dataSolicitacao
      if (dia && dia >= inicio && dia <= fim) itens.push({ dia, demanda, segundos: demanda.tempoGastoSeg ?? 0 })
    }
  }
  return itens.sort((a, b) => a.dia.localeCompare(b.dia) || String(a.demanda.nome).localeCompare(b.demanda.nome, 'pt-BR'))
}

// ---------- Horas de trabalho com demandas simultâneas ----------
// Pedido em 25/11/2026: a pessoa pode rodar várias demandas ao mesmo tempo. Cada demanda conta o tempo inteiro em
// que rodou, mas as horas de trabalho da pessoa contam o relógio uma vez só: o trecho em que duas ou mais rodaram
// juntas não é somado de novo.

const emMs = (momento) => momento?.toMillis?.() ?? (momento instanceof Date ? momento.getTime() : null)

// Segundos contados mais de uma vez num conjunto de intervalos { inicio, fim } em milissegundos: a soma de todos
// menos o tempo de relógio que eles cobrem.
export function segundosRepetidos(intervalos) {
  const ordenados = intervalos.filter((i) => i.fim > i.inicio).sort((a, b) => a.inicio - b.inicio)
  let soma = 0
  let coberto = 0
  let fimAtual = -Infinity
  for (const { inicio, fim } of ordenados) {
    soma += fim - inicio
    if (inicio >= fimAtual) coberto += fim - inicio
    else if (fim > fimAtual) coberto += fim - fimAtual
    fimAtual = Math.max(fimAtual, fim)
  }
  return Math.round((soma - coberto) / 1000)
}

// Sessões do cronômetro de uma demanda num dia, como intervalos de relógio. A sessão manual fica de fora: ela não
// tem horário de verdade (é gravada às 08:00) e soma inteira.
function intervalosReais(demanda, dia) {
  return (demanda.sessoes ?? [])
    .filter((sessao) => !sessao.manual && diaDaSessao(sessao) === dia && emMs(sessao.inicio) != null)
    .map((sessao) => ({ inicio: emMs(sessao.inicio), fim: emMs(sessao.inicio) + (sessao.seg ?? 0) * 1000 }))
}

// Horas de trabalho de cada pessoa, a partir dos itens de tempoPorDia ({ dia, demanda, segundos }). Por pessoa e dia:
// a soma do tempo das demandas menos o que se repetiu nas sessões que correram juntas. "vivos" são as sessões que
// ainda estão rodando ({ email, dia, inicio, fim }, em ms), com o tempo delas já somado nos itens. O dia nunca fica
// abaixo da maior demanda dele: um Tempo Gasto corrigido para menos deixa sessões mais longas do que o tempo que vale.
// Devolve Map(email → { nome, segundos }).
export function horasDeTrabalhoPorPessoa(itens, vivos = []) {
  const grupos = new Map()
  for (const item of itens) {
    const email = item.demanda.responsavelEmail
    const chave = `${email}|${item.dia}`
    if (!grupos.has(chave)) grupos.set(chave, { email, nome: item.demanda.responsavelNome, dia: item.dia, itens: [] })
    grupos.get(chave).itens.push(item)
  }
  const porPessoa = new Map()
  for (const { email, nome, dia, itens: doDia } of grupos.values()) {
    const soma = doDia.reduce((s, i) => s + i.segundos, 0)
    const maior = Math.max(0, ...doDia.map((i) => i.segundos))
    const intervalos = [...doDia.flatMap((i) => intervalosReais(i.demanda, dia)), ...vivos.filter((v) => v.email === email && v.dia === dia)]
    const segundos = Math.max(maior, soma - segundosRepetidos(intervalos))
    const atual = porPessoa.get(email)
    porPessoa.set(email, { nome: atual?.nome ?? nome, segundos: (atual?.segundos ?? 0) + segundos })
  }
  return porPessoa
}

export const horasDeTrabalho = (itens, vivos = []) => [...horasDeTrabalhoPorPessoa(itens, vivos).values()].reduce((s, p) => s + p.segundos, 0)

// Indicadores do período: horas de trabalho, demandas, tempo economizado (das demandas com IA, concluídas no
// período) e porcentagem de demandas com IA.
export function resumoDoPeriodo(itens, inicio, fim) {
  const demandas = [...new Map(itens.map((i) => [i.demanda.id, i.demanda])).values()]
  const comIA = demandas.filter((d) => d.usoIA === 'Sim')
  const concluidasComIA = comIA.filter((d) => d.dataEntrega && d.dataEntrega >= inicio && d.dataEntrega <= fim)
  return {
    totalSeg: horasDeTrabalho(itens),
    demandas: demandas.length,
    economizadoMinSeg: concluidasComIA.reduce((s, d) => s + (d.economizadoMinSeg ?? 0), 0),
    economizadoMaxSeg: concluidasComIA.reduce((s, d) => s + (d.economizadoMaxSeg ?? 0), 0),
    porcentagemIA: demandas.length ? Math.round((100 * comIA.length) / demandas.length) : 0,
  }
}
