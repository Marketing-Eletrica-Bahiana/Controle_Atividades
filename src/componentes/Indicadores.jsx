// Cartões de indicadores: gradiente principal, números grandes em Klavika (Lato Black de alternativa) em branco.
// Item com "aoClicar" vira botão (ex.: no Calendário, abre a lista daquela situação); "ativo" marca o que está aberto.
export default function Indicadores({ itens, grande = false }) {
  return (
    <div className={`indicadores ${grande ? 'indicadores--grandes' : ''}`}>
      {itens.map(({ rotulo, valor, detalhe, aoClicar, ativo }) => {
        const conteudo = (
          <>
            <span className="indicador__rotulo">{rotulo}</span>
            <strong className="indicador__valor">{valor}</strong>
            {detalhe && <span className="indicador__detalhe">{detalhe}</span>}
          </>
        )
        return aoClicar ? (
          <button key={rotulo} type="button" className={`indicador indicador--clicavel ${ativo ? 'indicador--ativo' : ''}`} aria-pressed={Boolean(ativo)} onClick={aoClicar}>
            {conteudo}
          </button>
        ) : (
          <div key={rotulo} className="indicador">
            {conteudo}
          </div>
        )
      })}
    </div>
  )
}
