import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, FileSpreadsheet, LoaderCircle, TriangleAlert, Upload } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import SeletorArea, { useAreaEscolhida } from '../../componentes/SeletorArea.jsx'
import { useAreas } from '../../dados/areas.js'
import { agoraFirestore, demandasExistentes, gravarImportacao, marcaDoServidor } from '../../dados/importacao.js'
import { juntarSemRepetir, LISTAS_PADRAO, useListas } from '../../dados/listas.js'
import { useMembros } from '../../dados/membros.js'
import { useTipos } from '../../dados/tipos.js'
import { formatarMes } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { agruparENumerar, chaveDoGrupo, montarDemanda, sugerirPessoa } from '../../lib/importacao.js'
import { segundosParaHoras } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

export default function Importar() {
  const { membro: eu } = useAcesso()
  const { dados: areas } = useAreas()
  const [area, setArea] = useAreaEscolhida(areas)
  const { dados: membros } = useMembros()
  const { dados: tiposAtuais } = useTipos(area)
  const { dados: listasGravadas } = useListas()
  // Sem config/listas ainda, as listas padrão são a base para acrescentar os valores da planilha.
  const listas = listasGravadas ?? LISTAS_PADRAO

  const [etapa, setEtapa] = useState('escolher')
  const [erro, setErro] = useState('')
  const [arquivo, setArquivo] = useState('')
  const [leitura, setLeitura] = useState(null)
  const [pessoaPorValor, setPessoaPorValor] = useState({})
  const [pessoaPadrao, setPessoaPadrao] = useState('')
  const [incluir, setIncluir] = useState({ tipos: true, palavras: true, listas: true })
  const [existentes, setExistentes] = useState({})
  const [decisoes, setDecisoes] = useState({})
  const [progresso, setProgresso] = useState({ feitas: 0, total: 0 })
  const [resultado, setResultado] = useState(null)

  const ativos = useMemo(() => (membros ?? []).filter((m) => m.ativo), [membros])
  const pessoaPorId = useMemo(() => new Map(ativos.map((m) => [m.id, m])), [ativos])
  const nomeDaArea = areas?.find((a) => a.id === area)?.nome ?? ''

  // Valores distintos da coluna Responsável, com quantas linhas cada um tem.
  const valoresResponsavel = useMemo(() => {
    const contagem = new Map()
    for (const linha of leitura?.demandas ?? []) {
      if (!linha.responsavel) continue
      const chave = normalizar(linha.responsavel)
      const atual = contagem.get(chave) ?? { valor: linha.responsavel, linhas: 0 }
      contagem.set(chave, { ...atual, linhas: atual.linhas + 1 })
    }
    return [...contagem.entries()].map(([chave, dados]) => ({ chave, ...dados }))
  }, [leitura])
  const linhasSemResponsavel = (leitura?.demandas ?? []).filter((l) => !l.responsavel).length

  const grupos = useMemo(() => {
    if (!leitura) return []
    const pessoaDaLinha = (linha) => {
      const id = leitura.temResponsavel && linha.responsavel ? pessoaPorValor[normalizar(linha.responsavel)] : pessoaPadrao
      return pessoaPorId.get(id) ?? null
    }
    return agruparENumerar(leitura.demandas, pessoaDaLinha)
  }, [leitura, pessoaPorValor, pessoaPadrao, pessoaPorId])

  const chaveExistente = (grupo) => `${area}|${grupo.chave}`

  // Confere no Firestore se cada pessoa já tem demandas naquele mês.
  useEffect(() => {
    for (const grupo of grupos) {
      const chave = `${area}|${grupo.chave}`
      if (existentes[chave]) continue
      setExistentes((atual) => ({ ...atual, [chave]: { carregando: true } }))
      demandasExistentes(area, grupo.pessoa.id, grupo.mes)
        .then((lista) => setExistentes((atual) => ({ ...atual, [chave]: { lista } })))
        .catch((e) => setExistentes((atual) => ({ ...atual, [chave]: { erro: mensagemDeErro(e) } })))
    }
  }, [grupos, area, existentes])

  async function lerArquivo(evento) {
    const escolhido = evento.target.files?.[0]
    evento.target.value = ''
    if (!escolhido) return
    setErro('')
    setEtapa('lendo')
    try {
      const [{ read }, { lerPlanilha }] = await Promise.all([import('xlsx'), import('../../lib/planilha.js')])
      const lida = lerPlanilha(read(await escolhido.arrayBuffer(), { type: 'array' }))
      if (!lida.demandas.length && !lida.tipos.length && !lida.palavras.length) {
        throw new Error('Não encontrei demandas, tipos nem palavras-chave nesta planilha.')
      }
      const sugestoes = {}
      for (const linha of lida.demandas) {
        const chave = normalizar(linha.responsavel)
        if (chave && !(chave in sugestoes)) sugestoes[chave] = sugerirPessoa(linha.responsavel, ativos)?.id ?? ''
      }
      setArquivo(escolhido.name)
      setLeitura(lida)
      setPessoaPorValor(sugestoes)
      setPessoaPadrao('')
      setDecisoes({})
      setEtapa('revisar')
    } catch (e) {
      setErro(e.message?.startsWith('Não encontrei') ? e.message : `Não deu para ler o arquivo. ${mensagemDeErro(e)}`)
      setEtapa('escolher')
    }
  }

  function recomecar() {
    setLeitura(null)
    setResultado(null)
    setExistentes({})
    setEtapa('escolher')
  }

  if (!areas?.length) {
    return <EstadoVazio titulo="Cadastre as áreas primeiro" texto="A importação precisa saber em que área as demandas vão entrar." />
  }

  if (etapa === 'escolher' || etapa === 'lendo') {
    return (
      <section className="bloco">
        <h2 className="bloco__titulo">Importar planilha</h2>
        <p>
          Traz o histórico de demandas e as tabelas de tipos, palavras-chave e listas de uma planilha Excel. Antes de gravar,
          você confere tudo numa prévia.
        </p>
        <div className="filtros">
          <SeletorArea areas={areas} valor={area} aoMudar={setArea} rotulo="Área das demandas" />
          <label className={`botao botao--principal botao-arquivo ${etapa === 'lendo' ? 'botao--ocupado' : ''}`}>
            {etapa === 'lendo' ? <LoaderCircle className="girando" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {etapa === 'lendo' ? 'Lendo a planilha...' : 'Escolher planilha (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" onChange={lerArquivo} disabled={etapa === 'lendo'} />
          </label>
        </div>
        {erro && (
          <p className="aviso aviso--erro" role="alert">
            <TriangleAlert aria-hidden="true" />
            {erro}
          </p>
        )}
        <details className="detalhes">
          <summary>Que planilhas o sistema entende?</summary>
          <ul>
            <li>Abas de mês com as colunas Tipo de Demanda, Data de Entrega e Tempo gasto (as demais colunas são opcionais).</li>
            <li>
              Uma coluna <strong>Responsável</strong> com o nome de quem fez cada demanda. Sem ela, você escolhe uma pessoa para
              a planilha inteira.
            </li>
            <li>Abas Tipo de Atividade, Palavras-chave e Listas, como na planilha Relatório Designers.</li>
            <li>Planilhas exportadas pelo próprio sistema.</li>
          </ul>
        </details>
      </section>
    )
  }

  if (etapa === 'gravando') {
    const porcento = progresso.total ? Math.round((progresso.feitas / progresso.total) * 100) : 0
    return (
      <section className="bloco">
        <h2 className="bloco__titulo">Gravando...</h2>
        <div className="barra-progresso" role="progressbar" aria-valuenow={porcento} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${porcento}%` }} />
        </div>
        <p>
          {progresso.feitas} de {progresso.total} registros. Não feche esta tela.
        </p>
      </section>
    )
  }

  if (etapa === 'pronto') {
    return (
      <EstadoVazio titulo="Importação concluída!" mascote="ebinho">
        <ul className="lista-resumo">
          <li>{plural(resultado.demandas, 'demanda importada', 'demandas importadas')}</li>
          {resultado.apagadas > 0 && <li>{plural(resultado.apagadas, 'demanda importada antes foi substituída', 'demandas importadas antes foram substituídas')}</li>}
          {resultado.tipos > 0 && <li>{plural(resultado.tipos, 'tipo de atividade atualizado', 'tipos de atividade atualizados')}</li>}
          {resultado.palavras > 0 && <li>{plural(resultado.palavras, 'palavra-chave atualizada', 'palavras-chave atualizadas')}</li>}
        </ul>
        <button type="button" className="botao botao--principal" onClick={recomecar}>
          Importar outra planilha
        </button>
      </EstadoVazio>
    )
  }

  // Revisão
  const situacaoDoGrupo = (grupo) => existentes[chaveExistente(grupo)] ?? { carregando: true }
  const decisaoDoGrupo = (grupo) => {
    const lista = situacaoDoGrupo(grupo).lista ?? []
    if (!lista.length) return 'importar'
    return decisoes[grupo.chave] ?? 'pular'
  }
  const conferindo = grupos.some((g) => situacaoDoGrupo(g).carregando)
  const comErroDeConsulta = grupos.some((g) => situacaoDoGrupo(g).erro)
  const gruposAImportar = grupos.filter((g) => decisaoDoGrupo(g) !== 'pular')
  const totalDemandas = gruposAImportar.reduce((soma, g) => soma + g.linhas.length, 0)

  const linhasComErro = leitura.demandas.filter((l) => l.erro)
  const linhasComAviso = leitura.demandas.filter((l) => !l.erro && l.avisos.length)
  const semPessoa = leitura.demandas.filter((l) => !l.erro).length - grupos.reduce((s, g) => s + g.linhas.length, 0)

  const nomesAtuais = new Set((tiposAtuais ?? []).map((t) => normalizar(t.nome)))
  const tiposNovos = leitura.tipos.filter((t) => !nomesAtuais.has(normalizar(t.nome))).length
  const tiposConhecidos = new Set([...nomesAtuais, ...(incluir.tipos ? leitura.tipos.map((t) => normalizar(t.nome)) : [])])
  const tiposDesconhecidos = [...new Set(leitura.demandas.filter((l) => l.tipo && !tiposConhecidos.has(normalizar(l.tipo))).map((l) => l.tipo))]
  const listasNovas = {
    publicos: juntarSemRepetir(listas.publicos, leitura.listas.publicos).slice(listas.publicos?.length ?? 0),
    solicitantes: juntarSemRepetir(listas.solicitantes, leitura.listas.solicitantes).slice(listas.solicitantes?.length ?? 0),
  }
  const temListasNovas = listasNovas.publicos.length + listasNovas.solicitantes.length > 0
  const nadaParaGravar =
    !totalDemandas && !(incluir.tipos && leitura.tipos.length) && !(incluir.palavras && leitura.palavras.length) && !(incluir.listas && temListasNovas)

  async function importar() {
    const tiposPorNome = new Map((tiposAtuais ?? []).map((t) => [normalizar(t.nome), t]))
    if (incluir.tipos) {
      for (const t of leitura.tipos) {
        tiposPorNome.set(normalizar(t.nome), { minH: segundosParaHoras(t.minSeg), maxH: segundosParaHoras(t.maxSeg), publico: t.publico })
      }
    }
    const agora = agoraFirestore()
    const marca = marcaDoServidor()
    const demandas = gruposAImportar.flatMap((grupo) =>
      grupo.linhas.map((linha) =>
        montarDemanda(linha, { area, pessoa: grupo.pessoa, tiposPorNome, arquivo, quem: eu.email, agora, marcaDoServidor: marca }),
      ),
    )
    const apagar = gruposAImportar
      .filter((g) => decisaoDoGrupo(g) === 'substituir')
      .flatMap((g) => situacaoDoGrupo(g).lista.map((d) => d.id))

    setEtapa('gravando')
    setProgresso({ feitas: 0, total: 0 })
    try {
      await gravarImportacao({
        area,
        apagar,
        tipos: incluir.tipos ? leitura.tipos : [],
        palavras: incluir.palavras ? leitura.palavras : [],
        listas: incluir.listas ? listasNovas : null,
        listasAtuais: listas,
        demandas,
        aoAvancar: (feitas, total) => setProgresso({ feitas, total }),
      })
      setResultado({
        demandas: demandas.length,
        apagadas: apagar.length,
        tipos: incluir.tipos ? leitura.tipos.length : 0,
        palavras: incluir.palavras ? leitura.palavras.length : 0,
      })
      setEtapa('pronto')
    } catch (e) {
      setErro(`A gravação parou no meio: ${mensagemDeErro(e)} Confira a aba de cada mês antes de tentar de novo.`)
      setExistentes({})
      setEtapa('revisar')
    }
  }

  const opcoesPessoa = (
    <>
      <option value="">Não importar</option>
      {ativos.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nome}
          {(m.areas ?? []).includes(area) ? '' : ` (fora de ${nomeDaArea})`}
        </option>
      ))}
    </>
  )

  return (
    <>
      <section className="bloco">
        <div className="bloco__cabecalho">
          <h2 className="bloco__titulo">
            <FileSpreadsheet aria-hidden="true" />
            {arquivo}
          </h2>
          <button type="button" className="botao botao--secundario" onClick={recomecar}>
            Escolher outro arquivo
          </button>
        </div>
        <p>
          Área: <strong>{nomeDaArea}</strong>. Abas lidas:{' '}
          {leitura.abasDeDemandas.map((a) => `${a.aba} (${a.linhas})`).join(', ') || 'nenhuma aba de demandas'}.
          {leitura.abasIgnoradas.length > 0 && ` Ignoradas: ${leitura.abasIgnoradas.join(', ')}.`}
        </p>
        {erro && (
          <p className="aviso aviso--erro" role="alert">
            <TriangleAlert aria-hidden="true" />
            {erro}
          </p>
        )}
      </section>

      {leitura.demandas.length > 0 && (
        <section className="bloco">
          <h2 className="bloco__titulo">1. De quem é cada demanda</h2>
          {leitura.temResponsavel ? (
            <>
              <p className="texto-suave">Confira a ligação entre o que está na coluna Responsável e as pessoas cadastradas.</p>
              <table className="tabela tabela--compacta">
                <thead>
                  <tr>
                    <th>Na planilha</th>
                    <th>Linhas</th>
                    <th>Pessoa no sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {valoresResponsavel.map(({ chave, valor, linhas }) => (
                    <tr key={chave}>
                      <td data-rotulo="Na planilha">
                        <strong>{valor}</strong>
                      </td>
                      <td data-rotulo="Linhas" className="numero">{linhas}</td>
                      <td data-rotulo="Pessoa no sistema">
                        <select
                          value={pessoaPorValor[chave] ?? ''}
                          onChange={(e) => setPessoaPorValor((atual) => ({ ...atual, [chave]: e.target.value }))}
                          aria-label={`Pessoa para ${valor}`}
                        >
                          {opcoesPessoa}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {linhasSemResponsavel > 0 && (
                    <tr>
                      <td data-rotulo="Na planilha">
                        <span className="etiqueta etiqueta--alerta">Sem Responsável</span>
                      </td>
                      <td data-rotulo="Linhas" className="numero">{linhasSemResponsavel}</td>
                      <td data-rotulo="Pessoa no sistema">
                        <select value={pessoaPadrao} onChange={(e) => setPessoaPadrao(e.target.value)} aria-label="Pessoa para linhas sem Responsável">
                          {opcoesPessoa}
                        </select>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p className="aviso">
                <TriangleAlert aria-hidden="true" />
                Esta planilha não tem a coluna Responsável. Todas as {leitura.demandas.length} demandas vão para a mesma pessoa.
              </p>
              <label className="campo campo--compacto">
                <span className="campo__rotulo">De quem são estas demandas?</span>
                <select value={pessoaPadrao} onChange={(e) => setPessoaPadrao(e.target.value)}>
                  {opcoesPessoa}
                </select>
              </label>
            </>
          )}
        </section>
      )}

      {grupos.length > 0 && (
        <section className="bloco">
          <h2 className="bloco__titulo">2. Meses</h2>
          <p className="texto-suave">
            Cada mês de cada pessoa é numerado de novo, em sequência. Se a pessoa já tiver demandas no mês, nada é duplicado:
            você escolhe pular ou substituir as que vieram de importação.
          </p>
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Mês</th>
                <th>Demandas</th>
                <th>No sistema</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((grupo) => {
                const situacao = situacaoDoGrupo(grupo)
                const lista = situacao.lista ?? []
                const soImportadas = lista.every((d) => d.importada)
                return (
                  <tr key={grupo.chave}>
                    <td data-rotulo="Pessoa">{grupo.pessoa.nome}</td>
                    <td data-rotulo="Mês">{formatarMes(grupo.mes)}</td>
                    <td data-rotulo="Demandas" className="numero">{grupo.linhas.length}</td>
                    <td data-rotulo="No sistema">
                      {situacao.carregando && <span className="texto-suave">Conferindo...</span>}
                      {situacao.erro && <span className="campo__erro">{situacao.erro}</span>}
                      {situacao.lista && !lista.length && <span className="etiqueta">Mês novo</span>}
                      {lista.length > 0 && (
                        <select
                          value={decisaoDoGrupo(grupo)}
                          onChange={(e) => setDecisoes((atual) => ({ ...atual, [grupo.chave]: e.target.value }))}
                          aria-label={`O que fazer com ${formatarMes(grupo.mes)} de ${grupo.pessoa.nome}`}
                        >
                          <option value="pular">Já tem {lista.length}: pular este mês</option>
                          {soImportadas && <option value="substituir">Já tem {lista.length}: substituir as importadas</option>}
                        </select>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {semPessoa > 0 && (
            <p className="aviso">
              <TriangleAlert aria-hidden="true" />
              {plural(semPessoa, 'linha está sem pessoa e não será importada', 'linhas estão sem pessoa e não serão importadas')}.
            </p>
          )}
        </section>
      )}

      {(leitura.tipos.length > 0 || leitura.palavras.length > 0 || temListasNovas) && (
        <section className="bloco">
          <h2 className="bloco__titulo">3. Tabelas de {nomeDaArea}</h2>
          <div className="opcoes opcoes--coluna">
            {leitura.tipos.length > 0 && (
              <label className="opcao">
                <input type="checkbox" checked={incluir.tipos} onChange={(e) => setIncluir((a) => ({ ...a, tipos: e.target.checked }))} />
                Atualizar os tipos de atividade: {plural(leitura.tipos.length, 'tipo', 'tipos')} na planilha, {plural(tiposNovos, 'novo', 'novos')}.
                Os que já existem recebem os tempos e o público da planilha.
              </label>
            )}
            {leitura.palavras.length > 0 && (
              <label className="opcao">
                <input type="checkbox" checked={incluir.palavras} onChange={(e) => setIncluir((a) => ({ ...a, palavras: e.target.checked }))} />
                Atualizar as palavras-chave: {plural(leitura.palavras.length, 'palavra', 'palavras')} na planilha.
              </label>
            )}
            {temListasNovas && (
              <label className="opcao">
                <input type="checkbox" checked={incluir.listas} onChange={(e) => setIncluir((a) => ({ ...a, listas: e.target.checked }))} />
                Acrescentar às listas:{' '}
                {[
                  listasNovas.publicos.length && `Público (${listasNovas.publicos.join(', ')})`,
                  listasNovas.solicitantes.length && `Solicitante (${listasNovas.solicitantes.join(', ')})`,
                ]
                  .filter(Boolean)
                  .join(' e ')}
                .
              </label>
            )}
          </div>
          {tiposDesconhecidos.length > 0 && (
            <p className="aviso">
              <TriangleAlert aria-hidden="true" />
              Tipos usados nas demandas que não estão na tabela: {tiposDesconhecidos.join(', ')}. As demandas entram assim mesmo;
              depois dá para cadastrar esses tipos.
            </p>
          )}
        </section>
      )}

      {(linhasComErro.length > 0 || linhasComAviso.length > 0) && (
        <section className="bloco">
          <h2 className="bloco__titulo">4. Pontos de atenção</h2>
          {linhasComErro.length > 0 && (
            <details className="detalhes" open>
              <summary className="texto-alerta">{plural(linhasComErro.length, 'linha não será importada', 'linhas não serão importadas')}</summary>
              <ul>
                {linhasComErro.map((l) => (
                  <li key={`${l.aba}-${l.linha}`}>
                    {l.aba}, linha {l.linha} ({l.nome}): {l.erro}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {linhasComAviso.length > 0 && (
            <details className="detalhes">
              <summary>{plural(linhasComAviso.length, 'linha entra com aviso', 'linhas entram com aviso')}</summary>
              <ul>
                {linhasComAviso.map((l) => (
                  <li key={`${l.aba}-${l.linha}`}>
                    {l.aba}, linha {l.linha} ({l.nome}): {l.avisos.join('; ')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <section className="bloco barra-acao">
        <p>
          {conferindo
            ? 'Conferindo o que já existe no sistema...'
            : `Pronto para gravar ${plural(totalDemandas, 'demanda', 'demandas')} em ${nomeDaArea}.`}
        </p>
        <button
          type="button"
          className="botao botao--principal botao--grande-largo"
          onClick={importar}
          disabled={conferindo || comErroDeConsulta || nadaParaGravar}
        >
          <CircleCheck aria-hidden="true" />
          Importar
        </button>
      </section>
    </>
  )
}
