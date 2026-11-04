import { iconesDasRedes } from '../lib/marca.js'

// Ícone oficial da rede social, com o nome para quem passa o mouse ou usa leitor de tela.
export default function IconeDaRede({ rede }) {
  return <img className="icone-rede" src={iconesDasRedes[rede]} alt={rede} title={rede} />
}
