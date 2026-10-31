// Cartões de indicadores: gradiente principal, números grandes em Klavika (Lato Black de alternativa) em branco.
export default function Indicadores({ itens, grande = false }) {
  return (
    <div className={`indicadores ${grande ? 'indicadores--grandes' : ''}`}>
      {itens.map(({ rotulo, valor, detalhe }) => (
        <div key={rotulo} className="indicador">
          <span className="indicador__rotulo">{rotulo}</span>
          <strong className="indicador__valor">{valor}</strong>
          {detalhe && <span className="indicador__detalhe">{detalhe}</span>}
        </div>
      ))}
    </div>
  )
}
