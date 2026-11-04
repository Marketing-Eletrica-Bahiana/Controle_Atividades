// Regras de negócio das demandas, sem acesso ao Firestore.

import { diasEntre, hojeISO, mesDe } from './datas.js'
import { tempoEconomizado } from './tempo.js'
import { normalizar } from './texto.js'

export const SITUACOES = {
  em_andamento: { rotulo: 'Em andamento', classe: 'situacao--andamento' },
  pausada: { rotulo: 'Pausada', classe: 'situacao--pausada' },
  concluida: { rotulo: 'Concluída', classe: 'situacao--concluida' },
}

const temPalavra = (texto, palavra) => ` ${normalizar(texto)} `.includes(` ${palavra} `)

// Preenchimento automático, nesta ordem de prioridade: Trello, Reunião de Setor, Claude.
export function regraAutomatica(nome, tipo) {
  if (temPalavra(nome, 'trello')) {
    return { usoIA: 'Não', usoTemplate: 'Não', solicitante: 'Marketing', motivo: 'nome com "Trello"' }
  }
  if (normalizar(tipo) === 'reuniao de setor') {
    return { usoIA: 'Não', usoTemplate: 'Não', solicitante: 'Marketing', motivo: 'tipo Reunião de Setor' }
  }
  if (temPalavra(nome, 'claude')) {
    return { usoIA: 'Sim', usoTemplate: 'Não', solicitante: 'Marketing', motivo: 'nome com "Claude"' }
  }
  return null
}

// Campos calculados a partir do tempo gasto e das datas.
export function camposCalculados({ tempoMinSeg, tempoMaxSeg, tempoGastoSeg, dataSolicitacao, dataEntrega }) {
  return {
    economizadoMinSeg: tempoEconomizado(tempoMinSeg, tempoGastoSeg),
    economizadoMaxSeg: tempoEconomizado(tempoMaxSeg, tempoGastoSeg),
    prazoDias: diasEntre(dataSolicitacao, dataEntrega),
  }
}

// Fecha uma sessão de cronômetro. Tempo nunca negativo, mesmo com relógios desencontrados.
export function fecharSessao(inicioMs, fimMs) {
  return { segundos: Math.max(0, Math.round((fimMs - inicioMs) / 1000)) }
}

// Dias (no fuso da Bahia) em que a demanda teve sessão de cronômetro.
export function diasTrabalhados(sessoes = []) {
  const dias = new Set()
  for (const sessao of sessoes) {
    for (const momento of [sessao.inicio, sessao.fim]) {
      const data = momento?.toDate?.() ?? (momento instanceof Date ? momento : null)
      if (data) dias.add(hojeISO(data))
    }
  }
  return [...dias]
}

// Ao concluir: a entrega é a data mais recente (hoje); as datas anteriores que não são solicitação nem
// entrega vão para o Ajuste, sem repetir. Vale também para a demanda reaberta e concluída de novo.
export function datasAoConcluir({ dataSolicitacao, datasAjuste = [], dataEntregaAnterior, dias = [], hoje }) {
  const anteriores = new Set([...datasAjuste, ...dias, dataEntregaAnterior].filter(Boolean))
  anteriores.delete(dataSolicitacao)
  anteriores.delete(hoje)
  return { dataEntrega: hoje, datasAjuste: [...anteriores].filter((d) => d < hoje).sort() }
}

// Demanda lançada à mão: pertence ao mês da data informada. Concluída, essa data é a entrega; em aberto,
// fica pausada e a data vai para o Ajuste (menos quando é a própria solicitação).
export function situacaoDaDemandaManual({ dataSolicitacao, data, concluida }) {
  return {
    mes: mesDe(data),
    status: concluida ? 'concluida' : 'pausada',
    dataEntrega: concluida ? data : null,
    datasAjuste: concluida || data === dataSolicitacao ? [] : [data],
  }
}

// Por que duas demandas não podem ser juntadas agora; vazio quando podem. Demanda em andamento está com o
// cronômetro ligado: apagá-la deixaria o cronômetro apontando para o nada.
export function motivoParaNaoJuntar(demandas) {
  if (demandas.length !== 2) return 'Marque duas demandas repetidas da mesma pessoa.'
  const [a, b] = demandas
  if (a.responsavelEmail !== b.responsavelEmail || a.area !== b.area) return 'As duas demandas precisam ser da mesma pessoa e da mesma área.'
  if (demandas.some((d) => d.status === 'em_andamento')) return 'Pause o cronômetro antes de juntar.'
  return ''
}

// Próximo Nº da pessoa no mês e na área.
export const proximoNumero = (demandasDoMes) => Math.max(0, ...demandasDoMes.map((d) => Number(d.numero) || 0)) + 1
