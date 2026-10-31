// Datas são guardadas como texto "AAAA-MM-DD" (sem hora, sem fuso) e exibidas como DD/MM/AAAA.
// "Hoje" é sempre calculado no fuso America/Bahia.

export const FUSO = 'America/Bahia'

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const dois = (n) => String(n).padStart(2, '0')

export function hojeISO(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    agora,
  )
}

// Monta "AAAA-MM-DD" só se a data existir no calendário (31/02 devolve null).
export function montarISO(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return existe ? `${ano}-${dois(mes)}-${dois(dia)}` : null
}

const anoCompleto = (texto) => {
  const ano = Number(texto)
  return ano < 100 ? 2000 + ano : ano
}

// "DD/MM/AAAA", "DD/MM/AA" ou "DD/MM" (com o ano informado à parte).
export function lerData(texto, anoPadrao) {
  const partes = String(texto ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/)
  if (!partes) return null
  const ano = partes[3] ? anoCompleto(partes[3]) : anoPadrao
  if (!ano) return null
  return montarISO(ano, Number(partes[2]), Number(partes[1]))
}

export function formatarData(iso) {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export const mesDe = (iso) => (iso ? iso.slice(0, 7) : null)

export function formatarMes(mes) {
  if (!mes) return ''
  const [ano, numero] = mes.split('-')
  return `${NOMES_MESES[Number(numero) - 1]} ${ano}`
}

export function diasEntre(isoInicio, isoFim) {
  if (!isoInicio || !isoFim) return null
  const utc = (iso) => {
    const [a, m, d] = iso.split('-').map(Number)
    return Date.UTC(a, m - 1, d)
  }
  return Math.round((utc(isoFim) - utc(isoInicio)) / 86400000)
}

// Ajustes como aparecem nas planilhas: "01/09/2026", "28/09", "14 e 15/09", "23, 24 e 25/09", "28/09 e 29/09".
// Dias soltos herdam mês e ano da próxima data completa à direita. Devolve null se algum pedaço for ilegível.
export function lerAjustes(texto, anoPadrao) {
  const pedacos = String(texto ?? '')
    .split(/\s*(?:,|;|\se\s)\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  const datas = []
  let mes = null
  let ano = anoPadrao
  for (let i = pedacos.length - 1; i >= 0; i--) {
    const completa = pedacos[i].match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/)
    const soDia = pedacos[i].match(/^(\d{1,2})$/)
    let iso = null
    if (completa) {
      mes = Number(completa[2])
      if (completa[3]) ano = anoCompleto(completa[3])
      iso = ano ? montarISO(ano, mes, Number(completa[1])) : null
    } else if (soDia && mes && ano) {
      iso = montarISO(ano, mes, Number(soDia[1]))
    }
    if (!iso) return null
    datas.unshift(iso)
  }
  return datas
}

// Exibição do Ajuste: "14 e 15/09" quando todas as datas são do mesmo mês; senão "30/09 e 01/10".
export function formatarAjustes(datas = []) {
  if (!datas.length) return ''
  const juntar = (itens) => (itens.length === 1 ? itens[0] : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`)
  const ordenadas = [...datas].sort()
  const mesmoMes = ordenadas.every((d) => d.slice(0, 7) === ordenadas[0].slice(0, 7))
  if (mesmoMes) {
    const mes = ordenadas[0].slice(5, 7)
    return `${juntar(ordenadas.map((d) => d.slice(8, 10)))}/${mes}`
  }
  return juntar(ordenadas.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`))
}
