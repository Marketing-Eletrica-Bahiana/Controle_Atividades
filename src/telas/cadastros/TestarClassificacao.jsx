import { useMemo, useState } from 'react'
import { FlaskConical, Plus } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { ErroCampo } from '../../componentes/Campos.jsx'
import Janela from '../../componentes/Janela.jsx'
import SeletorArea, { useAreaEscolhida } from '../../componentes/SeletorArea.jsx'
import { useAreas } from '../../dados/areas.js'
import { useHistoricoDaArea } from '../../dados/demandas.js'
import { idDaPalavra, salvarPalavra, usePalavras, useTipos } from '../../dados/tipos.js'
import { classificar, palavrasDoNome, prepararHistorico, textoDaOrigem } from '../../lib/classificacao.js'
import { hojeISO, mesDe } from '../../lib/datas.js'
import { regraAutomatica } from '../../lib/regras.js'
import { normalizar } from '../../lib/texto.js'

// Roda a classificação em cada demanda da área, tirando a própria demanda do histórico.
function relatorioDeAcerto(lista, { palavras, tipos }) {
  const avaliadas = lista.filter((d) => d.tipo && d.nome && normalizar(d.nome) !== normalizar(d.tipo))
  const preparado = prepararHistorico(avaliadas)
  const erradas = []
  let acertos = 0
  avaliadas.forEach((demanda, i) => {
    const historico = preparado.filter((_, j) => j !== i)
    const resultado = classificar(demanda.nome, { historico, palavras, tipos, email: demanda.responsavelEmail, mesAtual: demanda.mes })
    if (resultado.tipo === demanda.tipo) acertos++
    else erradas.push({ ...demanda, sugerido: resultado.tipo, motivo: textoDaOrigem(resultado) || 'Sem pista' })
  })
  return { total: avaliadas.length, acertos, erradas }
}

export default function TestarClassificacao() {
  const { dados: areas } = useAreas()
  const [area, setArea] = useAreaEscolhida(areas)
  const { dados: tipos } = useTipos(area)
  const { dados: palavras } = usePalavras(area)
  const historicoBruto = useHistoricoDaArea(area)
  const historico = useMemo(() => prepararHistorico(historicoBruto ?? []), [historicoBruto])
  const [nome, setNome] = useState('')
  const [relatorio, setRelatorio] = useState(null)
  const [calculando, setCalculando] = useState(false)
  const [criando, setCriando] = useState(null)
  const nomeDaArea = areas?.find((a) => a.id === area)?.nome ?? ''

  const resultado = nome.trim() ? classificar(nome, { historico, palavras: palavras ?? [], tipos: tipos ?? [], mesAtual: mesDe(hojeISO()) }) : null
  const regra = nome.trim() ? regraAutomatica(nome, resultado?.tipo) : null

  function rodarRelatorio() {
    setCalculando(true)
    // Dá tempo da tela mostrar "Calculando" antes da conta.
    setTimeout(() => {
      setRelatorio({ area, ...relatorioDeAcerto(historicoBruto ?? [], { palavras: palavras ?? [], tipos: tipos ?? [] }) })
      setCalculando(false)
    }, 50)
  }

  // Sugestão de palavra-chave: a palavra mais longa do nome que ainda não é palavra-chave da área.
  function sugerirPalavra(nomeDaDemanda) {
    const existentes = new Set((palavras ?? []).map((p) => normalizar(p.palavra)))
    return [...palavrasDoNome(nomeDaDemanda)].filter((p) => !existentes.has(p)).sort((a, b) => b.length - a.length)[0] ?? ''
  }

  const relatorioAtual = relatorio?.area === area ? relatorio : null
  const porcento = relatorioAtual?.total ? Math.round((100 * relatorioAtual.acertos) / relatorioAtual.total) : 0

  return (
    <>
      <section className="bloco">
        <div className="bloco__cabecalho">
          <h2 className="bloco__titulo">
            <FlaskConical aria-hidden="true" />
            Testar classificação
          </h2>
          <SeletorArea areas={areas} valor={area} aoMudar={setArea} />
        </div>
        <label className="campo">
          <span className="campo__rotulo">Nome de uma demanda</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Reels Dia dos Pais" />
        </label>
        {resultado && (
          <div className="resultado-teste">
            <p>
              Tipo sugerido:{' '}
              {resultado.tipo ? <strong>{resultado.tipo}</strong> : <strong className="texto-alerta">Escolha o tipo (sem pista)</strong>}
            </p>
            {resultado.origem && <p className="texto-suave">{textoDaOrigem(resultado)}</p>}
            {resultado.alternativas.length > 0 && (
              <div className="alternativas">
                {resultado.alternativas.map((a) => (
                  <span key={a} className="etiqueta-clicavel">
                    {a}
                  </span>
                ))}
              </div>
            )}
            {regra && <p className="texto-suave">Regra automática: {regra.motivo} (Uso de IA {regra.usoIA}, Template {regra.usoTemplate}, Solicitante {regra.solicitante}).</p>}
          </div>
        )}
      </section>

      <section className="bloco">
        <div className="bloco__cabecalho">
          <div>
            <h2 className="bloco__titulo">Relatório de acerto em {nomeDaArea}</h2>
            <p className="texto-suave">
              Classifica cada demanda registrada como se fosse nova (sem ela mesma no histórico) e compara com o tipo que ela tem.
              Demandas sem nome próprio, só com a categoria, ficam de fora.
            </p>
          </div>
          <button type="button" className="botao botao--principal" onClick={rodarRelatorio} disabled={!historicoBruto || calculando}>
            {relatorioAtual ? 'Calcular de novo' : 'Calcular acerto'}
          </button>
        </div>
        {(calculando || !historicoBruto) && <CarregandoBloco texto={calculando ? 'Calculando...' : 'Carregando o histórico...'} />}
        {relatorioAtual && !calculando && (
          <>
            <div className="indicador-simples">
              <strong>{porcento}%</strong>
              <span>
                de acerto: {relatorioAtual.acertos} de {relatorioAtual.total} demandas
              </span>
            </div>
            {relatorioAtual.erradas.length > 0 && (
              <details className="detalhes" open>
                <summary>
                  {relatorioAtual.erradas.length === 1
                    ? '1 demanda com tipo diferente do sugerido'
                    : `${relatorioAtual.erradas.length} demandas com tipo diferente do sugerido`}
                </summary>
                <table className="tabela tabela--compacta tabela--com-titulo">
                  <thead>
                    <tr>
                      <th>Nome da Demanda</th>
                      <th>Tipo registrado</th>
                      <th>Sugerido</th>
                      <th>Motivo</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioAtual.erradas.map((d, i) => (
                      <tr key={`${d.nome}-${i}`}>
                        <td className="tabela__titulo">
                          <span className="nome-demanda" title={d.nome}>
                            {d.nome}
                          </span>
                        </td>
                        <td data-rotulo="Tipo registrado">{d.tipo}</td>
                        <td data-rotulo="Sugerido">{d.sugerido || <span className="texto-alerta">Nenhum</span>}</td>
                        <td data-rotulo="Motivo">{d.motivo}</td>
                        <td className="tabela__acoes">
                          <button
                            type="button"
                            className="botao botao--secundario botao--pequeno"
                            onClick={() => setCriando({ palavra: sugerirPalavra(d.nome), tipo: d.tipo, nome: d.nome })}
                          >
                            <Plus aria-hidden="true" />
                            Criar palavra-chave
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </>
        )}
      </section>

      <Janela aberta={Boolean(criando)} titulo="Criar palavra-chave" aoFechar={() => setCriando(null)} largura={480}>
        {criando && (
          <FormAtalho key={criando.nome} area={area} inicial={criando} palavras={palavras ?? []} tipos={tipos ?? []} aoFechar={() => setCriando(null)} />
        )}
      </Janela>
    </>
  )
}

function FormAtalho({ area, inicial, palavras, tipos, aoFechar }) {
  const { executar } = useAvisos()
  const [palavra, setPalavra] = useState(inicial.palavra)
  const [tipo, setTipo] = useState(inicial.tipo)
  const [erro, setErro] = useState('')

  async function enviar(evento) {
    evento.preventDefault()
    const texto = palavra.trim().toLowerCase()
    if (!texto) return setErro('Informe a palavra-chave.')
    if (palavras.some((p) => p.id === idDaPalavra(area, texto))) return setErro('Essa palavra-chave já existe nesta área.')
    if (await executar(() => salvarPalavra(area, { palavra: texto, tipo }), `Palavra-chave "${texto}" criada.`)) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <p className="texto-suave">Para: {inicial.nome}</p>
      <label className="campo">
        <span className="campo__rotulo">Palavra-chave</span>
        <input value={palavra} onChange={(e) => setPalavra(e.target.value)} autoFocus aria-invalid={Boolean(erro)} />
        <ErroCampo texto={erro} />
      </label>
      <label className="campo">
        <span className="campo__rotulo">Tipo sugerido</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {tipos.map((t) => (
            <option key={t.id} value={t.nome}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal">
          Criar
        </button>
      </div>
    </form>
  )
}
