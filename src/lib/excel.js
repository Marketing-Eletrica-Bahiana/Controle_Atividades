// Arquivos Excel gerados pelo sistema (ExcelJS, carregado só quando alguém baixa um arquivo).
// Cabeçalho com fundo #001780, texto branco e fonte Lato. Datas em DD/MM/AAAA e tempos em HH:MM:SS,
// gravados como texto para o arquivo voltar igual na importação.

import { formatarAjustes, formatarData, formatarMes } from './datas.js'
import { formatarTempo, horasParaSegundos } from './tempo.js'

const MARINHO = 'FF001780'


export const COLUNAS_EXPORTACAO = [
  { titulo: 'Tipo de Demanda', largura: 34, valor: (d) => d.tipo ?? '' },
  { titulo: 'Data de Solicitação', largura: 16, valor: (d) => formatarData(d.dataSolicitacao) },
  { titulo: 'Ajuste', largura: 16, valor: (d) => formatarAjustes(d.datasAjuste ?? []) },
  { titulo: 'Data de Entrega', largura: 16, valor: (d) => formatarData(d.dataEntrega) },
  { titulo: 'Tempo Gasto', largura: 12, valor: (d) => formatarTempo(d.tempoGastoSeg ?? 0) },
  { titulo: 'Uso de IA', largura: 10, valor: (d) => d.usoIA ?? '' },
  { titulo: 'Uso de Template', largura: 14, valor: (d) => d.usoTemplate ?? '' },
  { titulo: 'Solicitante', largura: 16, valor: (d) => d.solicitante ?? '' },
  { titulo: 'Público', largura: 18, valor: (d) => d.publico ?? '' },
  { titulo: 'Nome da Demanda', largura: 48, valor: (d) => d.nome ?? '' },
  { titulo: 'Nº', largura: 6, valor: (d) => d.numero ?? '' },
  { titulo: 'Tempo mínimo estimado sem IA (h)', largura: 18, valor: (d) => formatarTempo(d.tempoMinSeg) },
  { titulo: 'Tempo máximo estimado sem IA (h)', largura: 18, valor: (d) => formatarTempo(d.tempoMaxSeg) },
  { titulo: 'Tempo economizado mín. com IA (h)', largura: 18, valor: (d) => formatarTempo(d.economizadoMinSeg) },
  { titulo: 'Tempo economizado máx. com IA (h)', largura: 18, valor: (d) => formatarTempo(d.economizadoMaxSeg) },
  { titulo: 'Prazo cumprido (dias)', largura: 12, valor: (d) => d.prazoDias ?? '' },
  // Fora das 16 colunas do padrão, no fim: permite importar de volta um arquivo com várias pessoas.
  { titulo: 'Responsável', largura: 20, valor: (d) => d.responsavelNome ?? '' },
]

async function novaPasta() {
  const { default: ExcelJS } = await import('exceljs')
  const pasta = new ExcelJS.Workbook()
  pasta.creator = 'Controle de Atividades | Elétrica Bahiana'
  return pasta
}

function estilizarCabecalho(linha) {
  linha.height = 30
  linha.eachCell((celula) => {
    celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARINHO } }
    celula.font = { name: 'Lato', bold: true, color: { argb: 'FFFFFFFF' } }
    celula.alignment = { vertical: 'middle', wrapText: true }
  })
}

function estilizarCorpo(aba, primeiraLinha) {
  aba.eachRow((linha, numero) => {
    if (numero < primeiraLinha) return
    linha.eachCell({ includeEmpty: true }, (celula) => {
      celula.font = { name: 'Lato' }
    })
  })
}

// Aba de demandas: título na linha 1 e cabeçalho na linha 2 (o mesmo formato que a importação lê).
export function abaDeDemandas(pasta, nome, titulo, demandas, cabecalhoExtra = []) {
  const aba = pasta.addWorksheet(nome.slice(0, 31))
  aba.columns = COLUNAS_EXPORTACAO.map((c) => ({ width: c.largura }))
  const linhaTitulo = aba.addRow([titulo])
  linhaTitulo.font = { name: 'Lato', bold: true, size: 14, color: { argb: MARINHO } }
  for (const extra of cabecalhoExtra) aba.addRow([extra]).font = { name: 'Lato', color: { argb: MARINHO } }
  const cabecalho = aba.addRow(COLUNAS_EXPORTACAO.map((c) => c.titulo))
  estilizarCabecalho(cabecalho)
  const primeira = cabecalho.number + 1
  for (const demanda of demandas) aba.addRow(COLUNAS_EXPORTACAO.map((c) => c.valor(demanda)))
  estilizarCorpo(aba, primeira)
  aba.views = [{ state: 'frozen', ySplit: cabecalho.number }]
  return aba
}

export function abaSimples(pasta, nome, titulos, linhas, larguras = []) {
  const aba = pasta.addWorksheet(nome.slice(0, 31))
  aba.columns = titulos.map((_, i) => ({ width: larguras[i] ?? 20 }))
  estilizarCabecalho(aba.addRow(titulos))
  for (const linha of linhas) aba.addRow(linha)
  estilizarCorpo(aba, 2)
  aba.views = [{ state: 'frozen', ySplit: 1 }]
  return aba
}

export async function baixarPasta(pasta, nomeDoArquivo) {
  const dados = await pasta.xlsx.writeBuffer()
  const blob = new Blob([dados], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = nomeDoArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

// Tabela de referência da área: abas "Tipo de Atividade" e "Palavras-chave", no formato que volta na importação.
export async function baixarTabelaDeReferencia(nomeDaArea, tipos, palavras) {
  const pasta = await novaPasta()
  abaSimples(
    pasta,
    'Tipo de Atividade',
    ['Tipo de Atividade', 'Tempo mínimo (h)', 'Tempo máximo (h)', 'Prazo estimado (dias)', 'Público'],
    tipos.map((t) => [t.nome, formatarTempo(horasParaSegundos(t.minH)), formatarTempo(horasParaSegundos(t.maxH)), t.prazoEstimadoDias ?? '', t.publico ?? '']),
    [48, 18, 18, 20, 24],
  )
  abaSimples(pasta, 'Palavras-chave', ['Palavra-chave', 'Tipo de Atividade'], palavras.map((p) => [p.palavra, p.tipo]), [32, 48])
  await baixarPasta(pasta, `Tabela_de_Referencia_${nomeParaArquivo(nomeDaArea)}.xlsx`)
}

export const nomeParaArquivo = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

export { novaPasta }

// "Exportar mês": uma aba "Outubro 2026" no formato do CLAUDE.md, ordenada por responsável e Nº.
export async function montarMes(nomeDaArea, mes, demandas) {
  const pasta = await novaPasta()
  const ordenadas = [...demandas].sort(
    (a, b) => String(a.responsavelNome).localeCompare(b.responsavelNome, 'pt-BR') || (a.numero ?? 0) - (b.numero ?? 0),
  )
  abaDeDemandas(pasta, formatarMes(mes), `Controle de Atividades | ${nomeDaArea} | ${formatarMes(mes)}`, ordenadas)
  return pasta
}

export async function exportarMes(nomeDaArea, mes, demandas, nomeNoArquivo = nomeDaArea) {
  const pasta = await montarMes(nomeDaArea, mes, demandas)
  const [ano, numero] = mes.split('-')
  await baixarPasta(pasta, `Controle_Atividades_${nomeParaArquivo(nomeNoArquivo)}_Mes_${numero}-${ano}.xlsx`)
}

// "Exportar Excel" da Semana: uma aba por pessoa (nome, cargo e área no topo) e uma aba "Resumo".
export async function exportarSemana(dados) {
  const pasta = await montarSemana(dados)
  const curta = (dia) => `${dia.slice(8, 10)}-${dia.slice(5, 7)}`
  await baixarPasta(pasta, `Controle_Atividades_${nomeParaArquivo(dados.nomeNoArquivo)}_Semana_${curta(dados.segunda)}_a_${curta(dados.sabado)}.xlsx`)
}

export async function montarSemana({ nomeDaArea, segunda, sabado, pessoas }) {
  const pasta = await novaPasta()
  const periodo = `${formatarData(segunda)} a ${formatarData(sabado)}`
  abaSimples(
    pasta,
    'Resumo',
    ['Pessoa', 'Cargo', 'Área', 'Demandas', 'Horas na semana', 'Tempo economizado mín. com IA', 'Tempo economizado máx. com IA', '% com IA'],
    [
      ...pessoas.map((p) => [p.nome, p.cargo, p.areas, p.resumo.demandas, formatarTempo(p.resumo.totalSeg), formatarTempo(p.resumo.economizadoMinSeg), formatarTempo(p.resumo.economizadoMaxSeg), `${p.resumo.porcentagemIA}%`]),
      [
        'Total',
        '',
        nomeDaArea,
        pessoas.reduce((s, p) => s + p.resumo.demandas, 0),
        formatarTempo(pessoas.reduce((s, p) => s + p.resumo.totalSeg, 0)),
        formatarTempo(pessoas.reduce((s, p) => s + p.resumo.economizadoMinSeg, 0)),
        formatarTempo(pessoas.reduce((s, p) => s + p.resumo.economizadoMaxSeg, 0)),
        '',
      ],
    ],
    [28, 24, 24, 12, 16, 22, 22, 10],
  )
  const usados = new Set(['Resumo'])
  for (const p of pessoas) {
    let nome = p.nome.slice(0, 31)
    for (let i = 2; usados.has(nome); i++) nome = `${p.nome.slice(0, 27)} ${i}`
    usados.add(nome)
    abaDeDemandas(pasta, nome, `Controle de Atividades | Semana de ${periodo}`, p.demandas, [`${p.nome} | ${p.cargo || 'Cargo não informado'} | ${p.areas}`])
  }
  return pasta
}
