import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ImagePlus, Trash2 } from 'lucide-react'
import { useAcesso } from '../acesso/ProvedorAcesso.jsx'
import { enviarImagem, excluirImagem, lerImagemInteira, useImagens } from '../dados/imagens.js'
import { mensagemDeErro } from '../lib/erros.js'
import { nomeParaBaixar } from '../lib/imagens.js'
import { reduzirImagem } from '../lib/reduzirImagem.js'
import { useAvisos } from './Avisos.jsx'
import { useConfirmar } from './Confirmar.jsx'
import Janela from './Janela.jsx'

const quando = (ts) => {
  const data = ts?.toDate?.()
  if (!data) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(data)
    .replace(',', '')
}

// Imagens de um cartão do Quadro ou de uma demanda (desde 25/11/2026). "dono" é { cartaoId } ou { demandaId }.
// Com "podeAdicionar", a pessoa escolhe arquivos, arrasta para cá ou cola com Ctrl+V. Cada imagem é reduzida antes de
// ir para o banco (ver src/lib/imagens.js). Excluir: o admin, ou quem enviou.
export default function Imagens({ dono, podeAdicionar }) {
  const { membro } = useAcesso()
  const { avisar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const consulta = useImagens(dono)
  const imagens = consulta.dados ?? []
  const [enviando, setEnviando] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [aberta, setAberta] = useState(null)
  const entrada = useRef(null)
  const enviarRef = useRef(null)

  const podeApagar = (imagem) => membro.papel === 'admin' || (membro.papel === 'equipe' && imagem.enviadoPor === membro.email)

  // Imagem colada chega com o nome genérico "image.png": ganha um nome com a data e a hora.
  async function enviar(arquivos, { colada = false } = {}) {
    const lista = [...arquivos].filter((arquivo) => arquivo.type?.startsWith('image/'))
    if (!lista.length) {
      avisar('Escolha arquivos de imagem (JPG, PNG, WEBP ou GIF).', 'erro')
      return
    }
    let certas = 0
    for (let i = 0; i < lista.length; i += 1) {
      setEnviando({ atual: i + 1, total: lista.length })
      try {
        const reduzida = await reduzirImagem(lista[i])
        const nome = colada || !lista[i].name ? `Imagem colada em ${quando({ toDate: () => new Date() })}` : lista[i].name
        await enviarImagem(dono, { nome, ...reduzida }, { email: membro.email, nome: membro.nome })
        certas += 1
      } catch (erro) {
        avisar(mensagemDeErro(erro), 'erro')
      }
    }
    setEnviando(null)
    if (certas) avisar(certas === 1 ? 'Imagem adicionada.' : `${certas} imagens adicionadas.`)
  }
  enviarRef.current = enviar

  // Colar uma imagem (Ctrl+V) enquanto a galeria está na tela. Texto colado segue normal.
  useEffect(() => {
    if (!podeAdicionar) return undefined
    const aoColar = (evento) => {
      const arquivos = [...(evento.clipboardData?.files ?? [])].filter((arquivo) => arquivo.type.startsWith('image/'))
      if (!arquivos.length) return
      evento.preventDefault()
      enviarRef.current(arquivos, { colada: true })
    }
    window.addEventListener('paste', aoColar)
    return () => window.removeEventListener('paste', aoColar)
  }, [podeAdicionar])

  async function apagar(imagem) {
    const sim = await confirmar({
      titulo: 'Excluir imagem?',
      texto: `"${imagem.nome}" sai daqui para todo mundo. Não dá para desfazer.`,
      botao: 'Excluir',
      perigo: true,
    })
    if (!sim) return
    try {
      await excluirImagem(imagem)
      setAberta(null)
      avisar('Imagem excluída.')
    } catch (erro) {
      avisar(mensagemDeErro(erro), 'erro')
    }
  }

  const soltar = podeAdicionar
    ? {
        onDragOver: (evento) => {
          if (![...(evento.dataTransfer?.types ?? [])].includes('Files')) return
          evento.preventDefault()
          setArrastando(true)
        },
        onDragLeave: () => setArrastando(false),
        onDrop: (evento) => {
          if (!evento.dataTransfer?.files?.length) return
          evento.preventDefault()
          setArrastando(false)
          enviar(evento.dataTransfer.files)
        },
      }
    : {}

  return (
    <div className={`imagens ${arrastando ? 'imagens--arrastando' : ''}`} {...soltar}>
      {imagens.length > 0 ? (
        <ul className="imagens__grade">
          {imagens.map((imagem, i) => (
            <li key={imagem.id}>
              <button type="button" className="imagens__miniatura" onClick={() => setAberta(i)} title={imagem.nome} aria-label={`Abrir ${imagem.nome}`}>
                <img src={imagem.miniatura} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !consulta.carregando && <p className="texto-suave texto-pequeno">Nenhuma imagem ainda.</p>
      )}
      {consulta.erro && <p className="aviso aviso--erro">{mensagemDeErro(consulta.erro)}</p>}
      {podeAdicionar && (
        <div className="imagens__enviar">
          <button type="button" className="botao botao--secundario" onClick={() => entrada.current?.click()} disabled={Boolean(enviando)}>
            <ImagePlus aria-hidden="true" />
            {enviando ? `Enviando ${enviando.atual} de ${enviando.total}...` : 'Adicionar imagens'}
          </button>
          <span className="texto-suave texto-pequeno">ou arraste para cá, ou cole com Ctrl+V</span>
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(evento) => {
              enviar(evento.target.files)
              evento.target.value = ''
            }}
          />
        </div>
      )}
      <Visualizador
        imagens={imagens}
        indice={aberta}
        aoTrocar={setAberta}
        podeApagar={podeApagar}
        aoApagar={apagar}
        aoFechar={() => setAberta(null)}
      />
      {janelaConfirmar}
    </div>
  )
}

// A imagem grande: a miniatura aparece na hora e a imagem inteira entra assim que chega.
function Visualizador({ imagens, indice, aoTrocar, podeApagar, aoApagar, aoFechar }) {
  const imagem = indice != null ? imagens[indice] : null
  const [inteiras, setInteiras] = useState({})
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    if (!imagem || inteiras[imagem.id]) return undefined
    let ativo = true
    setFalhou(false)
    lerImagemInteira(imagem.id)
      .then((dados) => ativo && dados && setInteiras((atual) => ({ ...atual, [imagem.id]: dados })))
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [imagem, inteiras])

  const dados = imagem ? inteiras[imagem.id] : null
  return (
    <Janela aberta={Boolean(imagem)} titulo={imagem?.nome ?? 'Imagem'} aoFechar={aoFechar} largura={1000}>
      {imagem && (
        <div className="visualizador">
          <img className="visualizador__imagem" src={dados ?? imagem.miniatura} alt={imagem.nome} />
          {!dados && <p className="texto-suave texto-pequeno">{falhou ? 'Não deu para carregar a imagem inteira.' : 'Carregando a imagem inteira...'}</p>}
          <div className="visualizador__barra">
            <span className="texto-suave texto-pequeno">
              Enviada por {imagem.enviadoNome}
              {quando(imagem.criadoEm) && ` em ${quando(imagem.criadoEm)}`} · {imagem.largura} x {imagem.altura} px
            </span>
            <div className="visualizador__acoes">
              {imagens.length > 1 && (
                <>
                  <button type="button" className="botao-icone" aria-label="Imagem anterior" onClick={() => aoTrocar((indice - 1 + imagens.length) % imagens.length)}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span className="numero texto-pequeno">
                    {indice + 1} de {imagens.length}
                  </span>
                  <button type="button" className="botao-icone" aria-label="Próxima imagem" onClick={() => aoTrocar((indice + 1) % imagens.length)}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </>
              )}
              {dados && (
                <a className="botao botao--secundario botao--pequeno" href={dados} download={nomeParaBaixar(imagem.nome)}>
                  <Download aria-hidden="true" />
                  Baixar
                </a>
              )}
              {podeApagar(imagem) && (
                <button type="button" className="botao botao--perigo botao--pequeno" onClick={() => aoApagar(imagem)}>
                  <Trash2 aria-hidden="true" />
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Janela>
  )
}
