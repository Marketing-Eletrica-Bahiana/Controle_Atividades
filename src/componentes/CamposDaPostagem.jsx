import { FORMATOS, mudarPostagem, REDES } from '../lib/postagens.js'
import CampoData from './CampoData.jsx'
import { CampoLista } from './Campos.jsx'

// Data, redes e formato de uma postagem externa. Usado no cartão, no cronômetro e no calendário.
export default function CamposDaPostagem({ valor, aoMudar }) {
  const mudar = (campo, novo) => aoMudar(mudarPostagem(valor, campo, novo))
  const redes = valor.redes ?? []
  const alternarRede = (rede) => mudar('redes', redes.includes(rede) ? redes.filter((r) => r !== rede) : [...redes, rede])

  return (
    <div className="campos-postagem">
      <div className="grade-duas grade-duas--formulario">
        <CampoData rotulo="Data da postagem" valor={valor.data} aoMudar={(v) => mudar('data', v)} />
        <CampoLista rotulo="Formato" valor={valor.formato} opcoes={FORMATOS} aoMudar={(v) => mudar('formato', v)} />
      </div>
      <fieldset className="campo">
        <legend className="campo__rotulo">Redes</legend>
        <div className="janela-cartao__opcoes">
          {REDES.map((rede) => (
            <label key={rede} className="opcao">
              <input type="checkbox" checked={redes.includes(rede)} onChange={() => alternarRede(rede)} />
              {rede}
            </label>
          ))}
        </div>
      </fieldset>
      {valor.estimada && <p className="aviso aviso--erro">Data estimada a partir do Trello. Confira e ajuste se precisar.</p>}
      {valor.redeAConfirmar && <p className="aviso aviso--erro">O cartão do Trello não dizia a rede. Marque onde foi postado.</p>}
    </div>
  )
}
