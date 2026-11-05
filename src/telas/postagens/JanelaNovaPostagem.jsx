import { useState } from 'react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import { ErroCampo } from '../../componentes/Campos.jsx'
import CamposDaPostagem from '../../componentes/CamposDaPostagem.jsx'
import Janela from '../../componentes/Janela.jsx'
import { criarCartao } from '../../dados/cartoes.js'
import { formatarData } from '../../lib/datas.js'
import { etiquetasDasRedes, formatoDoNome, POSTAGEM_VAZIA } from '../../lib/postagens.js'
import { colunaDaEtiqueta } from '../../lib/quadro.js'

// Postagem criada direto no calendário: vira um cartão no Quadro, com a etiqueta que as redes escolhidas pedem.
export default function JanelaNovaPostagem({ aberta, dataInicial, colunas, pessoa, aoFechar }) {
  return (
    <Janela aberta={aberta} titulo="Nova postagem" aoFechar={aoFechar} largura={560}>
      {aberta && <Formulario dataInicial={dataInicial} colunas={colunas} pessoa={pessoa} aoFechar={aoFechar} />}
    </Janela>
  )
}

function Formulario({ dataInicial, colunas, pessoa, aoFechar }) {
  const { executar } = useAvisos()
  const [titulo, setTitulo] = useState('')
  const [postagem, setPostagem] = useState({ ...POSTAGEM_VAZIA, data: dataInicial })
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  // O formato vem do título até a pessoa escolher outro.
  const comFormato = { ...postagem, formato: postagem.formato || formatoDoNome(titulo) }
  const etiquetas = etiquetasDasRedes(comFormato.redes)

  async function enviar(evento) {
    evento.preventDefault()
    if (!titulo.trim()) {
      setErro('Informe o título da postagem.')
      return
    }
    setErro('')
    setOcupado(true)
    const deuCerto = await executar(
      () =>
        criarCartao(
          { titulo, coluna: colunaDaEtiqueta(etiquetas[0], colunas), etiquetas, responsaveis: [pessoa.email], postagem: comFormato },
          pessoa,
        ),
      comFormato.data ? `${titulo.trim()} no calendário em ${formatarData(comFormato.data)}.` : `${titulo.trim()} criada, ainda sem data.`,
    )
    setOcupado(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Reels Dia do Cliente" autoComplete="off" aria-invalid={Boolean(erro)} />
        <ErroCampo texto={erro} />
      </label>
      <CamposDaPostagem valor={comFormato} aoMudar={setPostagem} interno />
      <p className="texto-suave texto-pequeno">Ela também entra no Quadro, em {etiquetas[0]}, para ligar o cronômetro e acompanhar a produção.</p>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={ocupado}>
          Adicionar
        </button>
      </div>
    </form>
  )
}
