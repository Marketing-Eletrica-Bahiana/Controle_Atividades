import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartColumn, ChevronLeft, ChevronRight, Maximize, X } from 'lucide-react'
import Assinatura from '../../componentes/Assinatura.jsx'
import CampoData from '../../componentes/CampoData.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import Grafico, { configBarras, configEvolucao, configRosca } from '../../componentes/Grafico.jsx'
import Indicadores from '../../componentes/Indicadores.jsx'
import Logo from '../../componentes/Logo.jsx'
import { SeletorDeAreas, SeletorMes, useAreasVisiveis, useMesEscolhido } from '../../componentes/Seletores.jsx'
import { useDemandasDosMeses } from '../../dados/demandas.js'
import { formatarData, formatarMes, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { evolucaoMensal, horasPor, principais, quantidadePor, tempoMedioPorTipo } from '../../lib/painel.js'
import { mesesEntre, resumoDoPeriodo, segundaDaSemana, somarDias, tempoPorDia } from '../../lib/semana.js'
import { formatarTempo } from '../../lib/tempo.js'

const INICIO_DO_HISTORICO = '2026-07-01'

const ultimoDiaDoMes = (mes) => {
  const [ano, numero] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(Date.UTC(ano, numero, 0)).getUTCDate()).padStart(2, '0')}`
}

// Painel para gestão e diretoria: fundo branco, letras grandes, sem mascotes. Tem modo apresentação.
export default function Painel() {
  const areas = useAreasVisiveis()
  const [tipoDePeriodo, setTipoDePeriodo] = useState('mes')
  const [mes, setMes] = useMesEscolhido()
  const [segunda, setSegunda] = useState(() => segundaDaSemana())
  const hoje = hojeISO()
  const [de, setDe] = useState(`${hoje.slice(0, 7)}-01`)
  const [ate, setAte] = useState(hoje)
  const [pessoa, setPessoa] = useState('')
  const [apresentacao, setApresentacao] = useState(false)
  const palco = useRef(null)

  const intervaloValido = de && ate && de <= ate
  const periodo =
    tipoDePeriodo === 'semana'
      ? { inicio: segunda, fim: somarDias(segunda, 6), texto: `${formatarData(segunda)} a ${formatarData(somarDias(segunda, 5))}` }
      : tipoDePeriodo === 'mes'
        ? { inicio: `${mes}-01`, fim: ultimoDiaDoMes(mes), texto: formatarMes(mes) }
        : { inicio: intervaloValido ? de : hoje, fim: intervaloValido ? ate : hoje, texto: intervaloValido ? `${formatarData(de)} a ${formatarData(ate)}` : '' }

  // Carrega de julho de 2026 até o fim do período (ou até hoje), para a evolução mês a mês.
  const primeiro = periodo.inicio < INICIO_DO_HISTORICO ? periodo.inicio : INICIO_DO_HISTORICO
  const ultimo = periodo.fim > hoje ? periodo.fim : hoje
  const meses = mesesEntre(primeiro, ultimo)
  const consulta = useDemandasDosMeses(areas.ids, meses)
  const demandas = useMemo(() => consulta.dados ?? [], [consulta.dados])

  const pessoas = useMemo(() => {
    const mapa = new Map(demandas.map((d) => [d.responsavelEmail, d.responsavelNome]))
    return [...mapa.entries()].sort((a, b) => String(a[1]).localeCompare(b[1], 'pt-BR'))
  }, [demandas])
  const daPessoa = useMemo(() => (pessoa ? demandas.filter((d) => d.responsavelEmail === pessoa) : demandas), [demandas, pessoa])
  const itens = useMemo(() => tempoPorDia(daPessoa, periodo.inicio, periodo.fim), [daPessoa, periodo.inicio, periodo.fim])
  const resumo = resumoDoPeriodo(itens, periodo.inicio, periodo.fim)
  const mesesDaEvolucao = mesesEntre(INICIO_DO_HISTORICO, hoje)
  const evolucao = useMemo(() => evolucaoMensal(daPessoa, mesesDaEvolucao), [daPessoa, mesesDaEvolucao.join()])

  // Sai do modo apresentação quando a tela cheia é fechada (Esc).
  useEffect(() => {
    const aoMudar = () => !document.fullscreenElement && setApresentacao(false)
    document.addEventListener('fullscreenchange', aoMudar)
    return () => document.removeEventListener('fullscreenchange', aoMudar)
  }, [])

  useEffect(() => {
    if (apresentacao && palco.current && !document.fullscreenElement) palco.current.requestFullscreen?.().catch(() => {})
  }, [apresentacao])

  function sairDaApresentacao() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setApresentacao(false)
  }

  const indicadores = [
    { rotulo: 'Horas no período', valor: formatarTempo(resumo.totalSeg) },
    { rotulo: 'Demandas', valor: resumo.demandas },
    { rotulo: 'Tempo economizado com IA', valor: formatarTempo(resumo.economizadoMinSeg), detalhe: `até ${formatarTempo(resumo.economizadoMaxSeg)}` },
    { rotulo: 'Demandas com IA', valor: `${resumo.porcentagemIA}%` },
  ]

  const conteudo = (escuro) => (
    <>
      <Indicadores itens={indicadores} grande={escuro} />
      {consulta.carregando ? (
        <CarregandoBloco />
      ) : (
        <Graficos itens={itens} evolucao={evolucao} nomeDaArea={areas.nomeDaArea} escuro={escuro} />
      )}
    </>
  )

  return (
    <section className="pagina pagina--painel">
      <header className="pagina__cabecalho">
        <div className="bloco__cabecalho">
          <h1 className="titulo-pagina">
            <ChartColumn aria-hidden="true" />
            Painel
          </h1>
          <button type="button" className="botao botao--principal" onClick={() => setApresentacao(true)}>
            <Maximize aria-hidden="true" />
            Modo apresentação
          </button>
        </div>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <section className="bloco">
        <div className="filtros">
          <SeletorDeAreas areas={areas} />
          <label className="campo campo--compacto">
            <span className="campo__rotulo">Período</span>
            <select value={tipoDePeriodo} onChange={(e) => setTipoDePeriodo(e.target.value)}>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="intervalo">Intervalo</option>
            </select>
          </label>
          {tipoDePeriodo === 'mes' && <SeletorMes mes={mes} aoMudar={setMes} />}
          {tipoDePeriodo === 'semana' && (
            <div className="campo campo--compacto">
              <span className="campo__rotulo">Semana</span>
              <div className="seletor-periodo">
                <button type="button" className="botao-icone" onClick={() => setSegunda(somarDias(segunda, -7))} aria-label="Semana anterior">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <strong>{periodo.texto}</strong>
                <button type="button" className="botao-icone" onClick={() => setSegunda(somarDias(segunda, 7))} aria-label="Próxima semana">
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          {tipoDePeriodo === 'intervalo' && (
            <>
              <CampoData rotulo="De" valor={de} aoMudar={setDe} compacto />
              <CampoData rotulo="Até" valor={ate} aoMudar={setAte} compacto erro={de && ate && de > ate ? 'O fim vem antes do início.' : ''} />
            </>
          )}
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
        </div>
      </section>

      {consulta.erro && <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>}
      {!apresentacao && conteudo(false)}

      {apresentacao && (
        <div className="apresentacao" ref={palco}>
          <header className="apresentacao__topo">
            <Logo formato="linha" cor="branco" altura={40} />
            <div className="apresentacao__titulo">
              <strong>Painel de Atividades</strong>
              <span>
                {areas.nome} · {periodo.texto}
                {pessoa && ` · ${pessoas.find(([e]) => e === pessoa)?.[1] ?? ''}`}
              </span>
            </div>
            <button type="button" className="botao botao--claro" onClick={sairDaApresentacao}>
              <X aria-hidden="true" />
              Sair
            </button>
          </header>
          <div className="apresentacao__conteudo">{conteudo(true)}</div>
          <footer className="apresentacao__rodape">
            <Assinatura clara />
          </footer>
        </div>
      )}
    </section>
  )
}

function Graficos({ itens, evolucao, nomeDaArea, escuro }) {
  const configs = useMemo(() => {
    const porArea = horasPor(itens, (d) => nomeDaArea(d.area))
    const porTipo = principais(quantidadePor(itens, (d) => d.tipo), 10, 'quantidade')
    const medio = tempoMedioPorTipo(itens).slice(0, 10)
    const porPessoa = horasPor(itens, (d) => d.responsavelNome)
    const porPublico = quantidadePor(itens, (d) => d.publico)
    const demandasPorSolicitante = principais(quantidadePor(itens, (d) => d.solicitante), 10, 'quantidade')
    const horasPorSolicitante = principais(horasPor(itens, (d) => d.solicitante), 10, 'segundos')
    return {
      demandasPorSolicitante: {
        vazio: !demandasPorSolicitante.length,
        config: configBarras({ rotulos: demandasPorSolicitante.map((x) => x.rotulo), valores: demandasPorSolicitante.map((x) => x.quantidade), horizontal: true, escuro }),
      },
      horasPorSolicitante: {
        vazio: !horasPorSolicitante.length,
        config: configBarras({ rotulos: horasPorSolicitante.map((x) => x.rotulo), valores: horasPorSolicitante.map((x) => x.segundos), tempo: true, horizontal: true, escuro }),
      },
      porArea: { vazio: !porArea.length, config: configBarras({ rotulos: porArea.map((x) => x.rotulo), valores: porArea.map((x) => x.segundos), tempo: true, escuro }) },
      porTipo: { vazio: !porTipo.length, config: configBarras({ rotulos: porTipo.map((x) => x.rotulo), valores: porTipo.map((x) => x.quantidade), horizontal: true, escuro }) },
      medio: { vazio: !medio.length, config: configBarras({ rotulos: medio.map((x) => x.rotulo), valores: medio.map((x) => x.segundos), tempo: true, horizontal: true, escuro }) },
      porPessoa: { vazio: !porPessoa.length, config: configBarras({ rotulos: porPessoa.map((x) => x.rotulo), valores: porPessoa.map((x) => x.segundos), tempo: true, escuro }) },
      porPublico: { vazio: !porPublico.length, config: configRosca({ rotulos: porPublico.map((x) => x.rotulo), valores: porPublico.map((x) => x.quantidade), escuro }) },
      evolucao: {
        vazio: !evolucao.some((m) => m.segundos || m.demandas),
        config: configEvolucao({ rotulos: evolucao.map((m) => formatarMes(m.mes)), segundos: evolucao.map((m) => m.segundos), demandas: evolucao.map((m) => m.demandas), escuro }),
      },
    }
  }, [itens, evolucao, nomeDaArea, escuro])

  return (
    <div className="graficos">
      <Grafico titulo="Horas por área" configuracao={configs.porArea.config} vazio={configs.porArea.vazio} />
      <Grafico titulo="Horas por pessoa" configuracao={configs.porPessoa.config} vazio={configs.porPessoa.vazio} />
      <Grafico titulo="Demandas por tipo" configuracao={configs.porTipo.config} vazio={configs.porTipo.vazio} altura={380} />
      <Grafico titulo="Tempo médio por tipo" configuracao={configs.medio.config} vazio={configs.medio.vazio} altura={380} />
      <Grafico titulo="Demandas por solicitante" configuracao={configs.demandasPorSolicitante.config} vazio={configs.demandasPorSolicitante.vazio} />
      <Grafico titulo="Horas por solicitante" configuracao={configs.horasPorSolicitante.config} vazio={configs.horasPorSolicitante.vazio} />
      <Grafico titulo="Distribuição por público" configuracao={configs.porPublico.config} vazio={configs.porPublico.vazio} />
      <Grafico titulo="Evolução mês a mês desde julho de 2026" configuracao={configs.evolucao.config} vazio={configs.evolucao.vazio} />
    </div>
  )
}
