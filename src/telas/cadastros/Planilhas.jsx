import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, Download, FileSpreadsheet, LoaderCircle, TriangleAlert, Upload } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import SeletorArea, { useAreaEscolhida } from '../../componentes/SeletorArea.jsx'
import { useAreas } from '../../dados/areas.js'
import { esquecerHistorico } from '../../dados/demandas.js'
import { agoraFirestore, demandasExistentes, gravarImportacao, marcaDoServidor } from '../../dados/importacao.js'
import { juntarSemRepetir, LISTAS_PADRAO, useListas } from '../../dados/listas.js'
import { useMembros } from '../../dados/membros.js'
import { usePalavras, useTipos } from '../../dados/tipos.js'
import { formatarMes } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { agruparENumerar, diferencaPalavras, diferencaTipos, montarDemanda, planejarMes, sugerirPessoa } from '../../lib/importacao.js'
import { segundosParaHoras } from '../../lib/tempo.js'
import { normalizar } from '../../lib/texto.js'

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`
// "3 entram, 1 sai, 0 mudam" (ou no passado, depois de gravar).
const resumoDaTabela = (d, passado = false) =>
  [
    plural(d.entram.length, passado ? 'entrou' : 'entra', passado ? 'entraram' : 'entram'),
    plural(d.saem.length, passado ? 'saiu' : 'sai', passado ? 'saíram' : 'saem'),
    plural(d.mudam.length, passado ? 'mudou' : 'muda', passado ? 'mudaram' : 'mudam'),
  ].join(', ')
const PAPEIS = {
  demandas: 'Demandas do mês',
  tipos: 'Tipos de atividade',
  palavras: 'Palavras-chave',
  listas: 'Listas',
  ignorar: 'Ignorar',
}

export default function Planilhas() {
  const { membro: eu } = useAcesso()
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const { dados: areas } = useAreas()
  const [area, setArea] = useAreaEscolhida(areas)
  const { dados: membros } = useMembros()
  const { dados: tiposAtuais } = useTipos(area)
  const { dados: palavrasAtuais } = usePalavras(area)
  const { dados: listasGravadas } = useListas()
  const listas = listasGravadas ?? LISTAS_PADRAO

  const [etapa, setEtapa] = useState('escolher')
  const [erro, setErro] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [papeis, setPapeis] = useState({})
  const [incluir, setIncluir] = useState({ tipos: true, palavras: true, demandas: true, listas: true })
  const [escolhasPorValor, setEscolhasPorValor] = useState({})
  const [padraoEscolhido, setPadraoEscolhido] = useState(null)
  const [substituir, setSubstituir] = useState(false)
  const [existentes, setExistentes] = useState({})
  const [progresso, setProgresso] = useState({ feitas: 0, total: 0 })
  const [resultado, setResultado] = useState(null)
  const [arrastando, setArrastando] = useState(false)

  const nomeDaArea = areas?.find((a) => a.id === area)?.nome ?? ''
  // Responsável só entre as pessoas ativas daquela área.
  const daArea = useMemo(() => (membros ?? []).filter((m) => m.ativo && (m.areas ?? []).includes(area)), [membros, area])
  const pessoaPorId = useMemo(() => new Map(daArea.map((m) => [m.id, m])), [daArea])

  const leitura = useMemo(() => (arquivo ? arquivo.ler(papeis) : null), [arquivo, papeis])

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

  // Ligação sugerida da coluna Responsável com as pessoas da área. É calculada (não guardada em estado),
  // e o que a pessoa escolhe na tela vale por cima da sugestão.
  const sugestoes = useMemo(() => {
    const porValor = {}
    for (const { chave, valor } of valoresResponsavel) porValor[chave] = sugerirPessoa(valor, daArea)?.id ?? ''
    return porValor
  }, [valoresResponsavel, daArea])
  const pessoaPorValor = useMemo(() => ({ ...sugestoes, ...escolhasPorValor }), [sugestoes, escolhasPorValor])
  const pessoaPadrao = padraoEscolhido ?? (daArea.length === 1 ? daArea[0].id : '')

  const grupos = useMemo(() => {
    if (!leitura || !incluir.demandas) return []
    const pessoaDaLinha = (linha) => {
      const id = leitura.temResponsavel && linha.responsavel ? pessoaPorValor[normalizar(linha.responsavel)] : pessoaPadrao
      return pessoaPorId.get(id) ?? null
    }
    return agruparENumerar(leitura.demandas, pessoaDaLinha)
  }, [leitura, incluir.demandas, pessoaPorValor, pessoaPadrao, pessoaPorId])

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

  async function abrirArquivo(escolhido) {
    if (!escolhido) return
    setErro('')
    setEtapa('lendo')
    try {
      const [{ read }, { lerPlanilha }] = await Promise.all([import('xlsx'), import('../../lib/planilha.js')])
      const pasta = read(await escolhido.arrayBuffer(), { type: 'array' })
      const primeira = lerPlanilha(pasta)
      if (!primeira.abas.length) throw new Error('A planilha está vazia.')
      setArquivo({ nome: escolhido.name, ler: (p) => lerPlanilha(pasta, { papeis: p }) })
      setPapeis({})
      setEscolhasPorValor({})
      setPadraoEscolhido(null)
      setIncluir({ tipos: true, palavras: true, demandas: true, listas: true })
      setSubstituir(false)
      setEtapa('revisar')
    } catch (e) {
      setErro(`Não deu para ler o arquivo. ${mensagemDeErro(e)}`)
      setEtapa('escolher')
    }
  }

  function recomecar() {
    setArquivo(null)
    setResultado(null)
    setExistentes({})
    setErro('')
    setEtapa('escolher')
  }

  if (!areas) return <CarregandoBloco />
  if (!areas.length) {
    return <EstadoVazio titulo="Cadastre as áreas primeiro" texto="A importação precisa saber de que área são as tabelas e demandas." />
  }

  async function baixarReferencia() {
    await executar(async () => {
      const { baixarTabelaDeReferencia } = await import('../../lib/excel.js')
      await baixarTabelaDeReferencia(nomeDaArea, tiposAtuais ?? [], palavrasAtuais ?? [])
    }, 'Tabela de referência baixada.')
  }

  const blocoReferencia = (
    <section className="bloco">
      <div className="bloco__cabecalho">
        <div>
          <h2 className="bloco__titulo">Tabela de referência</h2>
          <p className="texto-suave">
            Baixe os tipos de atividade e as palavras-chave atuais de {nomeDaArea} para editar no Excel e importar de volta aqui.
          </p>
        </div>
        <div className="filtros">
          <SeletorArea areas={areas} valor={area} aoMudar={(v) => (setArea(v), setExistentes({}), setEscolhasPorValor({}), setPadraoEscolhido(null))} />
          <button type="button" className="botao botao--secundario" onClick={baixarReferencia} disabled={!tiposAtuais}>
            <Download aria-hidden="true" />
            Baixar tabela de referência
          </button>
        </div>
      </div>
    </section>
  )

  if (etapa === 'escolher' || etapa === 'lendo') {
    return (
      <>
        {blocoReferencia}
        <section className="bloco">
          <h2 className="bloco__titulo">Importar planilha em {nomeDaArea}</h2>
          <label
            className={`area-envio ${arrastando ? 'area-envio--ativa' : ''} ${etapa === 'lendo' ? 'botao--ocupado' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setArrastando(true)
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastando(false)
              abrirArquivo(e.dataTransfer.files?.[0])
            }}
          >
            {etapa === 'lendo' ? <LoaderCircle className="girando" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            <strong>{etapa === 'lendo' ? 'Lendo a planilha...' : 'Arraste o arquivo .xlsx aqui ou clique para escolher'}</strong>
            <span className="texto-suave texto-pequeno">
              O sistema acha sozinho as abas de tipos, de palavras-chave e de cada mês. Antes de gravar, você confere tudo.
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                abrirArquivo(e.target.files?.[0])
                e.target.value = ''
              }}
              disabled={etapa === 'lendo'}
            />
          </label>
          {erro && (
            <p className="aviso aviso--erro" role="alert">
              <TriangleAlert aria-hidden="true" />
              {erro}
            </p>
          )}
        </section>
      </>
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
          {resultado.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
        <button type="button" className="botao botao--principal" onClick={recomecar}>
          Importar outra planilha
        </button>
      </EstadoVazio>
    )
  }

  // ---------- Revisão ----------
  const chaveExistente = (grupo) => `${area}|${grupo.chave}`
  const planos = grupos.map((grupo) => {
    const situacao = existentes[chaveExistente(grupo)] ?? { carregando: true }
    return { grupo, situacao, plano: situacao.lista ? planejarMes(grupo.linhas.length, situacao.lista, substituir) : null }
  })
  const conferindo = planos.some((p) => p.situacao.carregando)
  const comErroDeConsulta = planos.some((p) => p.situacao.erro)
  const totalEntram = planos.reduce((s, p) => s + (p.plano?.entram ?? 0), 0)
  const totalSaem = planos.reduce((s, p) => s + (p.plano?.saem.length ?? 0), 0)

  const difTipos = incluir.tipos && leitura.tipos.length ? diferencaTipos(tiposAtuais ?? [], leitura.tipos) : null
  const difPalavras = incluir.palavras && leitura.palavras.length ? diferencaPalavras(palavrasAtuais ?? [], leitura.palavras) : null

  const valoresDasDemandas = incluir.demandas
    ? {
        publicos: [...new Set(leitura.demandas.map((d) => d.publico).filter(Boolean))],
        solicitantes: [...new Set(leitura.demandas.map((d) => d.solicitante).filter(Boolean))],
      }
    : { publicos: [], solicitantes: [] }
  const encontrados = {
    publicos: [...leitura.listas.publicos, ...valoresDasDemandas.publicos],
    solicitantes: [...leitura.listas.solicitantes, ...valoresDasDemandas.solicitantes],
  }
  const listasNovas = {
    publicos: juntarSemRepetir(listas.publicos, encontrados.publicos).slice(listas.publicos?.length ?? 0),
    solicitantes: juntarSemRepetir(listas.solicitantes, encontrados.solicitantes).slice(listas.solicitantes?.length ?? 0),
  }
  const temListasNovas = listasNovas.publicos.length + listasNovas.solicitantes.length > 0

  const linhasComErro = incluir.demandas ? leitura.demandas.filter((l) => l.erro) : []
  const linhasComAviso = incluir.demandas ? leitura.demandas.filter((l) => !l.erro && l.avisos.length) : []
  const semPessoa = incluir.demandas ? leitura.demandas.filter((l) => !l.erro).length - grupos.reduce((s, g) => s + g.linhas.length, 0) : 0
  const vaiGravarListas = incluir.listas && temListasNovas
  const nadaParaGravar = !totalEntram && !totalSaem && !difTipos && !difPalavras && !vaiGravarListas

  async function importar() {
    const resumo = [
      incluir.demandas && grupos.length && `${plural(totalEntram, 'demanda entra', 'demandas entram')} e ${plural(totalSaem, 'sai', 'saem')}`,
      difTipos && `Tipos: ${resumoDaTabela(difTipos)}`,
      difPalavras && `Palavras-chave: ${resumoDaTabela(difPalavras)}`,
      vaiGravarListas && `Listas: ${[...listasNovas.publicos, ...listasNovas.solicitantes].join(', ')}`,
    ].filter(Boolean)
    const sim = await confirmar({ titulo: `Importar em ${nomeDaArea}?`, texto: `${resumo.join('. ')}.`, botao: 'Importar' })
    if (!sim) return

    const tiposPorNome = new Map((tiposAtuais ?? []).map((t) => [normalizar(t.nome), t]))
    if (difTipos) {
      for (const t of leitura.tipos) tiposPorNome.set(normalizar(t.nome), { minH: segundosParaHoras(t.minSeg), maxH: segundosParaHoras(t.maxSeg), publico: t.publico })
    }
    const agora = agoraFirestore()
    const marca = marcaDoServidor()
    const aGravar = planos.filter((p) => p.plano && !p.plano.pular)
    const demandas = aGravar.flatMap(({ grupo, plano }) =>
      grupo.linhas.map((linha) =>
        montarDemanda(
          { ...linha, numero: plano.primeiroNumero + linha.numero - 1 },
          { area, pessoa: grupo.pessoa, tiposPorNome, arquivo: arquivo.nome, quem: eu.email, agora, marcaDoServidor: marca },
        ),
      ),
    )
    const apagar = aGravar.flatMap(({ plano }) => plano.saem)

    setEtapa('gravando')
    try {
      await gravarImportacao({
        area,
        apagar,
        apagarTipos: difTipos ? difTipos.saem.map((t) => t.id) : [],
        apagarPalavras: difPalavras ? difPalavras.saem.map((p) => p.id) : [],
        tipos: difTipos ? leitura.tipos : [],
        palavras: difPalavras ? leitura.palavras : [],
        listas: vaiGravarListas ? listasNovas : null,
        listasAtuais: listas,
        demandas,
        aoAvancar: (feitas, total) => setProgresso({ feitas, total }),
      })
      esquecerHistorico(area)
      setResultado([
        demandas.length > 0 && plural(demandas.length, 'demanda importada', 'demandas importadas'),
        apagar.length > 0 && plural(apagar.length, 'demanda importada antes saiu', 'demandas importadas antes saíram'),
        difTipos && `Tipos de atividade: ${resumoDaTabela(difTipos, true)}`,
        difPalavras && `Palavras-chave: ${resumoDaTabela(difPalavras, true)}`,
        vaiGravarListas && 'Listas de Público e Solicitante atualizadas',
      ].filter(Boolean))
      setEtapa('pronto')
    } catch (e) {
      setErro(`A gravação parou no meio: ${mensagemDeErro(e)} Confira os dados antes de tentar de novo.`)
      setExistentes({})
      setEtapa('revisar')
    }
  }

  const opcoesPessoa = (
    <>
      <option value="">Não importar</option>
      {daArea.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nome}
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
            {arquivo.nome}
          </h2>
          <button type="button" className="botao botao--secundario" onClick={recomecar}>
            Escolher outro arquivo
          </button>
        </div>
        <p>
          Área: <strong>{nomeDaArea}</strong>
        </p>
        {erro && (
          <p className="aviso aviso--erro" role="alert">
            <TriangleAlert aria-hidden="true" />
            {erro}
          </p>
        )}
        <h3 className="bloco__subtitulo">1. Abas identificadas</h3>
        <table className="tabela tabela--compacta">
          <thead>
            <tr>
              <th>Aba</th>
              <th>O que é</th>
              <th>Linhas</th>
            </tr>
          </thead>
          <tbody>
            {leitura.abas.map((a) => (
              <tr key={a.aba}>
                <td data-rotulo="Aba">
                  <strong>{a.aba}</strong>
                  {a.problema && <span className="campo__erro">{a.problema}</span>}
                </td>
                <td data-rotulo="O que é">
                  <select value={a.papel} onChange={(e) => setPapeis((atual) => ({ ...atual, [a.aba]: e.target.value }))} aria-label={`O que é a aba ${a.aba}`}>
                    {Object.entries(PAPEIS).map(([id, rotulo]) => (
                      <option key={id} value={id}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-rotulo="Linhas" className="numero">
                  {a.papel === 'ignorar' ? '' : a.linhas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="bloco__subtitulo">2. O que importar</h3>
        <div className="opcoes">
          {[
            ['tipos', `Tipos de atividade (${leitura.tipos.length})`, leitura.tipos.length],
            ['palavras', `Palavras-chave (${leitura.palavras.length})`, leitura.palavras.length],
            ['demandas', `Demandas (${leitura.demandas.length})`, leitura.demandas.length],
            ['listas', 'Público e Solicitante novos', temListasNovas],
          ].map(([chave, rotulo, existe]) => (
            <label key={chave} className="opcao">
              <input type="checkbox" checked={Boolean(existe) && incluir[chave]} disabled={!existe} onChange={(e) => setIncluir((a) => ({ ...a, [chave]: e.target.checked }))} />
              {rotulo}
            </label>
          ))}
        </div>
      </section>

      {difTipos && <PreviaTabela titulo={`Tipos de atividade de ${nomeDaArea}`} diferenca={difTipos} nome={(t) => t.nome} />}
      {difPalavras && <PreviaTabela titulo={`Palavras-chave de ${nomeDaArea}`} diferenca={difPalavras} nome={(p) => p.palavra} />}

      {incluir.demandas && leitura.demandas.length > 0 && (
        <section className="bloco">
          <h2 className="bloco__titulo">Demandas</h2>
          {leitura.temResponsavel ? (
            <>
              <p className="texto-suave">Confira de quem é cada demanda, pela coluna Responsável. Só aparecem pessoas de {nomeDaArea}.</p>
              <table className="tabela tabela--compacta">
                <thead>
                  <tr>
                    <th>Na planilha</th>
                    <th>Linhas</th>
                    <th>Pessoa</th>
                  </tr>
                </thead>
                <tbody>
                  {valoresResponsavel.map(({ chave, valor, linhas }) => (
                    <tr key={chave}>
                      <td data-rotulo="Na planilha">
                        <strong>{valor}</strong>
                      </td>
                      <td data-rotulo="Linhas" className="numero">
                        {linhas}
                      </td>
                      <td data-rotulo="Pessoa">
                        <select value={pessoaPorValor[chave] ?? ''} onChange={(e) => setEscolhasPorValor((a) => ({ ...a, [chave]: e.target.value }))} aria-label={`Pessoa para ${valor}`}>
                          {opcoesPessoa}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {leitura.demandas.some((l) => !l.responsavel) && (
                    <tr>
                      <td data-rotulo="Na planilha">
                        <span className="etiqueta etiqueta--alerta">Sem Responsável</span>
                      </td>
                      <td data-rotulo="Linhas" className="numero">
                        {leitura.demandas.filter((l) => !l.responsavel).length}
                      </td>
                      <td data-rotulo="Pessoa">
                        <select value={pessoaPadrao} onChange={(e) => setPadraoEscolhido(e.target.value)} aria-label="Pessoa para linhas sem Responsável">
                          {opcoesPessoa}
                        </select>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <label className="campo campo--compacto">
              <span className="campo__rotulo">Responsável pelas demandas</span>
              <select value={pessoaPadrao} onChange={(e) => setPadraoEscolhido(e.target.value)}>
                {opcoesPessoa}
              </select>
            </label>
          )}
          {!daArea.length && <p className="aviso aviso--erro">Nenhuma pessoa ativa em {nomeDaArea}. Cadastre em Pessoas antes de importar demandas.</p>}

          <label className="opcao">
            <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
            <span>
              <strong>Substituir histórico</strong>: apaga antes as demandas importadas da pessoa nos meses da planilha e grava as novas.
              Demandas criadas pelo cronômetro nunca são apagadas.
            </span>
          </label>

          {planos.length > 0 && (
            <table className="tabela tabela--compacta">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Mês</th>
                  <th>Entram</th>
                  <th>Saem</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {planos.map(({ grupo, situacao, plano }) => (
                  <tr key={grupo.chave}>
                    <td data-rotulo="Pessoa">{grupo.pessoa.nome}</td>
                    <td data-rotulo="Mês">{formatarMes(grupo.mes)}</td>
                    <td data-rotulo="Entram" className="numero">
                      {plano ? plano.entram : ''}
                    </td>
                    <td data-rotulo="Saem" className="numero">
                      {plano ? plano.saem.length : ''}
                    </td>
                    <td data-rotulo="Situação">
                      {situacao.carregando && <span className="texto-suave">Conferindo...</span>}
                      {situacao.erro && <span className="campo__erro">{situacao.erro}</span>}
                      {plano?.pular && <span className="etiqueta etiqueta--alerta">Mês já importado: fica de fora</span>}
                      {plano && !plano.pular && plano.saem.length > 0 && <span className="etiqueta">Substitui o que foi importado</span>}
                      {plano && !plano.pular && !plano.saem.length && <span className="etiqueta">Mês novo</span>}
                      {plano?.doCronometro > 0 && <span className="tabela__detalhe">{plural(plano.doCronometro, 'demanda do cronômetro fica', 'demandas do cronômetro ficam')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {planos.some((p) => p.plano?.pular) && (
            <p className="aviso aviso--erro">
              <TriangleAlert aria-hidden="true" />
              Alguns meses já foram importados e ficam de fora para não duplicar. Marque "Substituir histórico" para trocar pelos dados desta planilha.
            </p>
          )}
          {semPessoa > 0 && (
            <p className="aviso aviso--erro">
              <TriangleAlert aria-hidden="true" />
              {plural(semPessoa, 'linha está sem pessoa e não será importada', 'linhas estão sem pessoa e não serão importadas')}.
            </p>
          )}
        </section>
      )}

      {(linhasComErro.length > 0 || linhasComAviso.length > 0) && (
        <section className="bloco">
          <h2 className="bloco__titulo">Pontos de atenção</h2>
          {linhasComErro.length > 0 && (
            <details className="detalhes" open>
              <summary className="texto-alerta">{plural(linhasComErro.length, 'linha não será importada', 'linhas não serão importadas')}</summary>
              <ul>
                {linhasComErro.map((l) => (
                  <li key={`${l.aba}-${l.linha}`}>
                    {l.aba}, linha {l.linha}: {l.erro}
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
            : incluir.demandas && grupos.length
              ? `Demandas: ${totalEntram} entram e ${totalSaem} saem.`
              : 'Confira a prévia e importe.'}
        </p>
        <button type="button" className="botao botao--principal botao--grande-largo" onClick={importar} disabled={conferindo || comErroDeConsulta || nadaParaGravar}>
          <CircleCheck aria-hidden="true" />
          Importar
        </button>
      </section>
      {janelaConfirmar}
    </>
  )
}

// Prévia de uma tabela que será substituída: o que entra, sai e muda.
function PreviaTabela({ titulo, diferenca, nome }) {
  const linhas = [
    ...diferenca.entram.map((item) => ({ chave: `e-${nome(item)}`, nome: nome(item), situacao: 'Entra', detalhe: '' })),
    ...diferenca.mudam.map((item) => ({ chave: `m-${item.nome}`, nome: item.nome, situacao: 'Muda', detalhe: item.mudancas.join('; ') })),
    ...diferenca.saem.map((item) => ({ chave: `s-${nome(item)}`, nome: nome(item), situacao: 'Sai', detalhe: '' })),
  ]
  return (
    <section className="bloco">
      <h2 className="bloco__titulo">{titulo}</h2>
      <p className="texto-suave">
        A lista da planilha substitui a atual: {resumoDaTabela(diferenca)} e{' '}
        {plural(diferenca.iguais, 'continua igual', 'continuam iguais')}.
      </p>
      {linhas.length > 0 && (
        <details className="detalhes" open={linhas.length <= 12}>
          <summary>Ver o que muda</summary>
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th>Item</th>
                <th>Situação</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.chave}>
                  <td data-rotulo="Item">
                    <strong>{l.nome}</strong>
                  </td>
                  <td data-rotulo="Situação">
                    <span className={`etiqueta ${l.situacao === 'Sai' ? 'etiqueta--alerta' : ''}`}>{l.situacao}</span>
                  </td>
                  <td data-rotulo="Detalhe">{l.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}
