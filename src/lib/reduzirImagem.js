// Reduz a imagem no navegador antes de guardar (ver src/lib/imagens.js). Sempre vira JPEG, com fundo branco no lugar
// da transparência. Devolve { dados, miniatura, largura, altura } (dados e miniatura em data URL).

import { LADO_MAXIMO, LADO_MINIATURA, LIMITE_DA_IMAGEM, LIMITE_DA_MINIATURA, QUALIDADES, tamanhoReduzido, tipoAceito } from './imagens.js'

function desenhar(bitmap, { largura, altura }) {
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const contexto = tela.getContext('2d')
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, largura, altura)
  contexto.imageSmoothingQuality = 'high'
  contexto.drawImage(bitmap, 0, 0, largura, altura)
  return tela
}

// Tenta as qualidades da melhor para a menor; se nem a menor couber, diminui o tamanho e tenta de novo.
function emJpeg(bitmap, maximo, limite) {
  let tamanho = tamanhoReduzido(bitmap.width, bitmap.height, maximo)
  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const tela = desenhar(bitmap, tamanho)
    for (const qualidade of QUALIDADES) {
      const dados = tela.toDataURL('image/jpeg', qualidade)
      if (dados.length <= limite) return { dados, ...tamanho }
    }
    tamanho = tamanhoReduzido(tamanho.largura, tamanho.altura, Math.round(Math.max(tamanho.largura, tamanho.altura) * 0.75))
  }
  throw new Error('A imagem ficou grande demais mesmo reduzida.')
}

export async function reduzirImagem(arquivo) {
  if (!tipoAceito(arquivo.type)) {
    throw new Error(`"${arquivo.name}" não é uma imagem que o navegador consegue abrir. Use JPG, PNG, WEBP ou GIF.`)
  }
  let bitmap
  try {
    bitmap = await createImageBitmap(arquivo)
  } catch {
    throw new Error(`Não deu para abrir "${arquivo.name}". Confira se a imagem não está corrompida.`)
  }
  try {
    const imagem = emJpeg(bitmap, LADO_MAXIMO, LIMITE_DA_IMAGEM)
    const miniatura = emJpeg(bitmap, LADO_MINIATURA, LIMITE_DA_MINIATURA)
    return { dados: imagem.dados, largura: imagem.largura, altura: imagem.altura, miniatura: miniatura.dados }
  } finally {
    bitmap.close?.()
  }
}
