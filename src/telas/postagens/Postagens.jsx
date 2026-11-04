import { useMemo, useState } from 'react'
import { CalendarCheck, Plus } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import Indicadores from '../../componentes/Indicadores.jsx'
import { SeletorMes, useMesEscolhido } from '../../componentes/Seletores.jsx'
import { moverPostagem, useCartoesDoCalendario } from '../../dados/cartoes.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import {
  agruparPorDia, diasDoCalendario, postagensDoMes, postagensSemData, REDES, resumoDoMes, siglaDaRede, situacaoDaPostagem, SITUACOES_POSTAGEM,
} from '../../lib/postagens.js'
import { nomeDoDia } from '../../lib/semana.js'
import { useAcoesDoCartao } from '../quadro/useAcoesDoCartao.jsx'
import JanelaNovaPostagem from './JanelaNovaPostagem.jsx'

const SEM_CARTOES = []
const DIAS_DA_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export default function Postagens() {
  const { executar } = useAvisos()
  const [mes, setMes] = useMesEscolhido()
  const consulta = useCartoesDoCalendario(mes)
  const cartoes = consulta.dados ?? SEM_CARTOES
  const acoes = useAcoesDoCartao(cartoes)
  const { membro, podeMexer } = acoes

  const [rede, setRede] = useState('')
  const [novaEm, setNovaEm] = useState(undefined)
  const [arrastandoId, setArrastandoId] = useState(null)
  const [alvoDia, setAlvoDia] = useState(null)

  const hoje = hojeISO()
  const doMes = useMemo(() => postagensDoMes(cartoes, mes, rede), [cartoes, mes, rede])
  const porDia = useMemo(() => agruparPorDia(doMes), [doMes])
  const semData = useMemo(() => postagensSemData(cartoes), [cartoes])
  const dias = useMemo(() => diasDoCalendario(mes), [mes])
  const resumo = resumoDoMes(doMes, hoje)

  function soltarNoDia(dia) {
    const cartao = cartoes.find((c) => c.id === arrastandoId)
    setArrastandoId(null)
    setAlvoDia(null)
    if (!cartao || cartao.postagem?.data === dia) return
    executar(() => moverPostagem(cartao, dia, membro.email), `${cartao.titulo}: postagem em ${formatarData(dia)}.`)
  }

  const arraste = (cartao) =>
    podeMexer
      ? {
          draggable: true,
          onDragStart: (evento) => {
            evento.dataTransfer.effectAllowed = 'move'
            evento.dataTransfer.setData('text/plain', cartao.id)
            setArrastandoId(cartao.id)
          },
          onDragEnd: () => {
            setArrastandoId(null)
            setAlvoDia(null)
          },
        }
      : {}

  const postagemNaTela = (cartao) => (
    <PostagemDoCalendario
      key={cartao.id}
      cartao={cartao}
      hoje={hoje}
      arrastando={arrastandoId === cartao.id}
      arraste={arraste(cartao)}
      aoAbrir={() => acoes.abrir(cartao.id)}
    />
  )

  return (
    <section className="pagina pagina--postagens">
      <header className="pagina__cabecalho">
        <h1 className="titulo-pagina">
          <CalendarCheck aria-hidden="true" />
          Postagens
        </h1>
        <div className="linha-circuito" aria-hidden="true" />
      </header>

      <div className="quadro-filtros">
        <SeletorMes mes={mes} aoMudar={setMes} />
        <label className="campo">
          <span className="campo__rotulo">Rede</span>
          <select value={rede} onChange={(e) => setRede(e.target.value)}>
            <option value="">Todas</option>
            {REDES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {podeMexer && (
          <button type="button" className="botao botao--principal" onClick={() => setNovaEm(hoje.startsWith(mes) ? hoje : `${mes}-01`)}>
            <Plus aria-hidden="true" />
            Nova postagem
          </button>
        )}
      </div>

      {consulta.erro && <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>}
      {consulta.carregando ? (
        <CarregandoBloco />
      ) : (
        <>
          <Indicadores
            itens={[
              { rotulo: 'Postagens no mês', valor: resumo.total },
              { rotulo: 'Em produção', valor: resumo.producao },
              { rotulo: 'Programadas', valor: resumo.programada },
              { rotulo: 'Postadas', valor: resumo.postada },
              { rotulo: 'Atrasadas', valor: resumo.atrasada },
            ]}
          />

          <div className="calendario-postagens" aria-label="Calendário de postagens">
            {DIAS_DA_SEMANA.map((nome) => (
              <div key={nome} className="calendario-postagens__semana">
                {nome}
              </div>
            ))}
            {dias.map((dia, i) => {
              if (!dia) return <div key={`vazio-${i}`} className="dia-postagem dia-postagem--fora" aria-hidden="true" />
              const lista = porDia.get(dia) ?? []
              const classes = [
                'dia-postagem',
                dia === hoje && 'dia-postagem--hoje',
                alvoDia === dia && 'dia-postagem--alvo',
                !lista.length && 'dia-postagem--sem-itens',
              ]
              return (
                <div
                  key={dia}
                  className={classes.filter(Boolean).join(' ')}
                  onDragOver={(evento) => {
                    if (!arrastandoId) return
                    evento.preventDefault()
                    if (alvoDia !== dia) setAlvoDia(dia)
                  }}
                  onDrop={(evento) => {
                    evento.preventDefault()
                    soltarNoDia(dia)
                  }}
                >
                  <div className="dia-postagem__topo">
                    <span className="dia-postagem__numero numero">{Number(dia.slice(8))}</span>
                    <span className="dia-postagem__data numero">
                      {nomeDoDia(dia)}, {formatarData(dia)}
                    </span>
                    {podeMexer && (
                      <button type="button" className="botao-icone botao-icone--claro" aria-label={`Nova postagem em ${formatarData(dia)}`} onClick={() => setNovaEm(dia)}>
                        <Plus aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {lista.length > 0 && <ol className="dia-postagem__lista">{lista.map(postagemNaTela)}</ol>}
                </div>
              )
            })}
          </div>

          <p className="calendario-legenda">
            {Object.values(SITUACOES_POSTAGEM).map(({ rotulo, classe }) => (
              <span key={classe} className={`calendario-legenda__item ${classe}`}>
                {rotulo}
              </span>
            ))}
          </p>

          <section className="bloco">
            <h2 className="bloco__titulo">Sem data</h2>
            {semData.length ? (
              <>
                <p className="texto-suave texto-pequeno">
                  Postagens em andamento que ainda não têm dia. {podeMexer && 'Arraste para o calendário ou abra para informar a data.'}
                </p>
                <ol className="postagens-sem-data">{semData.map(postagemNaTela)}</ol>
              </>
            ) : (
              <p className="texto-suave texto-pequeno">Toda postagem em andamento já tem data. Mandou bem!</p>
            )}
          </section>
        </>
      )}

      <JanelaNovaPostagem
        aberta={novaEm !== undefined}
        dataInicial={novaEm}
        colunas={acoes.colunas.dados ?? SEM_CARTOES}
        pessoa={acoes.pessoa}
        aoFechar={() => setNovaEm(undefined)}
      />
      {acoes.janelas}
    </section>
  )
}

function PostagemDoCalendario({ cartao, hoje, arrastando, arraste, aoAbrir }) {
  const { rotulo, classe } = SITUACOES_POSTAGEM[situacaoDaPostagem(cartao, hoje)]
  const { redes = [], formato, estimada, redeAConfirmar } = cartao.postagem ?? {}
  const detalhes = [rotulo, ...redes, formato, estimada && 'data estimada', redeAConfirmar && 'rede a confirmar'].filter(Boolean).join(' · ')
  return (
    <li className={`postagem ${classe} ${arrastando ? 'postagem--arrastando' : ''}`} title={`${cartao.titulo} (${detalhes})`} {...arraste}>
      <button type="button" className="postagem__titulo" onClick={aoAbrir}>
        {estimada && <span aria-label="Data estimada">≈ </span>}
        {cartao.titulo}
      </button>
      {(redes.length > 0 || formato) && (
        <span className="postagem__detalhes">
          {redes.map((rede) => (
            <span key={rede} className="postagem__rede">
              {siglaDaRede(rede)}
            </span>
          ))}
          {formato && <span>{formato}</span>}
        </span>
      )}
    </li>
  )
}
