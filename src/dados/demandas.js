// Leitura e gravação de demandas e do cronômetro. Toda consulta de demandas filtra por área.

import { useEffect, useState } from 'react'
import {
  collection, doc, getDocs, query, runTransaction, serverTimestamp, Timestamp, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useConsulta, useConsultas } from '../hooks/useConsulta.js'
import { formatarAjustes, formatarData, hojeISO, mesDe } from '../lib/datas.js'
import { camposCalculados, datasAoConcluir, diasTrabalhados, fecharSessao, proximoNumero } from '../lib/regras.js'
import { formatarTempo, horasParaSegundos } from '../lib/tempo.js'
import { normalizar } from '../lib/texto.js'

const colecao = () => collection(db, 'demandas')
const refDemanda = (id) => doc(db, 'demandas', id)
export const refCronometro = (email) => doc(db, 'cronometros', email)
export const ABERTAS = ['em_andamento', 'pausada']

export const registro = (quem, acao, campo = '', antes = '', depois = '') => ({
  quem,
  quando: Timestamp.now(),
  acao,
  campo,
  antes: String(antes ?? ''),
  depois: String(depois ?? ''),
})

const horaDe = (ts) =>
  ts?.toDate
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts.toDate())
    : ''

const daPessoaNoMes = (area, email, mes) =>
  query(colecao(), where('area', '==', area), where('responsavelEmail', '==', email), where('mes', '==', mes))

// ---------- Leitura ----------

export function useCronometro(email) {
  return useConsulta(email && `cronometros/${email}`, () => refCronometro(email))
}

// Demandas da pessoa nas áreas indicadas: as do mês atual e as abertas de qualquer mês.
export function useMinhasDemandas(areas, email, mes) {
  const lista = [...(areas ?? [])].sort()
  return useConsultas(email && lista.length && `minhas/${email}/${mes}/${lista.join(',')}`, () =>
    lista.flatMap((area) => [
      daPessoaNoMes(area, email, mes),
      query(colecao(), where('area', '==', area), where('responsavelEmail', '==', email), where('status', 'in', ABERTAS)),
    ]),
  )
}

export function useDemandasDaArea(area, mes) {
  return useConsulta(area && mes && `demandas/${area}/${mes}`, () =>
    query(colecao(), where('area', '==', area), where('mes', '==', mes)),
  )
}

// Histórico da área para a classificação automática: lido uma vez por área.
const historicoEmMemoria = new Map()
export function useHistoricoDaArea(area) {
  const [dados, setDados] = useState(() => historicoEmMemoria.get(area) ?? null)
  useEffect(() => {
    if (!area) return undefined
    if (historicoEmMemoria.has(area)) {
      setDados(historicoEmMemoria.get(area))
      return undefined
    }
    let ativo = true
    getDocs(query(colecao(), where('area', '==', area)))
      .then((snap) => {
        const lista = snap.docs.map((d) => {
          const { nome, tipo, mes, responsavelEmail } = d.data()
          return { nome, tipo, mes, responsavelEmail }
        })
        historicoEmMemoria.set(area, lista)
        if (ativo) setDados(lista)
      })
      .catch(() => ativo && setDados([]))
    return () => {
      ativo = false
    }
  }, [area])
  return dados
}

export const esquecerHistorico = (area) => historicoEmMemoria.delete(area)

// ---------- Cronômetro ----------

async function lerRodando(t, email) {
  const cron = await t.get(refCronometro(email))
  const dados = cron.exists() ? cron.data() : null
  if (!dados?.rodando || !dados.demandaId) return { cron: dados, demanda: null }
  const demanda = await t.get(refDemanda(dados.demandaId))
  return { cron: dados, demanda: demanda.exists() ? demanda : null }
}

// Fecha a sessão aberta e soma o tempo. Devolve os dados atualizados da demanda.
function fecharSessaoNaTransacao(t, { cron, demanda }, agoraMs, alteracoes = {}) {
  const atual = demanda.data()
  const inicio = cron.inicio
  const { segundos } = fecharSessao(inicio.toMillis(), agoraMs)
  const sessoes = [...(atual.sessoes ?? []), { inicio, fim: Timestamp.fromMillis(agoraMs), seg: segundos }]
  const tempoGastoSeg = (atual.tempoGastoSeg ?? 0) + segundos
  const novos = { ...atual, sessoes, tempoGastoSeg, ...alteracoes }
  t.update(demanda.ref, {
    sessoes,
    tempoGastoSeg,
    ...camposCalculados(novos),
    ...alteracoes,
    atualizadoEm: serverTimestamp(),
  })
  return novos
}

const cronometroParado = { demandaId: null, area: null, inicio: null, rodando: false }

async function numeroNoMes(area, email, mes) {
  const snap = await getDocs(daPessoaNoMes(area, email, mes))
  return proximoNumero(snap.docs.map((d) => d.data()))
}

// Cria a demanda e já liga o cronômetro. Se havia outro rodando, ele é pausado na mesma gravação.
export async function criarEIniciar(dados, pessoa) {
  const hoje = hojeISO()
  const mes = mesDe(hoje)
  const numero = await numeroNoMes(dados.area, pessoa.email, mes)
  const ref = doc(colecao())
  await runTransaction(db, async (t) => {
    const rodando = await lerRodando(t, pessoa.email)
    if (rodando.demanda) fecharSessaoNaTransacao(t, rodando, Date.now(), { status: 'pausada' })
    const tempoMinSeg = horasParaSegundos(dados.tipoDaTabela?.minH)
    const tempoMaxSeg = horasParaSegundos(dados.tipoDaTabela?.maxH)
    t.set(ref, {
      area: dados.area,
      numero,
      mes,
      tipo: dados.tipo,
      dataSolicitacao: dados.dataSolicitacao,
      datasAjuste: [],
      dataEntrega: null,
      tempoGastoSeg: 0,
      usoIA: dados.usoIA,
      usoTemplate: dados.usoTemplate,
      solicitante: dados.solicitante,
      publico: dados.publico,
      nome: dados.nome.trim(),
      tempoMinSeg,
      tempoMaxSeg,
      ...camposCalculados({ tempoMinSeg, tempoMaxSeg, tempoGastoSeg: 0 }),
      responsavelEmail: pessoa.email,
      responsavelNome: pessoa.nome,
      status: 'em_andamento',
      sessoes: [],
      historico: [registro(pessoa.email, 'criacao')],
      importada: false,
      arquivoOrigem: '',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
    t.set(refCronometro(pessoa.email), { demandaId: ref.id, area: dados.area, inicio: serverTimestamp(), rodando: true })
  })
  esquecerHistorico(dados.area)
  return ref.id
}

// Liga o cronômetro numa demanda que já existe (pausada, em andamento ou concluída).
export function retomar(demandaId, pessoa) {
  return runTransaction(db, async (t) => {
    const rodando = await lerRodando(t, pessoa.email)
    if (rodando.demanda?.id === demandaId) return
    const alvo = await t.get(refDemanda(demandaId))
    if (rodando.demanda) fecharSessaoNaTransacao(t, rodando, Date.now(), { status: 'pausada' })
    const atual = alvo.data()
    const alteracoes = { status: 'em_andamento', atualizadoEm: serverTimestamp() }
    if (atual.status === 'concluida') {
      alteracoes.historico = [...(atual.historico ?? []), registro(pessoa.email, 'reabertura', 'status', 'Concluída', 'Em andamento')]
    }
    t.update(alvo.ref, alteracoes)
    t.set(refCronometro(pessoa.email), { demandaId, area: atual.area, inicio: serverTimestamp(), rodando: true })
  })
}

export function pausar(pessoa) {
  return runTransaction(db, async (t) => {
    const rodando = await lerRodando(t, pessoa.email)
    if (!rodando.demanda) return
    fecharSessaoNaTransacao(t, rodando, Date.now(), { status: 'pausada' })
    t.set(refCronometro(pessoa.email), cronometroParado)
  })
}

// Conclui: fecha a sessão (se estiver rodando), grava a entrega de hoje e leva as outras datas para o Ajuste.
export function concluir(demandaId, pessoa, extras = {}) {
  return runTransaction(db, async (t) => {
    const rodando = await lerRodando(t, pessoa.email)
    const estaRodando = rodando.demanda?.id === demandaId
    const alvo = estaRodando ? rodando.demanda : await t.get(refDemanda(demandaId))
    let atual = alvo.data()
    if (estaRodando) {
      // Calcula a sessão sem gravar ainda: a gravação vai junto com a conclusão, num update só.
      const { segundos } = fecharSessao(rodando.cron.inicio.toMillis(), Date.now())
      atual = {
        ...atual,
        sessoes: [...(atual.sessoes ?? []), { inicio: rodando.cron.inicio, fim: Timestamp.now(), seg: segundos }],
        tempoGastoSeg: (atual.tempoGastoSeg ?? 0) + segundos,
      }
    }
    const hoje = hojeISO()
    const datas = datasAoConcluir({
      dataSolicitacao: atual.dataSolicitacao,
      datasAjuste: atual.datasAjuste,
      dataEntregaAnterior: atual.dataEntrega,
      dias: diasTrabalhados(atual.sessoes),
      hoje,
    })
    const novos = { ...atual, ...extras, ...datas, status: 'concluida' }
    t.update(alvo.ref, {
      ...extras,
      ...datas,
      sessoes: atual.sessoes ?? [],
      tempoGastoSeg: atual.tempoGastoSeg ?? 0,
      status: 'concluida',
      ...camposCalculados(novos),
      historico: [...(atual.historico ?? []), registro(pessoa.email, 'conclusao', 'status', '', 'Concluída')],
      atualizadoEm: serverTimestamp(),
    })
    if (estaRodando) t.set(refCronometro(pessoa.email), cronometroParado)
  })
}

// Corrige o horário em que o cronômetro foi ligado (para quando esqueceu de ligar na hora).
export function corrigirInicio(pessoa, novoInicio) {
  return runTransaction(db, async (t) => {
    const rodando = await lerRodando(t, pessoa.email)
    if (!rodando.demanda) throw new Error('Nenhum cronômetro está rodando.')
    const atual = rodando.demanda.data()
    const novo = Timestamp.fromDate(novoInicio)
    t.update(rodando.demanda.ref, {
      historico: [...(atual.historico ?? []), registro(pessoa.email, 'edicao_tempo', 'inicio', horaDe(rodando.cron.inicio), horaDe(novo))],
      atualizadoEm: serverTimestamp(),
    })
    t.update(refCronometro(pessoa.email), { inicio: novo })
  })
}

// Tempo feito sem cronômetro: vira uma sessão naquela data, e a data entra no Ajuste.
export function adicionarTempoManual(demandaId, { data, segundos }, quem) {
  return runTransaction(db, async (t) => {
    const alvo = await t.get(refDemanda(demandaId))
    const atual = alvo.data()
    const inicio = Timestamp.fromDate(new Date(`${data}T08:00:00-03:00`))
    const sessao = { inicio, fim: Timestamp.fromMillis(inicio.toMillis() + segundos * 1000), seg: segundos, manual: true }
    const tempoGastoSeg = (atual.tempoGastoSeg ?? 0) + segundos
    const ajustes = new Set(atual.datasAjuste ?? [])
    if (data !== atual.dataSolicitacao && data !== atual.dataEntrega) ajustes.add(data)
    const novos = { ...atual, tempoGastoSeg, datasAjuste: [...ajustes].sort() }
    t.update(alvo.ref, {
      sessoes: [...(atual.sessoes ?? []), sessao],
      tempoGastoSeg,
      datasAjuste: novos.datasAjuste,
      ...camposCalculados(novos),
      historico: [
        ...(atual.historico ?? []),
        registro(quem, 'tempo_manual', 'tempoGastoSeg', formatarTempo(atual.tempoGastoSeg), `${formatarTempo(tempoGastoSeg)} (+${formatarTempo(segundos)} em ${formatarData(data)})`),
      ],
      atualizadoEm: serverTimestamp(),
    })
  })
}

// Reabrir: a concluída volta para "pausada" e aparece na busca do cronômetro.
export function reabrir(demanda, quem) {
  const lote = writeBatch(db)
  lote.update(refDemanda(demanda.id), {
    status: 'pausada',
    historico: [...(demanda.historico ?? []), registro(quem, 'reabertura', 'status', 'Concluída', 'Pausada')],
    atualizadoEm: serverTimestamp(),
  })
  return lote.commit()
}

// ---------- Edição ----------

const CAMPOS_EDITAVEIS = {
  nome: { rotulo: 'Nome', mostrar: (v) => v },
  tipo: { rotulo: 'Tipo', mostrar: (v) => v },
  publico: { rotulo: 'Público', mostrar: (v) => v },
  solicitante: { rotulo: 'Solicitante', mostrar: (v) => v },
  usoIA: { rotulo: 'Uso de IA', mostrar: (v) => v },
  usoTemplate: { rotulo: 'Uso de Template', mostrar: (v) => v },
  dataSolicitacao: { rotulo: 'Data de Solicitação', mostrar: formatarData },
  datasAjuste: { rotulo: 'Ajuste', mostrar: (v) => formatarAjustes(v ?? []) },
  dataEntrega: { rotulo: 'Data de Entrega', mostrar: formatarData },
  tempoGastoSeg: { rotulo: 'Tempo Gasto', mostrar: formatarTempo },
}

const iguais = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Renumera um mês da pessoa: 1, 2, 3... na ordem atual, sem buracos.
async function renumerarNoLote(lote, area, email, mes, { ignorar = [] } = {}) {
  const snap = await getDocs(daPessoaNoMes(area, email, mes))
  const lista = snap.docs
    .filter((d) => !ignorar.includes(d.id))
    .sort((a, b) => (a.data().numero ?? 0) - (b.data().numero ?? 0))
  lista.forEach((d, i) => {
    if (d.data().numero !== i + 1) lote.update(d.ref, { numero: i + 1 })
  })
  return lista.length
}

// Salva a edição: registra cada campo alterado no histórico, recalcula economia e prazo e, se a entrega
// mudar de mês, move a demanda para o fim do novo mês e renumera o mês antigo.
export async function editarDemanda(demanda, novos, quem, tiposDaArea = []) {
  const alteracoes = {}
  const registros = []
  for (const [campo, { rotulo, mostrar }] of Object.entries(CAMPOS_EDITAVEIS)) {
    if (!(campo in novos) || iguais(novos[campo], demanda[campo])) continue
    alteracoes[campo] = novos[campo]
    registros.push(registro(quem, campo === 'tempoGastoSeg' ? 'edicao_tempo' : 'edicao', rotulo, mostrar(demanda[campo]), mostrar(novos[campo])))
  }
  if (!registros.length) return false

  if ('tipo' in alteracoes) {
    const tipo = tiposDaArea.find((t) => normalizar(t.nome) === normalizar(alteracoes.tipo))
    if (tipo) {
      alteracoes.tempoMinSeg = horasParaSegundos(tipo.minH)
      alteracoes.tempoMaxSeg = horasParaSegundos(tipo.maxH)
    }
  }

  const lote = writeBatch(db)
  const resultado = { ...demanda, ...alteracoes }
  const novoMes = resultado.dataEntrega ? mesDe(resultado.dataEntrega) : demanda.mes
  if (novoMes !== demanda.mes) {
    alteracoes.mes = novoMes
    alteracoes.numero = (await numeroNoMes(demanda.area, demanda.responsavelEmail, novoMes))
    registros.push(registro(quem, 'edicao', 'Mês', demanda.mes, novoMes))
    await renumerarNoLote(lote, demanda.area, demanda.responsavelEmail, demanda.mes, { ignorar: [demanda.id] })
  }

  lote.update(refDemanda(demanda.id), {
    ...alteracoes,
    ...camposCalculados({ ...resultado, ...alteracoes }),
    historico: [...(demanda.historico ?? []), ...registros],
    atualizadoEm: serverTimestamp(),
  })
  await lote.commit()
  esquecerHistorico(demanda.area)
  return true
}

// Só admin: apaga a demanda e renumera o mês.
export async function excluirDemanda(demanda) {
  const lote = writeBatch(db)
  lote.delete(refDemanda(demanda.id))
  await renumerarNoLote(lote, demanda.area, demanda.responsavelEmail, demanda.mes, { ignorar: [demanda.id] })
  await lote.commit()
  esquecerHistorico(demanda.area)
}

// Junta duas demandas repetidas na primeira: soma tempo e sessões, mantém a entrega mais recente,
// leva as outras datas para o Ajuste, junta os históricos e apaga a segunda.
export async function juntarDemandas(principal, repetida, quem) {
  const entregas = [principal.dataEntrega, repetida.dataEntrega].filter(Boolean).sort()
  const dataEntrega = entregas.at(-1) ?? null
  const solicitacoes = [principal.dataSolicitacao, repetida.dataSolicitacao].filter(Boolean).sort()
  const dataSolicitacao = solicitacoes[0] ?? null
  const todasAsDatas = new Set([
    ...(principal.datasAjuste ?? []),
    ...(repetida.datasAjuste ?? []),
    ...entregas,
    ...solicitacoes,
  ])
  todasAsDatas.delete(dataEntrega)
  todasAsDatas.delete(dataSolicitacao)
  const tempoGastoSeg = (principal.tempoGastoSeg ?? 0) + (repetida.tempoGastoSeg ?? 0)
  const novos = { ...principal, tempoGastoSeg, dataEntrega, dataSolicitacao, datasAjuste: [...todasAsDatas].sort() }
  const historico = [
    ...[...(principal.historico ?? []), ...(repetida.historico ?? [])].sort((a, b) => (a.quando?.toMillis?.() ?? 0) - (b.quando?.toMillis?.() ?? 0)),
    registro(quem, 'juncao', 'Demanda', `${repetida.nome} (Nº ${repetida.numero}, ${formatarTempo(repetida.tempoGastoSeg)})`, `${principal.nome} (${formatarTempo(tempoGastoSeg)})`),
  ]
  const lote = writeBatch(db)
  lote.update(refDemanda(principal.id), {
    tempoGastoSeg,
    dataEntrega,
    dataSolicitacao,
    datasAjuste: novos.datasAjuste,
    sessoes: [...(principal.sessoes ?? []), ...(repetida.sessoes ?? [])],
    ...camposCalculados(novos),
    historico,
    atualizadoEm: serverTimestamp(),
  })
  lote.delete(refDemanda(repetida.id))
  await renumerarNoLote(lote, repetida.area, repetida.responsavelEmail, repetida.mes, { ignorar: [repetida.id] })
  await lote.commit()
  esquecerHistorico(principal.area)
}

// Demandas de um mês em várias áreas (uma consulta por área, como as regras exigem).
export function useDemandasDoMes(areas, mes) {
  const lista = [...(areas ?? [])].sort()
  return useConsultas(mes && lista.length && `mes/${mes}/${lista.join(',')}`, () =>
    lista.map((area) => query(colecao(), where('area', '==', area), where('mes', '==', mes))),
  )
}

// Demandas de vários meses em várias áreas (Semana e Painel).
export function useDemandasDosMeses(areas, meses) {
  const lista = [...(areas ?? [])].sort()
  const mesesOrdenados = [...new Set(meses ?? [])].sort()
  return useConsultas(mesesOrdenados.length && lista.length && `meses/${mesesOrdenados.join(',')}/${lista.join(',')}`, () =>
    lista.flatMap((area) =>
      // "in" aceita até 30 valores; períodos longos são quebrados em partes.
      Array.from({ length: Math.ceil(mesesOrdenados.length / 30) }, (_, i) =>
        query(colecao(), where('area', '==', area), where('mes', 'in', mesesOrdenados.slice(i * 30, i * 30 + 30))),
      ),
    ),
  )
}
