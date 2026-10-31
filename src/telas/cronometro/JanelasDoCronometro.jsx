import { useState } from 'react'
import CampoData from '../../componentes/CampoData.jsx'
import { CampoLista, ErroCampo, SimNao } from '../../componentes/Campos.jsx'
import Janela from '../../componentes/Janela.jsx'
import { useListas } from '../../dados/listas.js'
import { hojeISO } from '../../lib/datas.js'
import { lerTempo } from '../../lib/tempo.js'

const BotoesDaJanela = ({ aoFechar, ocupado, rotulo }) => (
  <div className="janela-modal__acoes">
    <button type="button" className="botao botao--secundario" onClick={aoFechar}>
      Cancelar
    </button>
    <button type="submit" className="botao botao--principal" disabled={ocupado}>
      {rotulo}
    </button>
  </div>
)

// Tempo feito sem o cronômetro ligado: escolhe a demanda, a data e o tempo.
export function JanelaTempoManual({ aberta, demandas, aoSalvar, aoFechar }) {
  return (
    <Janela aberta={aberta} titulo="Adicionar tempo manual" aoFechar={aoFechar} largura={520}>
      {aberta && <FormTempoManual demandas={demandas} aoSalvar={aoSalvar} aoFechar={aoFechar} />}
    </Janela>
  )
}

function FormTempoManual({ demandas, aoSalvar, aoFechar }) {
  const [demandaId, setDemandaId] = useState('')
  const [data, setData] = useState(hojeISO())
  const [tempo, setTempo] = useState('')
  const [erros, setErros] = useState({})
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const segundos = lerTempo(tempo)
    const novosErros = {}
    if (!demandaId) novosErros.demanda = 'Escolha a demanda.'
    if (!data) novosErros.data = 'Informe a data.'
    else if (data > hojeISO()) novosErros.data = 'A data não pode ser no futuro.'
    if (segundos == null) novosErros.tempo = 'Use o formato HH:MM:SS, por exemplo 00:45:00.'
    else if (segundos === 0) novosErros.tempo = 'O tempo precisa ser maior que zero.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    setOcupado(true)
    const deuCerto = await aoSalvar(demandaId, { data, segundos })
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
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
      <div className="grade-duas grade-duas--formulario">
        <CampoData rotulo="Data" valor={data} aoMudar={setData} erro={erros.data} obrigatorio />
        <label className="campo">
          <span className="campo__rotulo">Tempo</span>
          <input value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="00:00:00" inputMode="numeric" aria-invalid={Boolean(erros.tempo)} />
          <ErroCampo texto={erros.tempo} />
        </label>
      </div>
      <p className="texto-suave texto-pequeno">O tempo entra como uma sessão nessa data, e a data vai para o Ajuste.</p>
      <BotoesDaJanela aoFechar={aoFechar} ocupado={ocupado} rotulo="Adicionar" />
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
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', hour12: false }).format(data)

function FormCorrigirInicio({ inicioAtual, aoSalvar, aoFechar }) {
  const [hora, setHora] = useState(inicioAtual ? horaNaBahia(inicioAtual) : '')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    const partes = hora.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
    if (!partes) {
      setErro('Use o formato HH:MM, por exemplo 08:30.')
      return
    }
    const dia = hojeISO(inicioAtual ?? new Date())
    const novo = new Date(`${dia}T${partes[1].padStart(2, '0')}:${partes[2]}:00-03:00`)
    if (novo.getTime() > Date.now()) {
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
        <input value={hora} onChange={(e) => setHora(e.target.value)} placeholder="HH:MM" inputMode="numeric" aria-invalid={Boolean(erro)} />
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
