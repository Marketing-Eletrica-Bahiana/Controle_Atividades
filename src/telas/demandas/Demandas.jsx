import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ClipboardList, Download, Merge, Pencil, RotateCcw, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import JanelaDetalhes from '../../componentes/JanelaDetalhes.jsx'
import JanelaEditarDemanda from '../../componentes/JanelaEditarDemanda.jsx'
import { EtiquetaSituacao, SeletorDeAreas, SeletorMes, TODAS, useAreasVisiveis, useMesEscolhido } from '../../componentes/Seletores.jsx'
import { excluirDemanda, reabrir, useDemandasDoMes } from '../../dados/demandas.js'
import { formatarAjustes, formatarData, formatarMes } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { podeEditar, podeExcluir } from '../../lib/papeis.js'
import { SITUACOES } from '../../lib/regras.js'
import { formatarTempo } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'
import JanelaJuntar from './JanelaJuntar.jsx'

const tempo = (campo) => ({ valor: (d) => d[campo] ?? -1, mostrar: (d) => formatarTempo(d[campo]), classe: 'numero' })

// Mesma ordem da exportação, com o Nome da Demanda logo depois do Nº.
const COLUNAS = [
  { chave: 'numero', titulo: 'Nº', valor: (d) => d.numero ?? 0, classe: 'numero' },
  { chave: 'nome', titulo: 'Nome da Demanda', valor: (d) => normalizar(d.nome) },
  { chave: 'tipo', titulo: 'Tipo de Demanda', valor: (d) => normalizar(d.tipo) },
  { chave: 'dataSolicitacao', titulo: 'Data de Solicitação', valor: (d) => d.dataSolicitacao ?? '', mostrar: (d) => formatarData(d.dataSolicitacao), classe: 'numero' },
  { chave: 'datasAjuste', titulo: 'Ajuste', valor: (d) => (d.datasAjuste ?? []).join(), mostrar: (d) => formatarAjustes(d.datasAjuste ?? []), classe: 'numero' },
  { chave: 'dataEntrega', titulo: 'Data de Entrega', valor: (d) => d.dataEntrega ?? '', mostrar: (d) => formatarData(d.dataEntrega), classe: 'numero' },
  { chave: 'tempoGastoSeg', titulo: 'Tempo Gasto', ...tempo('tempoGastoSeg') },
  { chave: 'usoIA', titulo: 'Uso de IA', valor: (d) => d.usoIA ?? '', obrigatorio: true },
  { chave: 'usoTemplate', titulo: 'Uso de Template', valor: (d) => d.usoTemplate ?? '', obrigatorio: true },
  { chave: 'solicitante', titulo: 'Solicitante', valor: (d) => normalizar(d.solicitante), obrigatorio: true },
  { chave: 'publico', titulo: 'Público', valor: (d) => normalizar(d.publico) },
  { chave: 'tempoMinSeg', titulo: 'Tempo mínimo estimado sem IA (h)', ...tempo('tempoMinSeg') },
  { chave: 'tempoMaxSeg', titulo: 'Tempo máximo estimado sem IA (h)', ...tempo('tempoMaxSeg') },
  { chave: 'economizadoMinSeg', titulo: 'Tempo economizado mín. com IA (h)', ...tempo('economizadoMinSeg') },
  { chave: 'economizadoMaxSeg', titulo: 'Tempo economizado máx. com IA (h)', ...tempo('economizadoMaxSeg') },
  { chave: 'prazoDias', titulo: 'Prazo cumprido (dias)', valor: (d) => d.prazoDias ?? -1, classe: 'numero' },
  { chave: 'responsavelNome', titulo: 'Responsável', valor: (d) => normalizar(d.responsavelNome) },
  { chave: 'status', titulo: 'Situação', valor: (d) => d.status ?? '', mostrar: (d) => <EtiquetaSituacao status={d.status} /> },
]

const FILTROS = [
  { chave: 'responsavelNome', rotulo: 'Responsável' },
  { chave: 'tipo', rotulo: 'Tipo' },
  { chave: 'publico', rotulo: 'Público' },
  { chave: 'solicitante', rotulo: 'Solicitante' },
  { chave: 'status', rotulo: 'Situação', nome: (v) => SITUACOES[v]?.rotulo ?? v },
]

export const faltaInformacao = (d) => !d.usoIA || !d.usoTemplate || !d.solicitante

export default function Demandas() {
  const { membro } = useAcesso()
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const areas = useAreasVisiveis()
  const [mes, setMes] = useMesEscolhido()
  const consulta = useDemandasDoMes(areas.ids, mes)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState({})
  const [ordem, setOrdem] = useState({ chave: 'numero', crescente: true })
  const [selecionadas, setSelecionadas] = useState([])
  const [detalhe, setDetalhe] = useState(null)
  const [editando, setEditando] = useState(null)
  const [juntando, setJuntando] = useState(null)
  const comArea = areas.atual === TODAS

  const todas = consulta.dados ?? []
  const opcoesDosFiltros = useMemo(() => {
    const opcoes = {}
    for (const { chave } of FILTROS) opcoes[chave] = [...new Set(todas.map((d) => d[chave]).filter(Boolean))].sort((a, b) => String(a).localeCompare(b, 'pt-BR'))
    return opcoes
  }, [todas])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca)
    const coluna = COLUNAS.find((c) => c.chave === ordem.chave) ?? COLUNAS[0]
    return todas
      .filter((d) => !termo || normalizar(d.nome).includes(termo))
      .filter((d) => FILTROS.every(({ chave }) => !filtros[chave] || d[chave] === filtros[chave]))
      .sort((a, b) => {
        const va = coluna.valor(a)
        const vb = coluna.valor(b)
        const comparacao = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR')
        const desempate = String(a.responsavelNome).localeCompare(b.responsavelNome, 'pt-BR') || (a.numero ?? 0) - (b.numero ?? 0)
        return (ordem.crescente ? comparacao : -comparacao) || desempate
      })
  }, [todas, busca, filtros, ordem])

  const totalSeg = visiveis.reduce((s, d) => s + (d.tempoGastoSeg ?? 0), 0)
  const comFalta = visiveis.filter(faltaInformacao).length
  const escolhidas = todas.filter((d) => selecionadas.includes(d.id))
  const podeJuntar =
    escolhidas.length === 2 && escolhidas[0].responsavelEmail === escolhidas[1].responsavelEmail && escolhidas[0].area === escolhidas[1].area

  function ordenarPor(chave) {
    setOrdem((atual) => ({ chave, crescente: atual.chave === chave ? !atual.crescente : true }))
  }

  function alternarSelecao(id) {
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual.slice(-1), id]))
  }

  async function reabrirDemanda(d) {
    const sim = await confirmar({
      titulo: 'Reabrir demanda?',
      texto: `"${d.nome}" volta para pausada e aparece no Meu Cronômetro para retomar. Ao concluir de novo, o tempo soma e a entrega passa a ser a nova data.`,
      botao: 'Reabrir',
    })
    if (sim) executar(() => reabrir(d, membro.email), 'Demanda reaberta.')
  }

  async function excluir(d) {
    const sim = await confirmar({
      titulo: 'Excluir demanda?',
      texto: `"${d.nome}" (Nº ${d.numero}, ${d.responsavelNome}) será apagada de vez. As demais do mês são renumeradas.`,
      botao: 'Excluir',
      perigo: true,
    })
    if (sim) executar(() => excluirDemanda(d), 'Demanda excluída.')
  }

  async function exportar() {
    await executar(async () => {
      const { exportarMes } = await import('../../lib/excel.js')
      await exportarMes(areas.nome, mes, todas, comArea ? 'Todas' : areas.nome)
    }, 'Planilha do mês baixada.')
  }

  const colunas = comArea ? [...COLUNAS.slice(0, 2), { chave: 'area', titulo: 'Área', valor: (d) => areas.nomeDaArea(d.area), mostrar: (d) => areas.nomeDaArea(d.area) }, ...COLUNAS.slice(2)] : COLUNAS

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <ClipboardList aria-hidden="true" />
          Demandas
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <section className="bloco">
        <div className="filtros">
          <SeletorDeAreas areas={areas} />
          <SeletorMes mes={mes} aoMudar={setMes} />
          <label className="campo campo--compacto campo--busca">
            <span className="campo__rotulo">Buscar pelo nome</span>
            <Search aria-hidden="true" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome da demanda" />
          </label>
        </div>
        <div className="filtros">
          {FILTROS.map(({ chave, rotulo, nome }) => (
            <label key={chave} className="campo campo--compacto campo--filtro">
              <span className="campo__rotulo">{rotulo}</span>
              <select value={filtros[chave] ?? ''} onChange={(e) => setFiltros((a) => ({ ...a, [chave]: e.target.value }))}>
                <option value="">Todos</option>
                {opcoesDosFiltros[chave].map((v) => (
                  <option key={v} value={v}>
                    {nome ? nome(v) : v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="barra-resumo">
          <p>
            <strong>{visiveis.length}</strong> {visiveis.length === 1 ? 'demanda' : 'demandas'} em {formatarMes(mes)} · Tempo total{' '}
            <strong className="numero">{formatarTempo(totalSeg)}</strong>
            {comFalta > 0 && (
              <span className="texto-alerta">
                {' '}
                · {comFalta} sem Uso de IA, Template ou Solicitante
              </span>
            )}
          </p>
          <div className="acoes">
            {(membro.papel === 'admin' || membro.papel === 'equipe') && (
              <button type="button" className="botao botao--secundario" disabled={!podeJuntar} onClick={() => setJuntando(escolhidas)} title="Marque duas demandas repetidas da mesma pessoa">
                <Merge aria-hidden="true" />
                Juntar
              </button>
            )}
            <button type="button" className="botao botao--principal" onClick={exportar} disabled={!todas.length}>
              <Download aria-hidden="true" />
              Exportar mês
            </button>
          </div>
        </div>
      </section>

      {consulta.erro && <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>}
      {consulta.carregando || areas.carregando ? (
        <CarregandoBloco />
      ) : !todas.length ? (
        <EstadoVazio titulo={`Nenhuma demanda em ${formatarMes(mes)}`} texto="Escolha outro mês ou outra área." mascote="ebinha" />
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela tabela--com-titulo tabela--demandas">
            <thead>
              <tr>
                <th aria-label="Selecionar" />
                {colunas.map((c) => (
                  <th key={c.chave} aria-sort={ordem.chave === c.chave ? (ordem.crescente ? 'ascending' : 'descending') : undefined} className={c.chave === 'nome' ? 'coluna-nome' : ''}>
                    <button type="button" className="cabecalho-ordenavel" onClick={() => ordenarPor(c.chave)}>
                      {c.titulo}
                      {ordem.chave === c.chave && (ordem.crescente ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />)}
                    </button>
                  </th>
                ))}
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((d) => {
                const editavel = podeEditar(membro, d)
                const falta = faltaInformacao(d)
                return (
                  <tr key={d.id} className={falta ? 'linha-alerta' : ''}>
                    <td className="tabela__selecao">
                      {editavel && (
                        <input type="checkbox" checked={selecionadas.includes(d.id)} onChange={() => alternarSelecao(d.id)} aria-label={`Selecionar ${d.nome}`} />
                      )}
                    </td>
                    {colunas.map((c) =>
                      c.chave === 'nome' ? (
                        <td key={c.chave} className="tabela__titulo coluna-nome">
                          <button type="button" className="nome-demanda nome-demanda--botao" title={d.nome} onClick={() => setDetalhe(d)}>
                            {d.nome}
                          </button>
                          {falta && (
                            <span className="aviso-falta">
                              <TriangleAlert aria-hidden="true" />
                              Falta Uso de IA, Template ou Solicitante
                            </span>
                          )}
                        </td>
                      ) : (
                        <td key={c.chave} data-rotulo={c.titulo} className={c.classe ?? ''}>
                          {c.obrigatorio && !d[c.chave] ? <span className="texto-alerta">Falta</span> : c.mostrar ? c.mostrar(d) : d[c.chave]}
                        </td>
                      ),
                    )}
                    <td className="tabela__acoes">
                      {editavel && (
                        <button type="button" className="botao-icone botao-icone--claro" aria-label={`Editar ${d.nome}`} title="Editar" onClick={() => setEditando(d)}>
                          <Pencil aria-hidden="true" />
                        </button>
                      )}
                      {editavel && d.status === 'concluida' && (
                        <button type="button" className="botao-icone botao-icone--claro" aria-label={`Reabrir ${d.nome}`} title="Reabrir" onClick={() => reabrirDemanda(d)}>
                          <RotateCcw aria-hidden="true" />
                        </button>
                      )}
                      {podeExcluir(membro) && (
                        <button type="button" className="botao-icone botao-icone--perigo" aria-label={`Excluir ${d.nome}`} title="Excluir" onClick={() => excluir(d)}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <JanelaDetalhes demanda={detalhe && todas.find((d) => d.id === detalhe.id)} aoFechar={() => setDetalhe(null)} />
      <JanelaEditarDemanda demanda={editando} aoFechar={() => setEditando(null)} />
      <JanelaJuntar
        demandas={juntando}
        aoFechar={() => setJuntando(null)}
        aoJuntar={() => setSelecionadas([])}
      />
      {janelaConfirmar}
    </section>
  )
}
