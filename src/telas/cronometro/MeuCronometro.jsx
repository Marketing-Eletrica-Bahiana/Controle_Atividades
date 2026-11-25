import { useMemo, useState } from 'react'
import { Timer } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import JanelaEditarDemanda from '../../componentes/JanelaEditarDemanda.jsx'
import { useAreas } from '../../dados/areas.js'
import { criarCartaoDaDemanda, useColunas } from '../../dados/cartoes.js'
import {
  adicionarTempoManual, concluir, corrigirInicio, criarDemandaManual, criarEIniciar, pausar, reabrir, retomar, trocarTempoGasto, useCronometro,
  useMinhasDemandas,
} from '../../dados/demandas.js'
import { useAgora } from '../../hooks/useAgora.js'
import { formatarData, formatarMes, hojeISO, mesDe } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { entraNoCalendario } from '../../lib/postagens.js'
import { ativosDoCronometro } from '../../lib/cronometro.js'
import { horasDeTrabalho, segundosPorDia } from '../../lib/semana.js'
import { COLUNAS_PADRAO } from '../../lib/quadro.js'
import { formatarTempo } from '../../lib/tempo.js'
import CartaoCronometro from './CartaoCronometro.jsx'
import { escolherComoIniciar } from './escolherComoIniciar.js'
import FormDemanda from './FormDemanda.jsx'
import { JanelaConcluir, JanelaCorrigirInicio, JanelaTempoManual } from './JanelasDoCronometro.jsx'
import ListaDeHoje from './ListaDeHoje.jsx'

const diaDaSessao = (sessao) => (sessao.inicio?.toDate ? hojeISO(sessao.inicio.toDate()) : null)

// Só admin e equipe. Cada pessoa lê apenas o próprio cronômetro (cronometros/{email}).
export default function MeuCronometro() {
  const { membro } = useAcesso()
  const pessoa = useMemo(() => ({ email: membro.email, nome: membro.nome }), [membro.email, membro.nome])
  const { avisar, executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const { dados: todasAsAreas } = useAreas()
  const colunas = useColunas()

  const minhasAreas = (membro.areas ?? [])
    .map((id) => todasAsAreas?.find((a) => a.id === id) ?? { id, nome: id, ativa: true })
    .filter((a) => a.ativa !== false)
  const [areaEscolhida, setAreaEscolhida] = useState('')
  const area = minhasAreas.some((a) => a.id === areaEscolhida) ? areaEscolhida : (minhasAreas[0]?.id ?? '')

  const hoje = hojeISO()
  const cronometro = useCronometro(membro.email)
  const minhas = useMinhasDemandas(minhasAreas.map((a) => a.id), membro.email, mesDe(hoje))
  // Várias demandas podem rodar ao mesmo tempo (desde 25/11/2026). Cada uma tem o próprio início.
  const ativos = useMemo(() => ativosDoCronometro(cronometro.dados), [cronometro.dados])
  const rodandoIds = useMemo(() => new Set(ativos.map((a) => a.demandaId)), [ativos])
  const agora = useAgora(ativos.length > 0)
  const decorridoDe = (id) => {
    const inicio = ativos.find((a) => a.demandaId === id)?.inicio?.toDate?.()
    return inicio ? Math.max(0, Math.floor((agora - inicio.getTime()) / 1000)) : 0
  }

  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState(null)
  const [concluindo, setConcluindo] = useState(null)
  const [tempoManual, setTempoManual] = useState(false)
  const [corrigindo, setCorrigindo] = useState(null)

  const todas = minhas.dados ?? []
  const rodando = ativos
    .map((a) => ({ demanda: todas.find((d) => d.id === a.demandaId), inicio: a.inicio?.toDate?.() ?? null, decorrido: decorridoDe(a.demandaId) }))
    .filter((r) => r.demanda)
  // Horas de trabalho do dia: cada demanda soma o próprio tempo, mas o trecho em que rodaram juntas conta uma vez só.
  const itensDeHoje = todas
    .map((d) => ({ dia: hoje, demanda: d, segundos: (segundosPorDia(d).get(hoje) ?? 0) + (rodandoIds.has(d.id) ? decorridoDe(d.id) : 0) }))
    .filter((i) => i.segundos > 0)
  const vivos = rodando
    .filter((r) => r.inicio && hojeISO(r.inicio) === hoje)
    .map((r) => ({ email: membro.email, dia: hoje, inicio: r.inicio.getTime(), fim: agora }))
  const totalDoDia = horasDeTrabalho(itensDeHoje, vivos)
  const daArea = todas.filter((d) => d.area === area)
  const abertas = daArea.filter((d) => d.status !== 'concluida')
  const deHoje = daArea
    .filter((d) => d.status !== 'concluida' || d.dataEntrega === hoje || (d.sessoes ?? []).some((s) => diaDaSessao(s) === hoje))
    .sort((a, b) => rodandoIds.has(b.id) - rodandoIds.has(a.id) || (a.status === 'concluida') - (b.status === 'concluida') || (b.numero ?? 0) - (a.numero ?? 0))
  const nomeDaArea = (id) => minhasAreas.find((a) => a.id === id)?.nome ?? id

  async function agir(acao, mensagem) {
    setOcupado(true)
    const deuCerto = await executar(acao, mensagem)
    setOcupado(false)
    return deuCerto
  }

  // Com outra demanda rodando, a pessoa escolhe: rodar junto ou pausar a(s) outra(s). null quando cancela.
  const comoIniciar = (nomeNovo) => escolherComoIniciar(confirmar, nomeNovo, rodando.map((r) => r.demanda.nome))

  // O cartão vem depois da demanda: se ele falhar, o tempo continua valendo e a pessoa é avisada.
  async function criarCartaoDe(demandaId, dados, concluidaEm = null) {
    if (!dados.noQuadro) return
    try {
      await criarCartaoDaDemanda(demandaId, dados, pessoa, colunas.dados ?? COLUNAS_PADRAO, { concluidaEm })
    } catch (erro) {
      avisar(`A demanda foi criada, mas o cartão do Quadro não: ${mensagemDeErro(erro)}`, 'erro')
    }
  }

  const noCalendario = (dados) => (dados.postagem?.data && entraNoCalendario(dados) ? ` No calendário em ${formatarData(dados.postagem.data)}.` : '')

  async function iniciarNova(dados) {
    const escolha = await comoIniciar(dados.nome)
    if (!escolha) return false
    return agir(async () => {
      const id = await criarEIniciar(dados, pessoa, escolha)
      await criarCartaoDe(id, dados)
    }, `Cronômetro rodando: ${dados.nome}.${noCalendario(dados)}`)
  }

  async function retomarDemanda(demanda) {
    if (rodandoIds.has(demanda.id)) return true
    const escolha = await comoIniciar(demanda.nome)
    if (!escolha) return false
    return agir(() => retomar(demanda.id, pessoa, escolha), `Cronômetro rodando: ${demanda.nome}`)
  }

  function pedirConclusao(demanda) {
    if (!demanda.usoIA || !demanda.usoTemplate || !demanda.solicitante) setConcluindo(demanda)
    else agir(() => concluir(demanda.id, pessoa), `${demanda.nome} concluída. Mandou bem!`)
  }

  // Concluída em outro dia não entra na lista de hoje, então o aviso diz onde encontrar.
  function registrarManual(dados, lancamento) {
    const foraDaLista = lancamento.concluida && lancamento.data !== hoje
    const mensagem = foraDaLista
      ? `${dados.nome} registrada. Veja em Demandas, ${formatarMes(mesDe(lancamento.data))}.`
      : `${dados.nome} registrada. Mandou bem!`
    return agir(async () => {
      const id = await criarDemandaManual(dados, lancamento, pessoa)
      await criarCartaoDe(id, dados, lancamento.concluida ? lancamento.data : null)
    }, `${mensagem}${noCalendario(dados)}`)
  }

  async function reabrirDemanda(demanda) {
    const sim = await confirmar({
      titulo: 'Reabrir demanda?',
      texto: `"${demanda.nome}" volta para pausada. O tempo novo soma na mesma demanda e a entrega passa a ser a data em que concluir de novo.`,
      botao: 'Reabrir',
    })
    if (sim) agir(() => reabrir(demanda, membro.email), 'Demanda reaberta.')
  }

  if (!minhasAreas.length) {
    return (
      <EstadoVazio
        titulo="Você ainda não está em nenhuma área"
        texto="Peça para a administração incluir você em uma área em Administração, Pessoas. Aí é só voltar aqui e começar!"
      />
    )
  }

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <Timer aria-hidden="true" />
          Meu Cronômetro
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <CartaoCronometro
        rodando={rodando}
        totalDoDia={totalDoDia}
        variasAreas={minhasAreas.length > 1}
        nomeDaArea={(id) => (minhasAreas.length > 1 ? nomeDaArea(id) : '')}
        ocupado={ocupado}
        aoPausar={(demanda) => agir(() => pausar(pessoa, demanda.id), `${demanda.nome} pausada.`)}
        aoConcluir={pedirConclusao}
        aoCorrigir={(r) => setCorrigindo(r)}
      />

      {minhasAreas.length > 1 && (
        <nav className="abas" aria-label="Minhas áreas">
          {minhasAreas.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`abas__item ${a.id === area ? 'ativo' : ''}`}
              aria-pressed={a.id === area}
              onClick={() => setAreaEscolhida(a.id)}
            >
              {a.nome}
            </button>
          ))}
        </nav>
      )}

      {minhas.erro && <p className="aviso aviso--erro">{mensagemDeErro(minhas.erro)}</p>}

      <FormDemanda key={area} area={area} pessoa={pessoa} abertas={abertas} ocupado={ocupado} aoIniciar={iniciarNova} aoRetomar={retomarDemanda} />

      {minhas.carregando ? (
        <CarregandoBloco />
      ) : (
        <ListaDeHoje
          demandas={deHoje}
          rodandoIds={rodandoIds}
          decorridoDe={decorridoDe}
          ocupado={ocupado}
          aoRetomar={retomarDemanda}
          aoConcluir={pedirConclusao}
          aoEditar={setEditando}
          aoReabrir={reabrirDemanda}
          aoTempoManual={() => setTempoManual(true)}
        />
      )}

      <JanelaEditarDemanda demanda={editando} aoFechar={() => setEditando(null)} />
      <JanelaConcluir
        demanda={concluindo}
        aoConcluir={(demanda, extras) => agir(() => concluir(demanda.id, pessoa, extras), `${demanda.nome} concluída. Mandou bem!`)}
        aoFechar={() => setConcluindo(null)}
      />
      <JanelaTempoManual
        aberta={tempoManual}
        area={area}
        nomeDaArea={minhasAreas.length > 1 ? nomeDaArea(area) : ''}
        pessoa={pessoa}
        demandas={[...daArea].filter((d) => !rodandoIds.has(d.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))}
        abertas={abertas}
        aoCriar={registrarManual}
        aoSalvar={(id, dados) => agir(() => adicionarTempoManual(id, dados, membro.email), 'Tempo adicionado.')}
        aoCorrigir={(id, segundos) => agir(() => trocarTempoGasto(id, segundos, membro.email), `Tempo corrigido para ${formatarTempo(segundos)}.`)}
        aoFechar={() => setTempoManual(false)}
      />
      <JanelaCorrigirInicio
        aberta={Boolean(corrigindo)}
        nome={corrigindo?.demanda.nome}
        inicioAtual={corrigindo?.inicio ?? null}
        aoSalvar={(novo) => agir(() => corrigirInicio(pessoa, corrigindo.demanda.id, novo), 'Horário de início corrigido.')}
        aoFechar={() => setCorrigindo(null)}
      />
      {janelaConfirmar}
    </section>
  )
}
