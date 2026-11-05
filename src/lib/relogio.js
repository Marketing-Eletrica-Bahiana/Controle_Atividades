// O cronômetro começa na hora do servidor, mas o tempo era contado pelo relógio do computador. Com o relógio
// atrasado, ele ficava parado em 00:00:00 até alcançar o servidor, e pausar antes disso gravava zero.
// Aqui fica a diferença entre os dois, medida a cada vez que a pessoa liga o cronômetro.

// O nome mudou de propósito: a primeira versão podia guardar uma medição errada (ver medirRelogio) em
// "controle-atividades:desvio-do-relogio", e esse valor não pode voltar a valer.
const CHAVE = 'controle-atividades:desvio-do-servidor'

function desvioGuardado() {
  try {
    return Number(globalThis.localStorage?.getItem(CHAVE)) || 0
  } catch {
    return 0
  }
}

let desvio = desvioGuardado()

// Hora atual em milissegundos, já corrigida para a hora do servidor.
export const agoraNoServidor = () => Date.now() + desvio

// O servidor gravou "horaDoServidor" no instante em que este computador marcava "horaLocal".
export function acertarRelogio(horaDoServidor, horaLocal = Date.now()) {
  desvio = horaDoServidor - horaLocal
  try {
    globalThis.localStorage?.setItem(CHAVE, String(desvio))
  } catch {
    // Sem armazenamento (janela anônima, por exemplo), vale só enquanto a página estiver aberta.
  }
}
