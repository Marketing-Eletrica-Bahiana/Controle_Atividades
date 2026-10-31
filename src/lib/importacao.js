// Montagem das demandas importadas, sem gravar nada (a gravação fica em dados/importacao.js).

import { diasEntre } from './datas.js'
import { horasParaSegundos, tempoEconomizado } from './tempo.js'
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
