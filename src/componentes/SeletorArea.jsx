import { useState } from 'react'

// Guarda a área escolhida; enquanto nada foi escolhido, usa a primeira área ativa.
export function useAreaEscolhida(areas) {
  const [escolhida, setEscolhida] = useState('')
  const lista = areas ?? []
  const valida = lista.some((a) => a.id === escolhida)
  const padrao = lista.find((a) => a.ativa)?.id ?? lista[0]?.id ?? ''
  return [valida ? escolhida : padrao, setEscolhida]
}

export default function SeletorArea({ areas, valor, aoMudar, rotulo = 'Área' }) {
  return (
    <label className="campo campo--compacto">
      <span className="campo__rotulo">{rotulo}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        {(areas ?? []).map((area) => (
          <option key={area.id} value={area.id}>
            {area.nome}
            {area.ativa ? '' : ' (desativada)'}
          </option>
        ))}
      </select>
    </label>
  )
}
