import { CircleCheck, Pencil, Play, RotateCcw } from 'lucide-react'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import { SITUACOES } from '../../lib/regras.js'
import { formatarTempo } from '../../lib/tempo.js'

export default function ListaDeHoje({ demandas, rodandoId, decorrido, ocupado, aoRetomar, aoConcluir, aoEditar, aoReabrir, aoTempoManual }) {
  return (
    <section className="bloco">
      <div className="bloco__cabecalho">
        <h2 className="bloco__titulo">Minhas demandas de hoje</h2>
        <button type="button" className="botao botao--secundario" onClick={aoTempoManual}>
          Adicionar tempo manual
        </button>
      </div>
      {!demandas.length ? (
        <EstadoVazio
          titulo="Bora começar o dia?"
          texto="Digite o nome da primeira demanda ali em cima e aperte Iniciar. Cada minuto registrado mostra a força do seu trabalho!"
          mascote="ebinho"
        />
      ) : (
        <table className="tabela tabela--com-titulo">
          <thead>
            <tr>
              <th>Nome da Demanda</th>
              <th>Tipo</th>
              <th>Tempo</th>
              <th>Situação</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {demandas.map((d) => {
              const rodando = d.id === rodandoId
              const situacao = SITUACOES[d.status] ?? SITUACOES.pausada
              return (
                <tr key={d.id} className={rodando ? 'linha-rodando' : ''}>
                  <td className="tabela__titulo">
                    <span className="nome-demanda" title={d.nome}>
                      {d.nome}
                    </span>
                  </td>
                  <td data-rotulo="Tipo">{d.tipo || <span className="texto-alerta">Sem tipo</span>}</td>
                  <td data-rotulo="Tempo" className="numero">
                    {formatarTempo((d.tempoGastoSeg ?? 0) + (rodando ? decorrido : 0))}
                  </td>
                  <td data-rotulo="Situação">
                    <span className={`etiqueta-situacao ${situacao.classe}`}>{situacao.rotulo}</span>
                  </td>
                  <td className="tabela__acoes">
                    {d.status !== 'concluida' && !rodando && (
                      <button type="button" className="botao-icone botao-icone--claro" aria-label={`Retomar ${d.nome}`} title="Retomar" onClick={() => aoRetomar(d)} disabled={ocupado}>
                        <Play aria-hidden="true" />
                      </button>
                    )}
                    {d.status !== 'concluida' && (
                      <button type="button" className="botao-icone botao-icone--claro" aria-label={`Concluir ${d.nome}`} title="Concluir" onClick={() => aoConcluir(d)} disabled={ocupado}>
                        <CircleCheck aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" className="botao-icone botao-icone--claro" aria-label={`Editar ${d.nome}`} title="Editar" onClick={() => aoEditar(d)} disabled={rodando}>
                      <Pencil aria-hidden="true" />
                    </button>
                    {d.status === 'concluida' && (
                      <button type="button" className="botao-icone botao-icone--claro" aria-label={`Reabrir ${d.nome}`} title="Reabrir" onClick={() => aoReabrir(d)} disabled={ocupado}>
                        <RotateCcw aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
