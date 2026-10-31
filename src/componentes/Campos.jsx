import { CircleAlert } from 'lucide-react'

export function ErroCampo({ texto }) {
  if (!texto) return null
  return (
    <span className="campo__erro" role="alert">
      <CircleAlert aria-hidden="true" />
      {texto}
    </span>
  )
}

// Sim / Não em dois botões. Vazio quando ninguém escolheu ainda.
export function SimNao({ rotulo, valor, aoMudar }) {
  return (
    <fieldset className="campo">
      <legend className="campo__rotulo">{rotulo}</legend>
      <div className="sim-nao" role="radiogroup">
        {['Sim', 'Não'].map((opcao) => (
          <button
            key={opcao}
            type="button"
            role="radio"
            aria-checked={valor === opcao}
            className={`sim-nao__opcao ${valor === opcao ? 'escolhido' : ''}`}
            onClick={() => aoMudar(valor === opcao ? '' : opcao)}
          >
            {opcao}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

// Lista suspensa a partir de config/listas; o valor atual aparece mesmo se saiu da lista.
export function CampoLista({ rotulo, valor, opcoes = [], aoMudar, vazio = 'Escolha', erro }) {
  const todas = valor && !opcoes.includes(valor) ? [valor, ...opcoes] : opcoes
  return (
    <label className="campo">
      <span className="campo__rotulo">{rotulo}</span>
      <select value={valor ?? ''} onChange={(e) => aoMudar(e.target.value)} aria-invalid={Boolean(erro)}>
        <option value="">{vazio}</option>
        {todas.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
      <ErroCampo texto={erro} />
    </label>
  )
}
