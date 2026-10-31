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

export const nomeDoDia = (dia) => NOMES_DOS_DIAS[utc(dia).getUTCDay()]

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

// Tempo de cada demanda em cada dia do período: pelas sessões do cronômetro; sem sessões
// (demandas importadas), o tempo todo vai para a data de entrega (ou de solicitação).
export function tempoPorDia(demandas, inicio, fim) {
  const itens = []
  for (const demanda of demandas) {
    const sessoes = demanda.sessoes ?? []
    if (sessoes.length) {
      const porDia = new Map()
      for (const sessao of sessoes) {
        const dia = diaDaSessao(sessao)
        if (dia && dia >= inicio && dia <= fim) porDia.set(dia, (porDia.get(dia) ?? 0) + (sessao.seg ?? 0))
      }
      for (const [dia, segundos] of porDia) itens.push({ dia, demanda, segundos })
    } else {
      const dia = demanda.dataEntrega ?? demanda.dataSolicitacao
      if (dia && dia >= inicio && dia <= fim) itens.push({ dia, demanda, segundos: demanda.tempoGastoSeg ?? 0 })
    }
  }
  return itens.sort((a, b) => a.dia.localeCompare(b.dia) || String(a.demanda.nome).localeCompare(b.demanda.nome, 'pt-BR'))
}

// Indicadores do período: horas, demandas, tempo economizado (das demandas com IA, concluídas no período)
// e porcentagem de demandas com IA.
export function resumoDoPeriodo(itens, inicio, fim) {
  const demandas = [...new Map(itens.map((i) => [i.demanda.id, i.demanda])).values()]
  const comIA = demandas.filter((d) => d.usoIA === 'Sim')
  const concluidasComIA = comIA.filter((d) => d.dataEntrega && d.dataEntrega >= inicio && d.dataEntrega <= fim)
  return {
    totalSeg: itens.reduce((s, i) => s + i.segundos, 0),
    demandas: demandas.length,
    economizadoMinSeg: concluidasComIA.reduce((s, d) => s + (d.economizadoMinSeg ?? 0), 0),
    economizadoMaxSeg: concluidasComIA.reduce((s, d) => s + (d.economizadoMaxSeg ?? 0), 0),
    porcentagemIA: demandas.length ? Math.round((100 * comIA.length) / demandas.length) : 0,
  }
}
