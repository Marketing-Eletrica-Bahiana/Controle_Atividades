import { FORMATOS, GRUPOS_INTERNOS, mudarPostagem, REDES } from '../lib/postagens.js'
import CampoData from './CampoData.jsx'
import { CampoLista } from './Campos.jsx'
import IconeDaRede from './IconeDaRede.jsx'

// Data, redes e formato de uma postagem. Usado no cartão, no cronômetro e no calendário.
// Os grupos internos aparecem quando a comunicação é interna ou quando o cartão já tem um deles marcado.
export default function CamposDaPostagem({ valor, aoMudar, interno = false }) {
  const mudar = (campo, novo) => aoMudar(mudarPostagem(valor, campo, novo))
  const redes = valor.redes ?? []
  const alternarRede = (rede) => mudar('redes', redes.includes(rede) ? redes.filter((r) => r !== rede) : [...redes, rede])
  const mostrarGrupos = interno || redes.some((rede) => GRUPOS_INTERNOS.includes(rede))

  const opcoes = (rotulo, lista) => (
    <fieldset className="campo">
      <legend className="campo__rotulo">{rotulo}</legend>
      <div className="janela-cartao__opcoes">
        {lista.map((rede) => (
          <label key={rede} className="opcao">
            <input type="checkbox" checked={redes.includes(rede)} onChange={() => alternarRede(rede)} />
            <IconeDaRede rede={rede} />
            {rede}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="campos-postagem">
      <div className="grade-duas grade-duas--formulario">
        <CampoData rotulo="Data da postagem" valor={valor.data} aoMudar={(v) => mudar('data', v)} />
        <CampoLista rotulo="Formato" valor={valor.formato} opcoes={FORMATOS} aoMudar={(v) => mudar('formato', v)} />
      </div>
      {opcoes('Redes', REDES)}
      {mostrarGrupos && opcoes('Grupos internos', GRUPOS_INTERNOS)}
      {valor.estimada && <p className="aviso aviso--erro">Data estimada a partir do Trello. Confira e ajuste se precisar.</p>}
      {valor.redeAConfirmar && <p className="aviso aviso--erro">O cartão do Trello não dizia a rede. Marque onde foi postado.</p>}
    </div>
  )
}
