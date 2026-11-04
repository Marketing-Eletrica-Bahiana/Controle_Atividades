import { corDaPessoa, iniciais } from '../lib/quadro.js'

// Responsáveis de um cartão: uma bolinha com as iniciais, na cor de cada pessoa.
export default function BolinhasDePessoas({ emails = [], nomeDaPessoa, pequenas = false }) {
  if (!emails.length) return null
  return (
    <span className={`pessoas-cartao ${pequenas ? 'pessoas-cartao--pequenas' : ''}`}>
      {emails.map((email) => {
        const nome = nomeDaPessoa(email)
        return (
          <span key={email} className={`pessoa-cartao pessoa-cartao--${corDaPessoa(nome)}`} title={nome}>
            {iniciais(nome)}
          </span>
        )
      })}
    </span>
  )
}
