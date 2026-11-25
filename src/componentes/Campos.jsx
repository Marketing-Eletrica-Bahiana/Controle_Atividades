import { CircleAlert } from 'lucide-react'
import { formatarTempo, lerTempoDigitado } from '../lib/tempo.js'

export function ErroCampo({ texto }) {
  if (!texto) return null
  return (
    <span className="campo__erro" role="alert">
      <CircleAlert aria-hidden="true" />
      {texto}
    </span>
  )
}

// Embaixo de um campo de tempo: como o que foi digitado vai ficar, quando não está escrito inteiro ("5:00" fica 00:05:00).
export function AjudaDoTempo({ texto }) {
  const segundos = lerTempoDigitado(texto)
  if (segundos == null) return null
  const inteiro = formatarTempo(segundos)
  if (String(texto).trim() === inteiro) return null
  return <span className="campo__ajuda">Fica {inteiro}</span>
}

export const ERRO_DO_TEMPO = (exemplo) => `Use HH:MM:SS ou MM:SS, por exemplo ${exemplo}.`

// Sim / Não em dois botões. Vazio quando ninguém escolheu ainda. "erro" aparece embaixo, em vermelho.
export function SimNao({ rotulo, valor, aoMudar, erro }) {
  return (
    <fieldset className={`campo ${erro ? 'sim-nao--faltando' : ''}`}>
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
      <ErroCampo texto={erro} />
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
