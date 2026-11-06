// Posição de algo que flutua junto de um campo (o calendário do campo de data), sem acesso à tela.
// Abre embaixo e alinhado à esquerda do campo; se não couber, vai mais para a esquerda ou para cima.
// Nunca passa da borda da tela, para as janelas, que rolam por dentro, não cortarem o que flutua.

const MARGEM = 8
const DISTANCIA = 4

// campo: retângulo do campo na tela ({ top, bottom, left }); tamanho e tela: { largura, altura }.
export function posicaoFlutuante(campo, tamanho, tela) {
  const left = Math.max(MARGEM, Math.min(campo.left, tela.largura - tamanho.largura - MARGEM))
  const embaixo = campo.bottom + DISTANCIA
  const emCima = campo.top - DISTANCIA - tamanho.altura
  if (embaixo + tamanho.altura <= tela.altura - MARGEM) return { top: embaixo, left }
  if (emCima >= MARGEM) return { top: emCima, left }
  // Não cabe nem embaixo nem em cima: fica inteiro na tela, encostado embaixo.
  return { top: Math.max(MARGEM, tela.altura - tamanho.altura - MARGEM), left }
}
