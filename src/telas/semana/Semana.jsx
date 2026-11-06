import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Pencil, RotateCcw } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import Indicadores from '../../componentes/Indicadores.jsx'
import JanelaDetalhes from '../../componentes/JanelaDetalhes.jsx'
import JanelaEditarDemanda from '../../componentes/JanelaEditarDemanda.jsx'
import { EtiquetaSituacao, SeletorDeAreas, TODAS, useAreasVisiveis } from '../../componentes/Seletores.jsx'
import { reabrir, useDemandasDosMeses } from '../../dados/demandas.js'
import { useMembros } from '../../dados/membros.js'
import { formatarData } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { podeEditar } from '../../lib/papeis.js'
import { diasDaSemana, mesesEntre, nomeDoDia, resumoDoPeriodo, segundaDaSemana, somarDias, tempoPorDia } from '../../lib/semana.js'
import { formatarTempo } from '../../lib/tempo.js'

export default function Semana() {
  const { membro } = useAcesso()
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const areas = useAreasVisiveis()
  const { dados: membros } = useMembros()
  const [segunda, setSegunda] = useState(() => segundaDaSemana())
  const [pessoa, setPessoa] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [editando, setEditando] = useState(null)

  const dias = diasDaSemana(segunda)
  const sabado = dias[5]
  const domingo = dias[6]
  // Inclui o mês anterior: demandas criadas antes podem ter sido trabalhadas nesta semana.
  const meses = mesesEntre(somarDias(segunda, -31), domingo)
  const consulta = useDemandasDosMeses(areas.ids, meses)
  const detalheAtual = detalhe ? (consulta.dados ?? []).find((d) => d.id === detalhe.id) : null

  const todosOsItens = useMemo(() => tempoPorDia(consulta.dados ?? [], segunda, domingo), [consulta.dados, segunda, domingo])
  const pessoas = useMemo(() => {
    const mapa = new Map(todosOsItens.map((i) => [i.demanda.responsavelEmail, i.demanda.responsavelNome]))
    return [...mapa.entries()].sort((a, b) => String(a[1]).localeCompare(b[1], 'pt-BR'))
  }, [todosOsItens])
  const itens = pessoa ? todosOsItens.filter((i) => i.demanda.responsavelEmail === pessoa) : todosOsItens
  const resumo = resumoDoPeriodo(itens, segunda, domingo)
  const diasComTrabalho = dias.filter((d, i) => i < 6 || itens.some((x) => x.dia === d))

  async function reabrirDemanda(d) {
    const sim = await confirmar({ titulo: 'Reabrir demanda?', texto: `"${d.nome}" volta para pausada e aparece no Meu Cronômetro para retomar.`, botao: 'Reabrir' })
    if (sim) executar(() => reabrir(d, membro.email), 'Demanda reaberta.')
  }

  async function exportar() {
    const grupos = new Map()
    for (const item of itens) {
      const email = item.demanda.responsavelEmail
      if (!grupos.has(email)) grupos.set(email, [])
      grupos.get(email).push(item)
    }
    const daPessoa = [...grupos.entries()].map(([email, lista]) => {
      const demandas = [...new Map(lista.map((i) => [i.demanda.id, i.demanda])).values()].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
      const cadastro = membros?.find((m) => m.id === email)
      return {
        nome: lista[0].demanda.responsavelNome ?? email,
        cargo: cadastro?.cargo ?? '',
        areas: [...new Set(demandas.map((d) => areas.nomeDaArea(d.area)))].join(', '),
        demandas,
        resumo: resumoDoPeriodo(lista, segunda, domingo),
      }
    })
    daPessoa.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    await executar(async () => {
      const { exportarSemana } = await import('../../lib/excel.js')
      await exportarSemana({ nomeDaArea: areas.nome, nomeNoArquivo: areas.atual === TODAS ? 'Todas' : areas.nome, segunda, sabado, pessoas: daPessoa })
    }, 'Planilha da semana baixada.')
  }

  return (
    <section className="pagina">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <CalendarDays aria-hidden="true" />
          Semana
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <section className="bloco">
        <div className="filtros">
          <SeletorDeAreas areas={areas} />
          <div className="campo campo--compacto">
            <span className="campo__rotulo">Semana</span>
            <div className="seletor-periodo">
              <button type="button" className="botao-icone" onClick={() => setSegunda(somarDias(segunda, -7))} aria-label="Semana anterior">
                <ChevronLeft aria-hidden="true" />
              </button>
              <strong>
                {formatarData(segunda)} a {formatarData(sabado)}
              </strong>
              <button type="button" className="botao-icone" onClick={() => setSegunda(somarDias(segunda, 7))} aria-label="Próxima semana">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="campo campo--compacto">
            <span className="campo__rotulo">Pessoa</span>
            <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
              <option value="">Equipe toda</option>
              {pessoas.map(([email, nome]) => (
                <option key={email} value={email}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="botao botao--principal" onClick={exportar} disabled={!itens.length}>
            <Download aria-hidden="true" />
            Exportar Excel
          </button>
        </div>
      </section>

      <Indicadores
        itens={[
          { rotulo: 'Total de horas', valor: formatarTempo(resumo.totalSeg) },
          { rotulo: 'Demandas', valor: resumo.demandas },
          { rotulo: 'Tempo economizado com IA', valor: formatarTempo(resumo.economizadoMinSeg), detalhe: `até ${formatarTempo(resumo.economizadoMaxSeg)}` },
          { rotulo: 'Demandas com IA', valor: `${resumo.porcentagemIA}%` },
        ]}
      />

      {consulta.erro && <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>}
      {consulta.carregando ? (
        <CarregandoBloco />
      ) : (
        diasComTrabalho.map((dia) => {
          const doDia = itens.filter((i) => i.dia === dia)
          const total = doDia.reduce((s, i) => s + i.segundos, 0)
          return (
            <section key={dia} className="bloco dia-da-semana">
              <div className="bloco__cabecalho">
                <h2 className="bloco__titulo">
                  {nomeDoDia(dia)}, {formatarData(dia)}
                </h2>
                <span className="dia-da-semana__total">
                  Total do dia <strong className="numero">{formatarTempo(total)}</strong>
                </span>
              </div>
              {!doDia.length ? (
                <p className="texto-suave">Sem demandas registradas.</p>
              ) : (
                <table className="tabela tabela--com-titulo">
                  <thead>
                    <tr>
                      <th>Nome da Demanda</th>
                      <th>Tipo</th>
                      {!pessoa && <th>Responsável</th>}
                      <th>Tempo no dia</th>
                      <th>Situação</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {doDia.map(({ demanda: d, segundos }) => (
                      <tr key={`${d.id}-${dia}`}>
                        <td className="tabela__titulo">
                          <button type="button" className="nome-demanda nome-demanda--botao" title={d.nome} onClick={() => setDetalhe(d)}>
                            {d.nome}
                          </button>
                        </td>
                        <td data-rotulo="Tipo">{d.tipo || <span className="texto-alerta">Sem tipo</span>}</td>
                        {!pessoa && <td data-rotulo="Responsável">{d.responsavelNome}</td>}
                        <td data-rotulo="Tempo no dia" className="numero">
                          {formatarTempo(segundos)}
                        </td>
                        <td data-rotulo="Situação">
                          <EtiquetaSituacao status={d.status} />
                        </td>
                        <td className="tabela__acoes">
                          {podeEditar(membro, d) && (
                            <button type="button" className="botao-icone botao-icone--claro" aria-label={`Editar ${d.nome}`} title="Editar" onClick={() => setEditando(d)}>
                              <Pencil aria-hidden="true" />
                            </button>
                          )}
                          {podeEditar(membro, d) && d.status === 'concluida' && (
                            <button type="button" className="botao-icone botao-icone--claro" aria-label={`Reabrir ${d.nome}`} title="Reabrir" onClick={() => reabrirDemanda(d)}>
                              <RotateCcw aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )
        })
      )}

      <JanelaDetalhes
        demanda={editando ? null : detalheAtual}
        aoEditar={detalheAtual && podeEditar(membro, detalheAtual) ? setEditando : null}
        aoFechar={() => setDetalhe(null)}
      />
      <JanelaEditarDemanda demanda={editando} aoFechar={() => setEditando(null)} />
      {janelaConfirmar}
    </section>
  )
}
