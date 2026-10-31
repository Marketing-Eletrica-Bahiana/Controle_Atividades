// Tempos são guardados em segundos inteiros e exibidos sempre como HH:MM:SS.

const dois = (n) => String(n).padStart(2, '0')

export function formatarTempo(segundos) {
  if (segundos == null || segundos === '') return ''
  const total = Math.max(0, Math.round(Number(segundos) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${dois(h)}:${dois(m)}:${dois(s)}`
}

// Aceita "H:MM", "H:MM:SS" e "HH:MM:SS". Devolve segundos, ou null se o formato for inválido.
export function lerTempo(texto) {
  const partes = String(texto ?? '').trim().match(/^(\d{1,4}):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (!partes) return null
  return Number(partes[1]) * 3600 + Number(partes[2]) * 60 + Number(partes[3] ?? 0)
}

export const horasParaSegundos = (horas) => (horas == null || horas === '' ? null : Math.round(Number(horas) * 3600))

export const segundosParaHoras = (segundos) =>
  segundos == null ? null : Math.round((Number(segundos) / 3600) * 1e6) / 1e6

// Tempo economizado: maior valor entre zero e (estimado menos gasto). Sem estimativa, não há o que calcular.
export function tempoEconomizado(estimadoSeg, gastoSeg) {
  if (estimadoSeg == null) return null
  return Math.max(0, estimadoSeg - (gastoSeg ?? 0))
}
