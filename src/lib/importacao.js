// Montagem das demandas importadas, sem gravar nada (a gravação fica em dados/importacao.js).

import { diasEntre } from './datas.js'
import { formatarTempo, horasParaSegundos, tempoEconomizado } from './tempo.js'
import { normalizar, primeiroNome } from './texto.js'

// Liga o valor da coluna Responsável a uma pessoa: nome completo, primeiro nome ou e-mail.
export function sugerirPessoa(valor, membros) {
  const procurado = normalizar(valor)
  if (!procurado) return null
  return (
    membros.find((m) => normalizar(m.nome) === procurado) ??
    membros.find((m) => normalizar(primeiroNome(m.nome)) === procurado.split(' ')[0]) ??
    membros.find((m) => m.id === String(valor).trim().toLowerCase()) ??
    null
  )
}

export const chaveDoGrupo = (email, mes) => `${email}|${mes}`

// Agrupa por pessoa e mês e numera em sequência (Nº por mês, por área e por responsável).
// A ordem segue o Nº da planilha quando todas as linhas do grupo têm Nº; senão, a ordem das linhas.
export function agruparENumerar(linhas, pessoaDaLinha) {
  const grupos = new Map()
  for (const linha of linhas) {
    const pessoa = pessoaDaLinha(linha)
    if (!pessoa || linha.erro) continue
    const chave = chaveDoGrupo(pessoa.id, linha.mes)
    if (!grupos.has(chave)) grupos.set(chave, { chave, pessoa, mes: linha.mes, linhas: [] })
    grupos.get(chave).linhas.push(linha)
  }
  for (const grupo of grupos.values()) {
    if (grupo.linhas.every((l) => l.numeroPlanilha != null)) {
      grupo.linhas.sort((a, b) => a.numeroPlanilha - b.numeroPlanilha)
    }
    grupo.linhas = grupo.linhas.map((linha, i) => ({ ...linha, numero: i + 1 }))
  }
  return [...grupos.values()].sort((a, b) => a.mes.localeCompare(b.mes) || a.pessoa.nome.localeCompare(b.pessoa.nome))
}

// Documento da demanda no formato do Firestore. Tempo e público em branco vêm da tabela de tipos da área.
export function montarDemanda(linha, { area, pessoa, tiposPorNome, arquivo, quem, agora, marcaDoServidor }) {
  const tipoDaTabela = tiposPorNome.get(normalizar(linha.tipo))
  const tempoMinSeg = linha.tempoMinSeg ?? horasParaSegundos(tipoDaTabela?.minH)
  const tempoMaxSeg = linha.tempoMaxSeg ?? horasParaSegundos(tipoDaTabela?.maxH)
  return {
    area,
    numero: linha.numero,
    mes: linha.mes,
    tipo: linha.tipo,
    dataSolicitacao: linha.dataSolicitacao,
    datasAjuste: linha.datasAjuste,
    dataEntrega: linha.dataEntrega,
    tempoGastoSeg: linha.tempoGastoSeg,
    usoIA: linha.usoIA,
    usoTemplate: linha.usoTemplate,
    solicitante: linha.solicitante,
    publico: linha.publico || tipoDaTabela?.publico || '',
    nome: linha.nome,
    tempoMinSeg,
    tempoMaxSeg,
    economizadoMinSeg: tempoEconomizado(tempoMinSeg, linha.tempoGastoSeg),
    economizadoMaxSeg: tempoEconomizado(tempoMaxSeg, linha.tempoGastoSeg),
    prazoDias: diasEntre(linha.dataSolicitacao, linha.dataEntrega),
    responsavelEmail: pessoa.id,
    responsavelNome: pessoa.nome,
    status: 'concluida',
    sessoes: [],
    historico: [
      {
        quem,
        quando: agora,
        acao: 'importacao',
        campo: '',
        antes: '',
        depois: `${arquivo} (${linha.aba}, linha ${linha.linha})`,
      },
    ],
    importada: true,
    arquivoOrigem: arquivo,
    criadoEm: marcaDoServidor,
    atualizadoEm: marcaDoServidor,
  }
}

// ---------- Prévia das tabelas: a da planilha substitui a da área ----------

const textoDoPrazo = (dias) => (dias == null ? 'sem prazo' : `${dias} ${dias === 1 ? 'dia' : 'dias'}`)

// Tipos: o que entra, sai e muda (comparando pelo nome, sem diferenciar maiúsculas e acentos).
export function diferencaTipos(atuais = [], daPlanilha = []) {
  const porNome = new Map(atuais.map((t) => [normalizar(t.nome), t]))
  const vistos = new Set()
  const entram = []
  const mudam = []
  let iguais = 0
  for (const novo of daPlanilha) {
    const chave = normalizar(novo.nome)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const atual = porNome.get(chave)
    if (!atual) {
      entram.push(novo)
      continue
    }
    const mudancas = []
    const minAtual = horasParaSegundos(atual.minH)
    const maxAtual = horasParaSegundos(atual.maxH)
    if (atual.nome !== novo.nome) mudancas.push(`nome passa de "${atual.nome}" para "${novo.nome}"`)
    if (minAtual !== novo.minSeg) mudancas.push(`tempo mínimo passa de ${formatarTempo(minAtual)} para ${formatarTempo(novo.minSeg)}`)
    if (maxAtual !== novo.maxSeg) mudancas.push(`tempo máximo passa de ${formatarTempo(maxAtual)} para ${formatarTempo(novo.maxSeg)}`)
    if ((atual.publico ?? '') !== (novo.publico ?? '')) mudancas.push(`público passa de "${atual.publico || 'nenhum'}" para "${novo.publico || 'nenhum'}"`)
    if ((atual.prazoEstimadoDias ?? null) !== (novo.prazoEstimadoDias ?? null)) {
      mudancas.push(`prazo passa de ${textoDoPrazo(atual.prazoEstimadoDias)} para ${textoDoPrazo(novo.prazoEstimadoDias)}`)
    }
    if (mudancas.length) mudam.push({ nome: novo.nome, mudancas })
    else iguais++
  }
  const saem = atuais.filter((t) => !vistos.has(normalizar(t.nome)))
  return { entram, saem, mudam, iguais }
}

// Palavras-chave: o que entra, sai e muda de tipo.
export function diferencaPalavras(atuais = [], daPlanilha = []) {
  const porPalavra = new Map(atuais.map((p) => [normalizar(p.palavra), p]))
  const vistas = new Set()
  const entram = []
  const mudam = []
  let iguais = 0
  for (const nova of daPlanilha) {
    const chave = normalizar(nova.palavra)
    if (!chave || vistas.has(chave)) continue
    vistas.add(chave)
    const atual = porPalavra.get(chave)
    if (!atual) entram.push(nova)
    else if (atual.tipo !== nova.tipo) mudam.push({ nome: nova.palavra, mudancas: [`tipo passa de "${atual.tipo}" para "${nova.tipo}"`] })
    else iguais++
  }
  const saem = atuais.filter((p) => !vistas.has(normalizar(p.palavra)))
  return { entram, saem, mudam, iguais }
}

// ---------- Prévia de cada mês ----------

// existentes: demandas que a pessoa já tem no mês ({ id, importada, numero }).
// Sem "Substituir histórico", mês já importado é pulado para não duplicar. Com ele, saem as importadas
// e entram as novas. Demandas do cronômetro nunca saem: as importadas são numeradas depois delas.
export function planejarMes(quantidade, existentes = [], substituir = false) {
  const importadas = existentes.filter((d) => d.importada)
  const doCronometro = existentes.filter((d) => !d.importada)
  const primeiroNumero = Math.max(0, ...doCronometro.map((d) => Number(d.numero) || 0)) + 1
  if (importadas.length && !substituir) {
    return { pular: true, entram: 0, saem: [], primeiroNumero, jaImportadas: importadas.length, doCronometro: doCronometro.length }
  }
  return { pular: false, entram: quantidade, saem: importadas.map((d) => d.id), primeiroNumero, jaImportadas: importadas.length, doCronometro: doCronometro.length }
}
