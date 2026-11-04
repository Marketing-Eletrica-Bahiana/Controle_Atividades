import { useState } from 'react'
import { ExternalLink, Pause, Play, Send, Trash2 } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CampoData from '../../componentes/CampoData.jsx'
import { ErroCampo } from '../../componentes/Campos.jsx'
import CamposDaPostagem from '../../componentes/CamposDaPostagem.jsx'
import Janela from '../../componentes/Janela.jsx'
import { dataHora } from '../../componentes/JanelaDetalhes.jsx'
import { EtiquetaSituacao } from '../../componentes/Seletores.jsx'
import { comentar, excluirCartao, salvarCartao } from '../../dados/cartoes.js'
import { useDemandasDoCartao } from '../../dados/demandas.js'
import { formatarData } from '../../lib/datas.js'
import { veTodasAsAreas } from '../../lib/papeis.js'
import { ehPostagem, POSTAGEM_VAZIA, postagemPadrao } from '../../lib/postagens.js'
import { COLUNA_ENTREGUES, ETIQUETAS } from '../../lib/quadro.js'
import { formatarTempo } from '../../lib/tempo.js'

const ACOES = {
  criacao: 'criou o cartão',
  movimento: 'moveu o cartão',
  edicao: 'editou',
  importacao: 'importou do Trello',
}

const mostrarValor = (valor, campo) => {
  if (campo === 'prazo') return formatarData(valor)
  return Array.isArray(valor) ? valor.join(', ') : (valor ?? '')
}

export default function JanelaCartao({ cartao, ...resto }) {
  return (
    <Janela aberta={Boolean(cartao)} titulo="Cartão" aoFechar={resto.aoFechar} largura={720}>
      {cartao && <Conteudo key={cartao.id} cartao={cartao} {...resto} />}
    </Janela>
  )
}

function Conteudo({
  cartao, colunas, membros, membro, pessoa, podeMexer, podeApagar, podeUsarCronometro, rodando, temDemanda,
  nomeDaColuna, nomeDaPessoa, confirmar, aoCronometro, aoEntregar, aoFechar,
}) {
  const { avisar, executar } = useAvisos()
  const [dados, setDados] = useState({
    titulo: cartao.titulo ?? '',
    descricao: cartao.descricao ?? '',
    coluna: cartao.entregue ? COLUNA_ENTREGUES : cartao.coluna,
    etiquetas: cartao.etiquetas ?? [],
    responsaveis: cartao.responsaveis ?? [],
    prazo: cartao.prazo ?? null,
  })
  const [ehPost, setEhPost] = useState(ehPostagem(cartao))
  const [postagem, setPostagem] = useState({ ...POSTAGEM_VAZIA, ...cartao.postagem })
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }))
  const alternar = (campo, valor) =>
    setDados((atual) => ({ ...atual, [campo]: atual[campo].includes(valor) ? atual[campo].filter((v) => v !== valor) : [...atual[campo], valor] }))

  // Marcar Comunicação Externa já abre os campos da postagem; a pessoa desmarca se não for postagem.
  function alternarEtiqueta(etiqueta) {
    if (!dados.etiquetas.includes(etiqueta) && postagemPadrao([etiqueta])) setEhPost(true)
    alternar('etiquetas', etiqueta)
  }

  const pessoasDaLista = membros.filter((m) => m.ativo !== false || dados.responsaveis.includes(m.id))

  async function salvar(evento) {
    evento.preventDefault()
    if (!dados.titulo.trim()) {
      setErro('Informe o título do cartão.')
      return
    }
    setErro('')
    setOcupado(true)
    let mudou = false
    const deuCerto = await executar(async () => {
      const novos = { ...dados, titulo: dados.titulo.trim(), postagem: ehPost ? postagem : null }
      mudou = await salvarCartao(cartao, novos, membro.email, nomeDaColuna, mostrarValor)
    })
    setOcupado(false)
    if (!deuCerto) return
    avisar(mudou ? 'Cartão atualizado.' : 'Nada foi alterado.')
    aoFechar()
    if (dados.coluna === COLUNA_ENTREGUES && !cartao.entregue) aoEntregar(cartao)
  }

  async function excluir() {
    const sim = await confirmar({
      titulo: 'Excluir este cartão?',
      texto: `"${cartao.titulo}" sai do quadro. O tempo já registrado nas demandas continua valendo.`,
      botao: 'Excluir',
      perigo: true,
    })
    if (!sim) return
    if (await executar(() => excluirCartao(cartao), 'Cartão excluído.')) aoFechar()
  }

  return (
    <div className="janela-cartao">
      <form className="formulario" onSubmit={salvar} noValidate>
        <fieldset className="janela-cartao__campos" disabled={!podeMexer}>
          <label className="campo">
            <span className="campo__rotulo">Título</span>
            <input value={dados.titulo} onChange={(e) => mudar('titulo', e.target.value)} aria-invalid={Boolean(erro)} />
            <ErroCampo texto={erro} />
          </label>
          <div className="grade-duas grade-duas--formulario">
            <label className="campo">
              <span className="campo__rotulo">Coluna</span>
              <select value={dados.coluna} onChange={(e) => mudar('coluna', e.target.value)}>
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <CampoData rotulo="Prazo" valor={dados.prazo} aoMudar={(v) => mudar('prazo', v)} />
          </div>
          <fieldset className="campo">
            <legend className="campo__rotulo">Etiquetas</legend>
            <div className="janela-cartao__opcoes">
              {ETIQUETAS.map((etiqueta) => (
                <label key={etiqueta} className="opcao">
                  <input type="checkbox" checked={dados.etiquetas.includes(etiqueta)} onChange={() => alternarEtiqueta(etiqueta)} />
                  {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="campo">
            <legend className="campo__rotulo">Responsáveis</legend>
            <div className="janela-cartao__opcoes">
              {pessoasDaLista.map((m) => (
                <label key={m.id} className="opcao">
                  <input type="checkbox" checked={dados.responsaveis.includes(m.id)} onChange={() => alternar('responsaveis', m.id)} />
                  {m.nome}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="opcao">
            <input type="checkbox" checked={ehPost} onChange={(e) => setEhPost(e.target.checked)} />
            É postagem em rede social
          </label>
          {ehPost && <CamposDaPostagem valor={postagem} aoMudar={setPostagem} />}
          <label className="campo">
            <span className="campo__rotulo">Descrição</span>
            <textarea rows={5} value={dados.descricao} onChange={(e) => mudar('descricao', e.target.value)} />
          </label>
        </fieldset>
        <div className="janela-modal__acoes janela-cartao__acoes">
          {podeApagar && (
            <button type="button" className="botao botao--perigo" onClick={excluir}>
              <Trash2 aria-hidden="true" />
              Excluir
            </button>
          )}
          <button type="button" className="botao botao--secundario" onClick={aoFechar}>
            {podeMexer ? 'Cancelar' : 'Fechar'}
          </button>
          {podeMexer && (
            <button type="submit" className="botao botao--principal" disabled={ocupado}>
              Salvar
            </button>
          )}
        </div>
      </form>

      {cartao.trello?.url && (
        <a className="janela-cartao__trello" href={cartao.trello.url} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" />
          Ver anexos e imagens no Trello
        </a>
      )}

      <TempoDoCartao
        cartao={cartao}
        membro={membro}
        podeUsarCronometro={podeUsarCronometro}
        rodando={rodando}
        temDemanda={temDemanda}
        aoCronometro={() => aoCronometro(cartao)}
      />
      <Comentarios cartao={cartao} pessoa={pessoa} podeMexer={podeMexer} />

      {(cartao.historico ?? []).length > 0 && (
        <details className="janela-cartao__historico">
          <summary>Histórico</summary>
          <ol className="historico">
            {[...cartao.historico].reverse().map((h, i) => (
              <li key={i}>
                <span className="historico__quando">{dataHora(h.quando)}</span>
                <span>
                  <strong>{nomeDaPessoa(h.quem)}</strong> {ACOES[h.acao] ?? h.acao}
                  {h.acao === 'edicao' && h.campo && ` ${h.campo}`}
                  {(h.antes || h.depois) && (
                    <span className="texto-suave">
                      {': '}
                      {h.antes || 'vazio'} para {h.depois || 'vazio'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}

function TempoDoCartao({ cartao, membro, podeUsarCronometro, rodando, temDemanda, aoCronometro }) {
  const vinculos = cartao.vinculos ?? []
  const veTudo = veTodasAsAreas(membro.papel)
  const areas = vinculos.map((v) => v.area).filter((area) => veTudo || (membro.areas ?? []).includes(area))
  const { dados: demandas } = useDemandasDoCartao(cartao.id, areas)
  const lista = demandas ?? []
  const total = lista.reduce((soma, d) => soma + (d.tempoGastoSeg ?? 0), 0)

  return (
    <section className="janela-cartao__secao">
      <h3 className="bloco__subtitulo">Cronômetro</h3>
      {lista.length > 0 ? (
        <>
          <ul className="janela-cartao__tempos">
            {lista.map((d) => (
              <li key={d.id}>
                <span>{d.responsavelNome}</span>
                <EtiquetaSituacao status={d.status} />
                <span className="numero">{formatarTempo(d.tempoGastoSeg ?? 0)}</span>
              </li>
            ))}
          </ul>
          <p className="janela-cartao__total">
            Tempo total: <strong className="numero">{formatarTempo(total)}</strong>
          </p>
        </>
      ) : (
        <p className="texto-suave texto-pequeno">Ninguém registrou tempo neste cartão ainda.</p>
      )}
      {podeUsarCronometro && (
        <button type="button" className="botao botao--secundario" onClick={aoCronometro}>
          {rodando ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {rodando ? 'Pausar o cronômetro' : temDemanda ? 'Retomar o cronômetro' : 'Iniciar o cronômetro'}
        </button>
      )}
    </section>
  )
}

function Comentarios({ cartao, pessoa, podeMexer }) {
  const { executar } = useAvisos()
  const [texto, setTexto] = useState('')
  const lista = [...(cartao.comentarios ?? [])].reverse()

  async function enviar(evento) {
    evento.preventDefault()
    if (!texto.trim()) return
    if (await executar(() => comentar(cartao, texto, pessoa))) setTexto('')
  }

  return (
    <section className="janela-cartao__secao">
      <h3 className="bloco__subtitulo">Comentários</h3>
      {podeMexer && (
        <form className="janela-cartao__comentar" onSubmit={enviar}>
          <label className="campo">
            <span className="campo__rotulo">Novo comentário</span>
            <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <button type="submit" className="botao botao--secundario" disabled={!texto.trim()}>
            <Send aria-hidden="true" />
            Comentar
          </button>
        </form>
      )}
      {lista.length > 0 ? (
        <ol className="janela-cartao__comentarios">
          {lista.map((c, i) => (
            <li key={i}>
              <p className="janela-cartao__autor">
                <strong>{c.nome}</strong> <span className="texto-suave texto-pequeno">{dataHora(c.quando)}</span>
              </p>
              <p className="janela-cartao__texto">{c.texto}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="texto-suave texto-pequeno">Sem comentários.</p>
      )}
    </section>
  )
}
