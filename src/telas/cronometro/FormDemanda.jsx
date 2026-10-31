import { useMemo, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import CampoData from '../../componentes/CampoData.jsx'
import { CampoLista, ErroCampo, SimNao } from '../../componentes/Campos.jsx'
import { useHistoricoDaArea } from '../../dados/demandas.js'
import { useListas } from '../../dados/listas.js'
import { usePalavras, useTipos } from '../../dados/tipos.js'
import { classificar, prepararHistorico, textoDaOrigem } from '../../lib/classificacao.js'
import { hojeISO, mesDe } from '../../lib/datas.js'
import { regraAutomatica, SITUACOES } from '../../lib/regras.js'
import { formatarTempo, horasParaSegundos } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'

const VAZIO = { nome: '', tipo: '', publico: '', solicitante: '', usoIA: '', usoTemplate: '' }

// Formulário de nova demanda. Busca nas demandas abertas da pessoa (para retomar em vez de duplicar)
// e classifica o tipo enquanto o nome é digitado. Campos mexidos à mão param de mudar sozinhos.
export default function FormDemanda({ area, pessoa, abertas, ocupado, aoIniciar, aoRetomar }) {
  const { dados: tipos } = useTipos(area)
  const { dados: palavras } = usePalavras(area)
  const { dados: listas } = useListas()
  const historicoBruto = useHistoricoDaArea(area)
  const historico = useMemo(() => prepararHistorico(historicoBruto ?? []), [historicoBruto])

  const [dados, setDados] = useState({ ...VAZIO, dataSolicitacao: hojeISO() })
  const [manual, setManual] = useState({})
  const [erros, setErros] = useState({})

  const classificacao = useMemo(
    () => classificar(dados.nome, { historico, palavras: palavras ?? [], tipos: tipos ?? [], email: pessoa.email, mesAtual: mesDe(hojeISO()) }),
    [dados.nome, historico, palavras, tipos, pessoa.email],
  )
  const tipo = manual.tipo ? dados.tipo : classificacao.tipo
  const tipoDaTabela = tipos?.find((t) => t.nome === tipo)
  const regra = regraAutomatica(dados.nome, tipo)
  const valor = (campo) => (manual[campo] ? dados[campo] : (regra?.[campo] ?? dados[campo]))
  const publico = manual.publico ? dados.publico : (tipoDaTabela?.publico ?? dados.publico)

  const mudar = (campo, novo) => {
    setDados((atual) => ({ ...atual, [campo]: novo }))
    setManual((atual) => ({ ...atual, [campo]: true }))
  }
  // Trocar o tipo à mão para a sugestão automática e faz o Público acompanhar o tipo novo.
  const escolherTipo = (novo) => {
    setDados((atual) => ({ ...atual, tipo: novo }))
    setManual((atual) => ({ ...atual, tipo: true, publico: false }))
  }

  const termo = normalizar(dados.nome)
  const parecidas = termo.length >= 2 ? (abertas ?? []).filter((d) => normalizar(d.nome).includes(termo)).slice(0, 5) : []
  const repetida = (abertas ?? []).find((d) => normalizar(d.nome) === termo)

  function limpar() {
    setDados({ ...VAZIO, dataSolicitacao: hojeISO() })
    setManual({})
    setErros({})
  }

  async function iniciar(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!dados.nome.trim()) novosErros.nome = 'Informe o nome da demanda.'
    if (!tipo) novosErros.tipo = 'Escolha o tipo.'
    if (!dados.dataSolicitacao) novosErros.dataSolicitacao = 'Informe a data de solicitação.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    const deuCerto = await aoIniciar({
      area,
      nome: dados.nome.trim(),
      tipo,
      tipoDaTabela,
      publico,
      solicitante: valor('solicitante'),
      usoIA: valor('usoIA'),
      usoTemplate: valor('usoTemplate'),
      dataSolicitacao: dados.dataSolicitacao,
    })
    if (deuCerto) limpar()
  }

  async function retomarEscolhida(demanda) {
    if (await aoRetomar(demanda)) limpar()
  }

  const semTipo = dados.nome.trim() && !tipo
  return (
    <section className="bloco">
      <h2 className="bloco__titulo">Nova demanda</h2>
      <form className="formulario" onSubmit={iniciar} noValidate>
        <div className="campo campo-busca-demanda">
          <label className="campo__rotulo" htmlFor="nome-demanda">
            Nome da demanda
          </label>
          <input
            id="nome-demanda"
            value={dados.nome}
            onChange={(e) => setDados((atual) => ({ ...atual, nome: e.target.value }))}
            placeholder="Ex.: Reels Dia do Cliente"
            autoComplete="off"
            aria-invalid={Boolean(erros.nome)}
          />
          <ErroCampo texto={erros.nome} />
          {parecidas.length > 0 && (
            <ul className="sugestoes-retomar" aria-label="Demandas em aberto com nome parecido">
              {parecidas.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => retomarEscolhida(d)} disabled={ocupado}>
                    <RotateCcw aria-hidden="true" />
                    <span>
                      Retomar <strong>{d.nome}</strong>
                    </span>
                    <span className={`etiqueta-situacao ${SITUACOES[d.status]?.classe}`}>{SITUACOES[d.status]?.rotulo}</span>
                    <span className="numero">{formatarTempo(d.tempoGastoSeg)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {repetida && <p className="aviso aviso--erro">Já existe uma demanda em aberto com esse nome. Retome a de cima para não duplicar.</p>}
        </div>

        <div className={`campo campo-tipo ${semTipo ? 'campo-tipo--faltando' : ''}`}>
          <label className="campo__rotulo" htmlFor="tipo-demanda">
            Tipo
          </label>
          <select id="tipo-demanda" value={tipo} onChange={(e) => escolherTipo(e.target.value)} aria-invalid={Boolean(semTipo || erros.tipo)}>
            <option value="">Escolha o tipo</option>
            {(tipos ?? []).map((t) => (
              <option key={t.id} value={t.nome}>
                {t.nome}
              </option>
            ))}
          </select>
          <ErroCampo texto={erros.tipo} />
          {!manual.tipo && classificacao.origem && <span className="campo__ajuda">{textoDaOrigem(classificacao)}</span>}
          {manual.tipo && tipo && <span className="campo__ajuda">Escolhido por você</span>}
          {!manual.tipo && classificacao.alternativas.length > 0 && (
            <div className="alternativas" aria-label="Outros tipos possíveis">
              {classificacao.alternativas.map((alternativa) => (
                <button key={alternativa} type="button" className="etiqueta-clicavel" onClick={() => escolherTipo(alternativa)}>
                  {alternativa}
                </button>
              ))}
            </div>
          )}
          {tipoDaTabela && (
            <span className="campo__ajuda">
              Estimativa sem IA: {formatarTempo(horasParaSegundos(tipoDaTabela.minH))} a {formatarTempo(horasParaSegundos(tipoDaTabela.maxH))}
            </span>
          )}
        </div>

        <div className="grade-tres">
          <CampoLista rotulo="Público" valor={publico} opcoes={listas?.publicos} aoMudar={(v) => mudar('publico', v)} />
          <CampoLista rotulo="Solicitante" valor={valor('solicitante')} opcoes={listas?.solicitantes} aoMudar={(v) => mudar('solicitante', v)} />
          <CampoData
            rotulo="Data de Solicitação"
            valor={dados.dataSolicitacao}
            aoMudar={(v) => setDados((atual) => ({ ...atual, dataSolicitacao: v }))}
            erro={erros.dataSolicitacao}
            obrigatorio
          />
          <SimNao rotulo="Uso de IA" valor={valor('usoIA')} aoMudar={(v) => mudar('usoIA', v)} />
          <SimNao rotulo="Uso de Template" valor={valor('usoTemplate')} aoMudar={(v) => mudar('usoTemplate', v)} />
        </div>
        {regra && <p className="campo__ajuda">Uso de IA, Template e Solicitante preenchidos pela regra: {regra.motivo}.</p>}

        <div className="acoes acoes--fim">
          <button type="submit" className="botao botao--principal botao--grande-largo" disabled={ocupado || Boolean(repetida)}>
            <Play aria-hidden="true" />
            Iniciar
          </button>
        </div>
      </form>
    </section>
  )
}
