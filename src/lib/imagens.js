// Imagens no cartão do Quadro e na demanda (pedido da pessoa em 25/11/2026). O projeto está no plano gratuito do
// Firebase, que não guarda arquivos: por escolha dela, a imagem é reduzida no navegador e guardada no próprio banco.
// Regras puras de tamanho aqui; o desenho no canvas fica em src/lib/reduzirImagem.js.

// Lado maior da imagem guardada: boa para ver e aprovar.
export const LADO_MAXIMO = 1600
// Lado maior da miniatura mostrada na lista.
export const LADO_MINIATURA = 320
// Um documento do Firestore aceita até 1 MiB. A imagem vai como texto (data URL em base64), com folga para os outros campos.
export const LIMITE_DA_IMAGEM = 900_000
export const LIMITE_DA_MINIATURA = 60_000
// Qualidades de JPEG tentadas, da melhor para a menor, até caber no limite.
export const QUALIDADES = [0.85, 0.75, 0.65, 0.55, 0.45]

// Novo tamanho com o lado maior no máximo "maximo", sem esticar imagem pequena.
export function tamanhoReduzido(largura, altura, maximo) {
  const maior = Math.max(largura, altura)
  if (!maior || maior <= maximo) return { largura: Math.round(largura), altura: Math.round(altura) }
  const escala = maximo / maior
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
}

// Nome do arquivo ao baixar: o original, trocando a extensão por .jpg (a imagem guardada é sempre JPEG).
export function nomeParaBaixar(nome) {
  const base = String(nome ?? '').trim().replace(/\.[^./\\]+$/, '') || 'imagem'
  return `${base}.jpg`
}

// Tipos que o navegador consegue abrir para reduzir. SVG e HEIC (fotos do iPhone) ficam de fora.
export const tipoAceito = (tipo) => /^image\/(jpeg|png|webp|gif|bmp)$/i.test(String(tipo ?? ''))

// Imagens de um cartão ou de uma demanda, das mais antigas para as mais novas.
export const ordenarImagens = (lista) =>
  [...(lista ?? [])].sort((a, b) => (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0) || String(a.id).localeCompare(String(b.id)))
