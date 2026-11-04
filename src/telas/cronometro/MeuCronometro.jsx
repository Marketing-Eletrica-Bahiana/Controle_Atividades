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
  adicionarTempoManual, concluir, corrigirInicio, criarDemandaManual, criarEIniciar, pausar, reabrir, retomar, useCronometro, useMinhasDemandas,
} from '../../dados/demandas.js'
import { useAgora } from '../../hooks/useAgora.js'
import { formatarData, formatarMes, hojeISO, mesDe } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { COLUNAS_PADRAO } from '../../lib/quadro.js'
import CartaoCronometro from './CartaoCronometro.jsx'
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
  const rodandoId = cronometro.dados?.rodando ? cronometro.dados.demandaId : null
  const inicio = cronometro.dados?.rodando ? cronometro.dados.inicio?.toDate?.() : null
  const agora = useAgora(Boolean(rodandoId))
  const decorrido = inicio ? Math.max(0, Math.floor((agora - inicio.getTime()) / 1000)) : 0

  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState(null)
  const [concluindo, setConcluindo] = useState(null)
  const [tempoManual, setTempoManual] = useState(false)
  const [corrigindo, setCorrigindo] = useState(false)

  const todas = minhas.dados ?? []
  const demandaRodando = todas.find((d) => d.id === rodandoId)
  const totalDoDia =
    todas.reduce((soma, d) => soma + (d.sessoes ?? []).filter((s) => diaDaSessao(s) === hoje).reduce((s, x) => s + (x.seg ?? 0), 0), 0) + decorrido
  const daArea = todas.filter((d) => d.area === area)
  const abertas = daArea.filter((d) => d.status !== 'concluida')
  const deHoje = daArea
    .filter((d) => d.status !== 'concluida' || d.dataEntrega === hoje || (d.sessoes ?? []).some((s) => diaDaSessao(s) === hoje))
    .sort((a, b) => (b.id === rodandoId) - (a.id === rodandoId) || (a.status === 'concluida') - (b.status === 'concluida') || (b.numero ?? 0) - (a.numero ?? 0))
  const nomeDaArea = (id) => minhasAreas.find((a) => a.id === id)?.nome ?? id

  async function agir(acao, mensagem) {
    setOcupado(true)
    const deuCerto = await executar(acao, mensagem)
    setOcupado(false)
    return deuCerto
  }

  // Um cronômetro por pessoa: antes de ligar outro, pergunta se pode pausar o atual.
  async function podeTrocar(nomeNovo) {
    if (!demandaRodando) return true
    return confirmar({
      titulo: 'Pausar o cronômetro atual?',
      texto: `"${demandaRodando.nome}" está rodando. Ela será pausada para começar "${nomeNovo}".`,
      botao: 'Pausar e começar',
    })
  }

  // O cartão vem depois da demanda: se ele falhar, o tempo continua valendo e a pessoa é avisada.
  async function criarCartaoDe(demandaId, dados, concluidaEm = null) {
    if (!dados.noQuadro) return
    try {
      await criarCartaoDaDemanda(demandaId, dados, pessoa, colunas.dados ?? COLUNAS_PADRAO, { concluidaEm })
    } catch (erro) {
      avisar(`A demanda foi criada, mas o cartão do Quadro não: ${mensagemDeErro(erro)}`, 'erro')
    }
  }

  const noCalendario = (dados) => (dados.postagem?.data ? ` No calendário em ${formatarData(dados.postagem.data)}.` : '')

  async function iniciarNova(dados) {
    if (!(await podeTrocar(dados.nome))) return false
    return agir(async () => {
      const id = await criarEIniciar(dados, pessoa)
      await criarCartaoDe(id, dados)
    }, `Cronômetro rodando: ${dados.nome}.${noCalendario(dados)}`)
  }

  async function retomarDemanda(demanda) {
    if (demanda.id === rodandoId) return true
    if (!(await podeTrocar(demanda.nome))) return false
    return agir(() => retomar(demanda.id, pessoa), `Cronômetro rodando: ${demanda.nome}`)
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
        demanda={demandaRodando}
        decorrido={decorrido}
        totalDoDia={totalDoDia}
        nomeDaArea={minhasAreas.length > 1 && demandaRodando ? nomeDaArea(demandaRodando.area) : ''}
        ocupado={ocupado}
        aoPausar={() => agir(() => pausar(pessoa), 'Cronômetro pausado.')}
        aoConcluir={pedirConclusao}
        aoCorrigir={() => setCorrigindo(true)}
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
          rodandoId={rodandoId}
          decorrido={decorrido}
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
        demandas={[...daArea].filter((d) => d.id !== rodandoId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))}
        abertas={abertas}
        aoCriar={registrarManual}
        aoSalvar={(id, dados) => agir(() => adicionarTempoManual(id, dados, membro.email), 'Tempo adicionado.')}
        aoFechar={() => setTempoManual(false)}
      />
      <JanelaCorrigirInicio
        aberta={corrigindo}
        inicioAtual={inicio}
        aoSalvar={(novo) => agir(() => corrigirInicio(pessoa, novo), 'Horário de início corrigido.')}
        aoFechar={() => setCorrigindo(false)}
      />
      {janelaConfirmar}
    </section>
  )
}
