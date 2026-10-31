import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import EstadoVazio from '../../componentes/EstadoVazio.jsx'
import Janela from '../../componentes/Janela.jsx'
import { AREAS_PADRAO, atualizarArea, criarArea, criarAreasPadrao, trocarOrdem, useAreas } from '../../dados/areas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { ErroCampo } from '../../componentes/Campos.jsx'

// Áreas nunca são apagadas, só desativadas.
export default function Areas() {
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const areas = useAreas()
  const [edicao, setEdicao] = useState(null)

  if (areas.carregando) return <CarregandoBloco />
  if (areas.erro) return <p className="aviso aviso--erro">{mensagemDeErro(areas.erro)}</p>

  const lista = areas.dados ?? []

  if (!lista.length) {
    return (
      <EstadoVazio titulo="Nenhuma área cadastrada ainda" texto="Comece pelas áreas padrão. Depois dá para criar outras.">
        <button
          type="button"
          className="botao botao--principal"
          onClick={() => executar(criarAreasPadrao, 'Áreas padrão criadas!')}
        >
          <Plus aria-hidden="true" />
          Criar {AREAS_PADRAO.map((a) => a.nome).join(', ')}
        </button>
      </EstadoVazio>
    )
  }

  async function alternarSituacao(area) {
    if (area.ativa) {
      const sim = await confirmar({
        titulo: `Desativar ${area.nome}?`,
        texto: 'A área some das escolhas do dia a dia, mas o histórico dela continua guardado. Dá para reativar quando quiser.',
        botao: 'Desativar',
        perigo: true,
      })
      if (!sim) return
    }
    executar(() => atualizarArea(area.id, { ativa: !area.ativa }), area.ativa ? 'Área desativada.' : 'Área reativada.')
  }

  async function salvar(nome) {
    if (edicao.area) return executar(() => atualizarArea(edicao.area.id, { nome }), 'Área renomeada.')
    const proximaOrdem = Math.max(0, ...lista.map((a) => a.ordem ?? 0)) + 1
    return executar(() => criarArea(nome, proximaOrdem), `Área ${nome} criada!`)
  }

  return (
    <section className="bloco">
      <div className="bloco__cabecalho">
        <h2 className="bloco__titulo">Áreas</h2>
        <button type="button" className="botao botao--principal" onClick={() => setEdicao({ area: null })}>
          <Plus aria-hidden="true" />
          Nova área
        </button>
      </div>
      <table className="tabela">
        <thead>
          <tr>
            <th>Ordem</th>
            <th>Área</th>
            <th>Código</th>
            <th>Situação</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {lista.map((area, i) => (
            <tr key={area.id}>
              <td data-rotulo="Ordem">
                <div className="acoes acoes--juntas">
                  <button
                    type="button"
                    className="botao-icone botao-icone--claro"
                    aria-label={`Subir ${area.nome}`}
                    disabled={i === 0}
                    onClick={() => executar(() => trocarOrdem(area, lista[i - 1]))}
                  >
                    <ArrowUp aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone botao-icone--claro"
                    aria-label={`Descer ${area.nome}`}
                    disabled={i === lista.length - 1}
                    onClick={() => executar(() => trocarOrdem(area, lista[i + 1]))}
                  >
                    <ArrowDown aria-hidden="true" />
                  </button>
                </div>
              </td>
              <td data-rotulo="Área">
                <strong>{area.nome}</strong>
              </td>
              <td data-rotulo="Código" className="texto-suave">
                {area.id}
              </td>
              <td data-rotulo="Situação">
                <span className={`etiqueta ${area.ativa ? '' : 'etiqueta--alerta'}`}>{area.ativa ? 'Ativa' : 'Desativada'}</span>
              </td>
              <td className="tabela__acoes">
                <button
                  type="button"
                  className="botao-icone botao-icone--claro"
                  aria-label={`Renomear ${area.nome}`}
                  onClick={() => setEdicao({ area })}
                >
                  <Pencil aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`botao-icone ${area.ativa ? 'botao-icone--perigo' : 'botao-icone--claro'}`}
                  aria-label={area.ativa ? `Desativar ${area.nome}` : `Reativar ${area.nome}`}
                  onClick={() => alternarSituacao(area)}
                >
                  {area.ativa ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <JanelaNome
        aberta={Boolean(edicao)}
        titulo={edicao?.area ? `Renomear ${edicao.area.nome}` : 'Nova área'}
        rotulo="Nome da área"
        inicial={edicao?.area?.nome ?? ''}
        aoSalvar={salvar}
        aoFechar={() => setEdicao(null)}
      />
      {janelaConfirmar}
    </section>
  )
}

// Janela com um único campo de texto (nova área, renomear área, renomear item de lista).
export function JanelaNome({ aberta, titulo, rotulo, inicial, aoSalvar, aoFechar }) {
  return (
    <Janela aberta={aberta} titulo={titulo} aoFechar={aoFechar} largura={440}>
      {aberta && <FormNome key={inicial} rotulo={rotulo} inicial={inicial} aoSalvar={aoSalvar} aoFechar={aoFechar} />}
    </Janela>
  )
}

function FormNome({ rotulo, inicial, aoSalvar, aoFechar }) {
  const [valor, setValor] = useState(inicial)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function enviar(evento) {
    evento.preventDefault()
    if (!valor.trim()) {
      setErro('Preencha este campo.')
      return
    }
    setSalvando(true)
    const deuCerto = await aoSalvar(valor.trim())
    setSalvando(false)
    if (deuCerto !== false) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">{rotulo}</span>
        <input value={valor} onChange={(e) => setValor(e.target.value)} autoFocus aria-invalid={Boolean(erro)} />
        {erro && <ErroCampo texto={erro} />}
      </label>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>
          Salvar
        </button>
      </div>
    </form>
  )
}
