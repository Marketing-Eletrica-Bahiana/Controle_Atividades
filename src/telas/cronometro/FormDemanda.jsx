import { useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import CampoData from '../../componentes/CampoData.jsx'
import { ErroCampo } from '../../componentes/Campos.jsx'
import { hojeISO } from '../../lib/datas.js'
import { SITUACOES } from '../../lib/regras.js'
import { formatarTempo } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'
import { CamposDaClassificacao, CampoNoQuadro, CampoTipo, useCamposDaDemanda } from './CamposDaDemanda.jsx'

// Formulário de nova demanda. Busca nas demandas abertas da pessoa (para retomar em vez de duplicar)
// e classifica o tipo enquanto o nome é digitado.
export default function FormDemanda({ area, pessoa, abertas, ocupado, aoIniciar, aoRetomar }) {
  const campos = useCamposDaDemanda(area, pessoa)
  const [dataSolicitacao, setDataSolicitacao] = useState(hojeISO())
  const [erros, setErros] = useState({})

  const termo = normalizar(campos.nome)
  const parecidas = termo.length >= 2 ? (abertas ?? []).filter((d) => normalizar(d.nome).includes(termo)).slice(0, 5) : []
  const repetida = (abertas ?? []).find((d) => normalizar(d.nome) === termo)

  function limpar() {
    campos.limpar()
    setDataSolicitacao(hojeISO())
    setErros({})
  }

  async function iniciar(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!campos.nome.trim()) novosErros.nome = 'Informe o nome da demanda.'
    if (!campos.tipo) novosErros.tipo = 'Escolha o tipo.'
    if (!dataSolicitacao) novosErros.dataSolicitacao = 'Informe a data de solicitação.'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    const deuCerto = await aoIniciar(campos.paraGravar(dataSolicitacao))
    if (deuCerto) limpar()
  }

  async function retomarEscolhida(demanda) {
    if (await aoRetomar(demanda)) limpar()
  }

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
            value={campos.nome}
            onChange={(e) => campos.mudarNome(e.target.value)}
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

        <CampoTipo campos={campos} erro={erros.tipo} />

        <CamposDaClassificacao campos={campos}>
          <CampoData rotulo="Data de Solicitação" valor={dataSolicitacao} aoMudar={setDataSolicitacao} erro={erros.dataSolicitacao} obrigatorio />
        </CamposDaClassificacao>
        <CampoNoQuadro campos={campos} />

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
