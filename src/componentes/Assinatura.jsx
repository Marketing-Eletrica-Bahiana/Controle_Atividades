export default function Assinatura({ clara = false }) {
  return (
    <p className={`assinatura ${clara ? 'assinatura--clara' : ''}`}>
      <span className="assinatura__hashtag">#EnergiaBahiana</span>
      <span>Mais forte por você!</span>
    </p>
  )
}
