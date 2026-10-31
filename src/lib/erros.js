const MENSAGENS = {
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar. Tente de novo.',
  'auth/cancelled-popup-request': 'A janela do Google foi fechada antes de terminar. Tente de novo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere as janelas deste site e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet. Confira a rede e tente de novo.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase. Avise a administração.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  'auth/user-disabled': 'Esta conta foi desativada no Google.',
  'permission-denied': 'Você não tem permissão para fazer isso.',
  unavailable: 'O servidor não respondeu. Confira a internet e tente de novo.',
}

export function mensagemDeErro(erro) {
  if (MENSAGENS[erro?.code]) return MENSAGENS[erro.code]
  // Erros criados pelo próprio sistema já vêm com a mensagem em português.
  if (!erro?.code && erro?.message) return erro.message
  if (erro?.code) return `Algo deu errado (${erro.code}). Tente de novo em instantes.`
  return 'Algo deu errado. Tente de novo em instantes.'
}
