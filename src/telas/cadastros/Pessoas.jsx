import { useState } from 'react'
import { Pencil, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useAcesso } from '../../acesso/ProvedorAcesso.jsx'
import { useAvisos } from '../../componentes/Avisos.jsx'
import CarregandoBloco from '../../componentes/CarregandoBloco.jsx'
import { useConfirmar } from '../../componentes/Confirmar.jsx'
import { useAreas } from '../../dados/areas.js'
import { atualizarMembro, criarMembro, liberarPedido, recusarPedido, useMembros, useSolicitacoes } from '../../dados/membros.js'
import { formatarData, hojeISO } from '../../lib/datas.js'
import { mensagemDeErro } from '../../lib/erros.js'
import { PAPEIS } from '../../lib/papeis.js'
import FormPessoa from './FormPessoa.jsx'

export default function Pessoas() {
  const { membro: eu } = useAcesso()
  const { executar } = useAvisos()
  const [janelaConfirmar, confirmar] = useConfirmar()
  const membros = useMembros()
  const pedidos = useSolicitacoes()
  const { dados: areas } = useAreas()
  const [edicao, setEdicao] = useState(null)

  const nomeDaArea = (id) => areas?.find((a) => a.id === id)?.nome ?? id

  function salvar(dados) {
    if (edicao.modo === 'novo') return executar(() => criarMembro(dados.email, dados), `Cadastro de ${dados.nome} criado.`)
    if (edicao.modo === 'liberar') return executar(() => liberarPedido(dados.email, dados), `Acesso liberado para ${dados.nome}!`)
    return executar(() => atualizarMembro(dados.email, dados), 'Cadastro atualizado.')
  }

  async function recusar(pedido) {
    const sim = await confirmar({
      titulo: 'Recusar pedido de acesso',
      texto: `O pedido de ${pedido.nome} (${pedido.email}) será apagado. A pessoa pode pedir de novo depois.`,
      botao: 'Recusar pedido',
      perigo: true,
    })
    if (sim) executar(() => recusarPedido(pedido.id), 'Pedido recusado.')
  }

  return (
    <>
      {pedidos.dados?.length > 0 && (
        <section className="bloco bloco--destaque">
          <h2 className="bloco__titulo">
            Pedidos de acesso <span className="etiqueta">{pedidos.dados.length}</span>
          </h2>
          <ul className="lista-pedidos">
            {pedidos.dados.map((pedido) => (
              <li key={pedido.id} className="cartao lista-pedidos__item">
                <div>
                  <strong>{pedido.nome}</strong>
                  <span className="texto-suave texto-pequeno">
                    {pedido.email}
                    {pedido.criadoEm?.toDate && ` · pedido em ${formatarData(hojeISO(pedido.criadoEm.toDate()))}`}
                  </span>
                </div>
                <div className="acoes">
                  <button type="button" className="botao botao--secundario" onClick={() => recusar(pedido)}>
                    <UserX aria-hidden="true" />
                    Recusar
                  </button>
                  <button
                    type="button"
                    className="botao botao--principal"
                    onClick={() => setEdicao({ modo: 'liberar', inicial: { email: pedido.id, nome: pedido.nome ?? '' } })}
                  >
                    <UserCheck aria-hidden="true" />
                    Liberar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bloco">
        <div className="bloco__cabecalho">
          <h2 className="bloco__titulo">Pessoas cadastradas</h2>
          <button type="button" className="botao botao--principal" onClick={() => setEdicao({ modo: 'novo' })}>
            <UserPlus aria-hidden="true" />
            Nova pessoa
          </button>
        </div>
        {membros.carregando && <CarregandoBloco />}
        {membros.erro && <p className="aviso aviso--erro">{mensagemDeErro(membros.erro)}</p>}
        {membros.dados && (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Papel</th>
                <th>Áreas</th>
                <th>Acesso</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {membros.dados.map((pessoa) => (
                <tr key={pessoa.id}>
                  <td data-rotulo="Nome">
                    <div>
                      <strong>{pessoa.nome}</strong>
                      <span className="tabela__detalhe">{pessoa.id}</span>
                    </div>
                  </td>
                  <td data-rotulo="Cargo">{pessoa.cargo}</td>
                  <td data-rotulo="Papel">{PAPEIS[pessoa.papel]?.rotulo ?? pessoa.papel}</td>
                  <td data-rotulo="Áreas">{(pessoa.areas ?? []).map(nomeDaArea).join(', ')}</td>
                  <td data-rotulo="Acesso">
                    <span className={`etiqueta ${pessoa.ativo ? '' : 'etiqueta--alerta'}`}>{pessoa.ativo ? 'Liberado' : 'Desativado'}</span>
                  </td>
                  <td className="tabela__acoes">
                    <button
                      type="button"
                      className="botao-icone botao-icone--claro"
                      aria-label={`Editar ${pessoa.nome}`}
                      onClick={() => setEdicao({ modo: 'editar', inicial: { ...pessoa, email: pessoa.id } })}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <FormPessoa
        edicao={edicao}
        areas={areas ?? []}
        ehVoce={edicao?.inicial?.email === eu.email}
        aoSalvar={salvar}
        aoFechar={() => setEdicao(null)}
      />
      {janelaConfirmar}
    </>
  )
}
