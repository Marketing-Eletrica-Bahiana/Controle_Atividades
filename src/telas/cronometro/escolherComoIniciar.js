// Ao ligar uma demanda com outra já rodando, a pessoa escolhe: rodar junto ou pausar a(s) outra(s). Pedido em
// 25/11/2026, quando o cronômetro passou a aceitar várias demandas ao mesmo tempo.
// Devolve { pausarOutras } para criarEIniciar e retomar, ou null se a pessoa cancelou.
export async function escolherComoIniciar(confirmar, nomeNovo, nomesRodando) {
  if (!nomesRodando.length) return { pausarOutras: false }
  const uma = nomesRodando.length === 1
  const quais = uma ? `"${nomesRodando[0]}" está rodando` : `${nomesRodando.length} demandas estão rodando (${nomesRodando.map((n) => `"${n}"`).join(', ')})`
  const resposta = await confirmar({
    titulo: 'Rodar junto ou pausar?',
    texto: `${quais}. "${nomeNovo}" pode rodar junto ${uma ? 'com ela' : 'com elas'}, cada uma contando o próprio tempo, ou ${uma ? 'ela pode ser pausada' : 'elas podem ser pausadas'} antes de começar.`,
    botao: 'Rodar junto',
    outro: uma ? 'Pausar a outra' : 'Pausar as outras',
  })
  if (resposta === true) return { pausarOutras: false }
  if (resposta === 'outro') return { pausarOutras: true }
  return null
}
