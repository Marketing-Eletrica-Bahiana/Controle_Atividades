import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Janela from '../../componentes/Janela.jsx'
import { validarEmail } from '../../dados/membros.js'
import { DOMINIO_EMPRESA } from '../../firebase.js'
import { PAPEIS } from '../../lib/papeis.js'

const VAZIO = { email: '', nome: '', cargo: '', papel: 'equipe', areas: [], ativo: true }

const TITULOS = { novo: 'Nova pessoa', editar: 'Editar pessoa', liberar: 'Liberar acesso' }

// modo: "novo", "editar" ou "liberar" (pedido de acesso). Quem edita o próprio cadastro não muda papel nem situação.
export default function FormPessoa({ edicao, areas, ehVoce, aoSalvar, aoFechar }) {
  return (
    <Janela aberta={Boolean(edicao)} titulo={TITULOS[edicao?.modo] ?? ''} aoFechar={aoFechar}>
      {edicao && (
        <Formulario
          key={edicao.inicial?.email ?? 'novo'}
          edicao={edicao}
          areas={areas}
          ehVoce={ehVoce}
          aoSalvar={aoSalvar}
          aoFechar={aoFechar}
        />
      )}
    </Janela>
  )
}

function Formulario({ edicao, areas, ehVoce, aoSalvar, aoFechar }) {
  const [dados, setDados] = useState({ ...VAZIO, ...edicao.inicial })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const emailFixo = edicao.modo !== 'novo'
  const mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }))

  function alternarArea(id) {
    mudar('areas', dados.areas.includes(id) ? dados.areas.filter((a) => a !== id) : [...dados.areas, id])
  }

  async function enviar(evento) {
    evento.preventDefault()
    const novosErros = {}
    if (!emailFixo) novosErros.email = validarEmail(dados.email)
    if (!dados.nome.trim()) novosErros.nome = 'Informe o nome.'
    if (dados.papel === 'equipe' && dados.areas.length === 0) novosErros.areas = 'Escolha pelo menos uma área.'
    Object.keys(novosErros).forEach((campo) => !novosErros[campo] && delete novosErros[campo])
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    setSalvando(true)
    const deuCerto = await aoSalvar({ ...dados, email: dados.email.trim().toLowerCase() })
    setSalvando(false)
    if (deuCerto) aoFechar()
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <label className="campo">
        <span className="campo__rotulo">E-mail</span>
        <input
          type="email"
          value={dados.email}
          onChange={(e) => mudar('email', e.target.value)}
          placeholder={`nome@${DOMINIO_EMPRESA}`}
          disabled={emailFixo}
          aria-invalid={Boolean(erros.email)}
        />
        {erros.email && <ErroCampo texto={erros.email} />}
      </label>
      <label className="campo">
        <span className="campo__rotulo">Nome</span>
        <input value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} aria-invalid={Boolean(erros.nome)} />
        {erros.nome && <ErroCampo texto={erros.nome} />}
      </label>
      <label className="campo">
        <span className="campo__rotulo">Cargo (só informativo)</span>
        <input value={dados.cargo} onChange={(e) => mudar('cargo', e.target.value)} />
      </label>
      <label className="campo">
        <span className="campo__rotulo">Papel</span>
        <select value={dados.papel} onChange={(e) => mudar('papel', e.target.value)} disabled={ehVoce}>
          {Object.entries(PAPEIS).map(([id, { rotulo }]) => (
            <option key={id} value={id}>
              {rotulo}
            </option>
          ))}
        </select>
        {ehVoce && <span className="campo__ajuda">Você não pode mudar o seu próprio papel.</span>}
      </label>
      <fieldset className="campo">
        <legend className="campo__rotulo">Áreas em que trabalha</legend>
        <div className="opcoes">
          {areas.map((area) => (
            <label key={area.id} className="opcao">
              <input type="checkbox" checked={dados.areas.includes(area.id)} onChange={() => alternarArea(area.id)} />
              {area.nome}
              {area.ativa ? '' : ' (desativada)'}
            </label>
          ))}
        </div>
        {erros.areas && <ErroCampo texto={erros.areas} />}
      </fieldset>
      <label className="opcao">
        <input type="checkbox" checked={dados.ativo} onChange={(e) => mudar('ativo', e.target.checked)} disabled={ehVoce} />
        Acesso ativo
      </label>
      <div className="janela-modal__acoes">
        <button type="button" className="botao botao--secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>
          {edicao.modo === 'liberar' ? 'Liberar acesso' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export function ErroCampo({ texto }) {
  return (
    <span className="campo__erro" role="alert">
      <CircleAlert aria-hidden="true" />
      {texto}
    </span>
  )
}
