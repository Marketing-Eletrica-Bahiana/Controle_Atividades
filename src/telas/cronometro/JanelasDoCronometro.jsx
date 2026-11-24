import { useId, useState } from 'react'
import CampoData from '../../componentes/CampoData.jsx'
import { AjudaDoTempo, CampoLista, ERRO_DO_TEMPO, ErroCampo, SimNao } from '../../componentes/Campos.jsx'
import Janela from '../../componentes/Janela.jsx'
import { useListas } from '../../dados/listas.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { agoraNoServidor } from '../../lib/relogio.js'
import { formatarTempo, lerTempoDigitado } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'
import { CampoDaPostagem, CamposDaClassificacao, CampoNoQuadro, CampoTipo, useCamposDaDemanda } from './CamposDaDemanda.jsx'

export const BotoesDaJanela = ({ aoFechar, ocupado, rotulo }) => (
  <div className="janela-modal__acoes">
    <button type="button" className="botao botao--secundario" onClick={aoFechar}>
      Cancelar
    </button>
    <button type="submit" className="botao botao--principal" disabled={ocupado}>
      {rotulo}
    </button>
  </div>
)

const MODOS_DO_TEMPO_MANUAL = [
  { id: 'nova', rotulo: 'Nova demanda' },
  { id: 'existente', rotulo: 'Demanda existente' },
]

export const TEXTOS_DO_TEMPO_MANUAL = {
  existente: 'O tempo entra como uma sessão nessa data, e a data vai para o Ajuste.',
  concluida: 'A demanda entra como concluída, no mês da Data de Entrega.',
  aberta: 'A demanda fica pausada para retomar ou concluir depois, e o tempo entra como uma sessão nessa data.',
}

// Data e tempo de um lançamento manual: as mesmas regras no Meu Cronômetro e no cartão do Quadro.
export function errosDoTempoManual(data, segundos) {
  const achados = {}
  if (!data) achados.data = 'Informe a data.'
  else if (data > hojeISO()) achados.data = 'A data não pode ser no futuro.'
  if (segundos == null) achados.tempo = ERRO_DO_TEMPO('00:45:00 ou 45:00')
  else if (segundos === 0) achados.tempo = 'O tempo precisa ser maior que zero.'
  return achados
}

// A solicitação não pode vir depois do dia do trabalho.
export function erroDaSolicitacao(dataSolicitacao, data) {
  if (!dataSolicitacao) return 'Informe a data de solicitação.'
  if (data && dataSolicitacao > data) return `A solicitação não pode ser depois de ${formatarData(data)}.`
  return ''
}

const CampoTempo = ({ rotulo, tempo, aoMudarTempo, erro }) => (
  <label className="campo">
    <span className="campo__rotulo">{rotulo}</span>
    <input value={tempo} onChange={(e) => aoMudarTempo(e.target.value)} placeholder="00:00:00" inputMode="numeric" aria-invalid={Boolean(erro)} />
    {erro ? <ErroCampo texto={erro} /> : <AjudaDoTempo texto={tempo} />}
  </label>
)

export const CamposDoTempoManual = ({ rotuloDaData, rotuloDoTempo = 'Tempo', data, aoMudarData, tempo, aoMudarTempo, erros }) => (
  <div className="grade-duas grade-duas--formulario">
    <CampoData rotulo={rotuloDaData} valor={data} aoMudar={aoMudarData} erro={erros.data} obrigatorio />
    <CampoTempo rotulo={rotuloDoTempo} tempo={tempo} aoMudarTempo={aoMudarTempo} erro={erros.tempo} />
  </div>
)

// Demanda que já existe: soma uma sessão nova (trabalho feito com o cronômetro desligado) ou corrige o total, como na
// janela Editar. Em 17/11/2026 um tempo certo digitado aqui foi somado e quase dobrou a demanda: por isso a escolha e a
// conta à vista antes de gravar.
const MODOS_DA_EXISTENTE = [
  { id: 'somar', rotulo: 'Somar ao tempo atual' },
  { id: 'corrigir', rotulo: 'Corrigir o tempo total' },
]

export function errosDaExistente(modo, data, segundos) {
  if (modo === 'somar') return errosDoTempoManual(data, segundos)
  return segundos == null ? { tempo: ERRO_DO_TEMPO('02:30:00 ou 45:00') } : {}
}

export const rotuloDoBotaoDaExistente = (modo) => (modo === 'somar' ? 'Adicionar' : 'Corrigir')

function ContaDoTempo({ atualSeg, modo, segundos }) {
  if (atualSeg == null) return null
  const atual = <strong className="numero">{formatarTempo(atualSeg)}</strong>
  if (segundos == null) return <p className="conta-do-tempo">Tempo atual: {atual}</p>
  return modo === 'somar' ? (
    <p className="conta-do-tempo">
      Tempo atual {atual} + <strong className="numero">{formatarTempo(segundos)}</strong> = <strong className="numero">{formatarTempo(atualSeg + segundos)}</strong>
    </p>
  ) : (
    <p className="conta-do-tempo">
      Tempo atual {atual} passa a ser <strong className="numero">{formatarTempo(segundos)}</strong>
    </p>
  )
}

export function CamposDaExistente({ atualSeg, modo, aoMudarModo, data, aoMudarData, tempo, aoMudarTempo, erros }) {
  const nome = useId()
  const somar = modo === 'somar'
  return (
    <>
      <fieldset className="campo">
        <legend className="campo__rotulo">O que fazer com o tempo</legend>
        <div className="opcoes">
          {MODOS_DA_EXISTENTE.map(({ id, rotulo }) => (
            <label key={id} className="opcao">
              <input type="radio" name={nome} checked={modo === id} onChange={() => aoMudarModo(id)} />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>
      {somar ? (
        <CamposDoTempoManual rotuloDaData="Data" rotuloDoTempo="Tempo a somar" data={data} aoMudarData={aoMudarData} tempo={tempo} aoMudarTempo={aoMudarTempo} erros={erros} />
      ) : (
        <div className="grade-duas grade-duas--formulario">
          <CampoTempo rotulo="Tempo total certo" tempo={tempo} aoMudarTempo={aoMudarTempo} erro={erros.tempo} />
        </div>
      )}
      <ContaDoTempo atualSeg={atualSeg} modo={modo} segundos={lerTempoDigitado(tempo)} />
      <p className="texto-suave texto-pequeno">
        {somar
          ? TEXTOS_DO_TEMPO_MANUAL.existente
          : 'O Tempo Gasto passa a ser esse, sem sessão nova e sem mexer nas datas, como na janela Editar. A mudança entra no histórico.'}
      </p>
    </>
  )
}

// Trabalho feito sem o cronômetro ligado: cria uma demanda nova já com o tempo ou soma o tempo em uma que já existe.
export function JanelaTempoManual({ aberta, aoFechar, ...resto }) {
  return (
    <Janela aberta={aberta} titulo="Adicionar tempo manual" aoFechar={aoFechar} largura={640}>
      {aberta && <FormTempoManual {...resto} aoFechar={aoFechar} />}
    </Janela>
  )
}

function FormTempoManual({ area, nomeDaArea, pessoa, demandas, abertas, aoCriar, aoSalvar, aoCorrigir, aoFechar }) {
  const campos = useCamposDaDemanda(area, pessoa)
  const [modo, setModo] = useState('nova')
  const [modoDaExistente, setModoDaExistente] = useState('somar')
  const [demandaId, setDemandaId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [tempo, setTempo] = useState('')
  const [concluida, setConcluida] = useState(true)
  // A solicitação acompanha a outra data até a pessoa mexer nela.
  const [solicitacaoEscolhida, setSolicitacaoEscolhida] = useState(undefined)
  const [tentou, setTentou] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const nova = modo === 'nova'
  const dataSolicitacao = solicitacaoEscolhida === undefined ? data : solicitacaoEscolhida
  const termo = normalizar(campos.nome)
  const repetida = nova && termo ? abertas.find((d) => normalizar(d.nome) === termo) : null
  const repetidaNaLista = repetida && demandas.some((d) => d.id === repetida.id)

  const segundos = lerTempoDigitado(tempo)
  const escolhida = demandas.find((d) => d.id === demandaId)

  function validar() {
    const achados = nova ? errosDoTempoManual(data, segundos) : errosDaExistente(modoDaExistente, data, segundos)
    if (nova) {
      if (!campos.nome.trim()) achados.nome = 'Informe o nome da demanda.'
      if (!campos.tipo) achados.tipo = 'Escolha o tipo.'
      const solicitacao = erroDaSolicitacao(dataSolicitacao, data)
      if (solicitacao) achados.dataSolicitacao = solicitacao
    } else if (!demandaId) {
      achados.demanda = 'Escolha a demanda.'
    }
    return achados
  }

  // Os erros aparecem depois da primeira tentativa e somem conforme a pessoa corrige.
  const erros = tentou ? validar() : {}

  function trocarModo(novo, id = demandaId) {
    setModo(novo)
    setDemandaId(id)
    setTentou(false)
  }

  async function enviar(evento) {
    evento.preventDefault()
    setTentou(true)
    if (repetida || Object.keys(validar()).length) return
    setOcupado(true)
    const deuCerto = nova
      ? await aoCriar(campos.paraGravar(dataSolicitacao), { data, segundos, concluida })
      : modoDaExistente === 'somar'
        ? await aoSalvar(demandaId, { data, segundos })
        : await aoCorrigir(demandaId, segundos)
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  const rotuloDaData = concluida ? 'Data de Entrega' : 'Data do trabalho'
  const texto = TEXTOS_DO_TEMPO_MANUAL[concluida ? 'concluida' : 'aberta']

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <nav className="abas abas--janela" aria-label="Para qual demanda é o tempo">
        {MODOS_DO_TEMPO_MANUAL.map(({ id, rotulo }) => (
          <button key={id} type="button" className={`abas__item ${modo === id ? 'ativo' : ''}`} aria-pressed={modo === id} onClick={() => trocarModo(id)}>
            {rotulo}
          </button>
        ))}
      </nav>
      {nova ? (
        <>
          <label className="campo">
            <span className="campo__rotulo">Nome da demanda</span>
            <input
              value={campos.nome}
              onChange={(e) => campos.mudarNome(e.target.value)}
              placeholder="Ex.: Reels Dia do Cliente"
              autoComplete="off"
              aria-invalid={Boolean(erros.nome)}
            />
            <ErroCampo texto={erros.nome} />
          </label>
          {repetida && (
            <div className="aviso aviso--erro aviso--com-acao">
              <span>
                {repetidaNaLista
                  ? 'Já existe uma demanda em aberto com esse nome. Some o tempo nela para não duplicar.'
                  : 'Essa demanda está com o cronômetro rodando. Pause o cronômetro antes de somar tempo nela.'}
              </span>
              {repetidaNaLista && (
                <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => trocarModo('existente', repetida.id)}>
                  Usar essa demanda
                </button>
              )}
            </div>
          )}
          <CampoTipo campos={campos} erro={erros.tipo} />
          <CamposDaClassificacao campos={campos}>
            <CampoData
              rotulo="Data de Solicitação"
              valor={dataSolicitacao}
              aoMudar={setSolicitacaoEscolhida}
              erro={erros.dataSolicitacao}
              obrigatorio
            />
          </CamposDaClassificacao>
        </>
      ) : (
        <label className="campo">
          <span className="campo__rotulo">Demanda</span>
          <select value={demandaId} onChange={(e) => setDemandaId(e.target.value)} aria-invalid={Boolean(erros.demanda)}>
            <option value="">Escolha a demanda</option>
            {demandas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <ErroCampo texto={erros.demanda} />
        </label>
      )}
      {nova ? (
        <>
          <CamposDoTempoManual rotuloDaData={rotuloDaData} data={data} aoMudarData={setData} tempo={tempo} aoMudarTempo={setTempo} erros={erros} />
          <label className="opcao">
            <input type="checkbox" checked={concluida} onChange={(e) => setConcluida(e.target.checked)} />
            Essa demanda já foi concluída
          </label>
          <CampoNoQuadro campos={campos} />
          <CampoDaPostagem campos={campos} />
          <p className="texto-suave texto-pequeno">
            {nomeDaArea && `Área ${nomeDaArea}. `}
            {texto}
          </p>
        </>
      ) : (
        <CamposDaExistente
          atualSeg={escolhida ? (escolhida.tempoGastoSeg ?? 0) : null}
          modo={modoDaExistente}
          aoMudarModo={setModoDaExistente}
          data={data}
          aoMudarData={setData}
          tempo={tempo}
          aoMudarTempo={setTempo}
          erros={erros}
        />
      )}
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado || Boolean(repetida)} rotulo={nova ? 'Adicionar demanda' : rotuloDoBotaoDaExistente(modoDaExistente)} />
    </form>
  )
}

// Corrige a hora em que o cronômetro foi ligado (hoje). Não pode ser no futuro.
export function JanelaCorrigirInicio({ aberta, inicioAtual, aoSalvar, aoFechar }) {
  return (
    <Janela aberta={aberta} titulo="Corrigir horário de início" aoFechar={aoFechar} largura={420}>
      {aberta && <FormCorrigirInicio inicioAtual={inicioAtual} aoSalvar={aoSalvar} aoFechar={aoFechar} />}
    </Janela>
  )
}

const horaNaBahia = (data) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(data)

function FormCorrigirInicio({ inicioAtual, aoSalvar, aoFechar }) {
  const [hora, setHora] = useState(inicioAtual ? horaNaBahia(inicioAtual) : '')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const partes = hora.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
    if (!partes) {
      setErro('Use o formato HH:MM:SS, por exemplo 08:30:00.')
      return
    }
    const dia = hojeISO(inicioAtual ?? new Date())
    const novo = new Date(`${dia}T${partes[1].padStart(2, '0')}:${partes[2]}:${partes[3] ?? '00'}-03:00`)
    if (novo.getTime() > agoraNoServidor()) {
      setErro('O início não pode ser no futuro.')
      return
    }
    setOcupado(true)
    const deuCerto = await aoSalvar(novo)
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">Ligado às</span>
        <input value={hora} onChange={(e) => setHora(e.target.value)} placeholder="HH:MM:SS" inputMode="numeric" aria-invalid={Boolean(erro)} />
        <ErroCampo texto={erro} />
      </label>
      <p className="texto-suave texto-pequeno">A mudança entra no histórico da demanda.</p>
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado} rotulo="Salvar" />
    </form>
  )
}

// Antes de concluir, completa o que ficou em branco (dá para concluir assim mesmo).
export function JanelaConcluir({ demanda, aoConcluir, aoFechar }) {
  return (
    <Janela aberta={Boolean(demanda)} titulo="Antes de concluir" aoFechar={aoFechar} largura={480}>
      {demanda && <FormConcluir demanda={demanda} aoConcluir={aoConcluir} aoFechar={aoFechar} />}
    </Janela>
  )
}

function FormConcluir({ demanda, aoConcluir, aoFechar }) {
  const { dados: listas } = useListas()
  const [extras, setExtras] = useState({ usoIA: demanda.usoIA ?? '', usoTemplate: demanda.usoTemplate ?? '', solicitante: demanda.solicitante ?? '' })
  const [ocupado, setOcupado] = useState(false)
  const mudar = (campo, valor) => setExtras((atual) => ({ ...atual, [campo]: valor }))

  async function enviar(evento) {
    evento.preventDefault()
    setOcupado(true)
    const deuCerto = await aoConcluir(demanda, extras)
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <p>
        Falta informar alguns dados de <strong>{demanda.nome}</strong>.
      </p>
      <SimNao rotulo="Uso de IA" valor={extras.usoIA} aoMudar={(v) => mudar('usoIA', v)} />
      <SimNao rotulo="Uso de Template" valor={extras.usoTemplate} aoMudar={(v) => mudar('usoTemplate', v)} />
      <CampoLista rotulo="Solicitante" valor={extras.solicitante} opcoes={listas?.solicitantes} aoMudar={(v) => mudar('solicitante', v)} />
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado} rotulo="Concluir" />
    </form>
  )
}
