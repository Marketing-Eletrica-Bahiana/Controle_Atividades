// Contas dos gráficos do Painel. Recebem os itens de tempoPorDia (demanda + segundos no dia).

import { tempoPorDia } from './semana.js'

const unicas = (itens) => [...new Map(itens.map((i) => [i.demanda.id, i.demanda])).values()]

// Soma de segundos do período por um campo (área, pessoa...), do maior para o menor.
export function horasPor(itens, rotuloDe) {
  const soma = new Map()
  for (const item of itens) {
    const rotulo = rotuloDe(item.demanda) || 'Não informado'
    soma.set(rotulo, (soma.get(rotulo) ?? 0) + item.segundos)
  }
  return [...soma.entries()].map(([rotulo, segundos]) => ({ rotulo, segundos })).sort((a, b) => b.segundos - a.segundos)
}

// Quantidade de demandas (sem repetir) por um campo.
export function quantidadePor(itens, rotuloDe) {
  const contagem = new Map()
  for (const demanda of unicas(itens)) {
    const rotulo = rotuloDe(demanda) || 'Não informado'
    contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1)
  }
  return [...contagem.entries()].map(([rotulo, quantidade]) => ({ rotulo, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
}

// Tempo médio gasto por demanda de cada tipo.
export function tempoMedioPorTipo(itens) {
  const grupos = new Map()
  for (const demanda of unicas(itens)) {
    const rotulo = demanda.tipo || 'Não informado'
    const atual = grupos.get(rotulo) ?? { total: 0, quantidade: 0 }
    grupos.set(rotulo, { total: atual.total + (demanda.tempoGastoSeg ?? 0), quantidade: atual.quantidade + 1 })
  }
  return [...grupos.entries()]
    .map(([rotulo, { total, quantidade }]) => ({ rotulo, segundos: Math.round(total / quantidade) }))
    .sort((a, b) => b.segundos - a.segundos)
}

// Horas e demandas de cada mês (do primeiro ao último dia do mês).
export function evolucaoMensal(demandas, meses) {
  return meses.map((mes) => {
    const [ano, numero] = mes.split('-').map(Number)
    const ultimo = new Date(Date.UTC(ano, numero, 0)).getUTCDate()
    const itens = tempoPorDia(demandas, `${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`)
    return { mes, segundos: itens.reduce((s, i) => s + i.segundos, 0), demandas: unicas(itens).length }
  })
}

// Mantém os N maiores e junta o resto em "Outros".
export function principais(lista, quantos, campo) {
  if (lista.length <= quantos) return lista
  const resto = lista.slice(quantos - 1).reduce((s, x) => s + x[campo], 0)
  return [...lista.slice(0, quantos - 1), { rotulo: 'Outros', [campo]: resto }]
}
