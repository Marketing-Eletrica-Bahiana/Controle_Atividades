import { useState } from 'react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { editarDemanda } from '../dados/demandas.js'
import { useListas } from '../dados/listas.js'
import { useTipos } from '../dados/tipos.js'
import { formatarAjustes, lerAjustes } from '../lib/datas.js'
import { formatarTempo, lerTempo } from '../lib/tempo.js'
import { useAvisos } from './Avisos.jsx'
import CampoData from './CampoData.jsx'
import { CampoLista, ErroCampo, SimNao } from './Campos.jsx'
import Janela from './Janela.jsx'

// Janela de edição usada no Meu Cronômetro, em Demandas e em Semana. Vale também para concluídas e importadas.
export default function JanelaEditarDemanda({ demanda, aoFechar }) {
  return (
    <Janela aberta={Boolean(demanda)} titulo="Editar demanda" aoFechar={aoFechar} largura={640}>
      {demanda && <Formulario key={demanda.id} demanda={demanda} aoFechar={aoFechar} />}
    </Janela>
  )
}

function Formulario({ demanda, aoFechar }) {
  const { membro } = useAcesso()
  const { avisar, executar } = useAvisos()
  const { dados: tipos } = useTipos(demanda.area)
  const { dados: listas } = useListas()
  const [dados, setDados] = useState({
    nome: demanda.nome ?? '',
    tipo: demanda.tipo ?? '',
    publico: demanda.publico ?? '',
    solicitante: demanda.solicitante ?? '',
    usoIA: demanda.usoIA ?? '',
    usoTemplate: demanda.usoTemplate ?? '',
    dataSolicitacao: demanda.dataSolicitacao ?? null,
    ajustes: formatarAjustes(demanda.datasAjuste ?? []),
    dataEntrega: demanda.dataEntrega ?? null,
    tempo: formatarTempo(demanda.tempoGastoSeg ?? 0),
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }))

  function trocarTipo(nome) {
    const tipo = tipos?.find((t) => t.nome === nome)
    setDados((atual) => ({ ...atual, tipo: nome, publico: tipo?.publico || atual.publico }))
  }

  async function salvar(evento) {
    evento.preventDefault()
    const ano = Number((dados.dataEntrega ?? dados.dataSolicitacao ?? demanda.mes ?? '').slice(0, 4)) || new Date().getFullYear()
    const tempoGastoSeg = lerTempo(dados.tempo)
    const datasAjuste = dados.ajustes.trim() ? lerAjustes(dados.ajustes, ano) : []
    const novosErros = {}
    if (!dados.nome.trim()) novosErros.nome = 'Informe o nome da demanda.'
    if (!dados.tipo) novosErros.tipo = 'Escolha o tipo.'
    if (tempoGastoSeg == null) novosErros.tempo = 'Use o formato HH:MM:SS, por exemplo 01:30:00.'
    if (!datasAjuste) novosErros.ajustes = 'Use datas como 14/09/2026 ou "14 e 15/09".'
    if (dados.dataSolicitacao && dados.dataEntrega && dados.dataEntrega < dados.dataSolicitacao) {
      novosErros.dataEntrega = 'A entrega não pode ser antes da solicitação.'
    }
    if (demanda.status === 'concluida' && !dados.dataEntrega) novosErros.dataEntrega = 'Demanda concluída precisa da data de entrega.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    const ajustesLimpos = [...new Set(datasAjuste)].filter((d) => d !== dados.dataSolicitacao && d !== dados.dataEntrega).sort()
    setSalvando(true)
    let mudou = false
    const deuCerto = await executar(async () => {
      mudou = await editarDemanda(
        demanda,
        {
          nome: dados.nome.trim(),
          tipo: dados.tipo,
          publico: dados.publico,
          solicitante: dados.solicitante,
          usoIA: dados.usoIA,
          usoTemplate: dados.usoTemplate,
          dataSolicitacao: dados.dataSolicitacao,
          datasAjuste: ajustesLimpos,
          dataEntrega: dados.dataEntrega,
          tempoGastoSeg,
        },
        membro.email,
        tipos ?? [],
      )
    })
    setSalvando(false)
    if (deuCerto) avisar(mudou ? 'Demanda atualizada.' : 'Nada foi alterado.')
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={salvar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">Nome da Demanda</span>
        <input value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} aria-invalid={Boolean(erros.nome)} />
        <ErroCampo texto={erros.nome} />
      </label>
      <div className="grade-duas grade-duas--formulario">
        <CampoLista rotulo="Tipo" valor={dados.tipo} opcoes={(tipos ?? []).map((t) => t.nome)} aoMudar={trocarTipo} vazio="Escolha o tipo" erro={erros.tipo} />
        <CampoLista rotulo="Público" valor={dados.publico} opcoes={listas?.publicos} aoMudar={(v) => mudar('publico', v)} />
        <CampoLista rotulo="Solicitante" valor={dados.solicitante} opcoes={listas?.solicitantes} aoMudar={(v) => mudar('solicitante', v)} />
        <label className="campo">
          <span className="campo__rotulo">Tempo Gasto</span>
          <input value={dados.tempo} onChange={(e) => mudar('tempo', e.target.value)} placeholder="00:00:00" inputMode="numeric" aria-invalid={Boolean(erros.tempo)} />
          <ErroCampo texto={erros.tempo} />
        </label>
        <SimNao rotulo="Uso de IA" valor={dados.usoIA} aoMudar={(v) => mudar('usoIA', v)} />
        <SimNao rotulo="Uso de Template" valor={dados.usoTemplate} aoMudar={(v) => mudar('usoTemplate', v)} />
        <CampoData rotulo="Data de Solicitação" valor={dados.dataSolicitacao} aoMudar={(v) => mudar('dataSolicitacao', v)} />
        <CampoData rotulo="Data de Entrega" valor={dados.dataEntrega} aoMudar={(v) => mudar('dataEntrega', v)} erro={erros.dataEntrega} />
      </div>
      <label className="campo">
        <span className="campo__rotulo">Datas de Ajuste</span>
        <input value={dados.ajustes} onChange={(e) => mudar('ajustes', e.target.value)} placeholder="Ex.: 14 e 15/09 ou 14/09/2026" aria-invalid={Boolean(erros.ajustes)} />
        <ErroCampo texto={erros.ajustes} />
      </label>
      <p className="texto-suave texto-pequeno">
        Ao salvar, o tempo economizado e o prazo são recalculados e cada mudança entra no histórico. Se a entrega mudar de mês,
        o Nº é refeito.
      </p>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>
          Salvar
        </button>
      </div>
    </form>
  )
}
