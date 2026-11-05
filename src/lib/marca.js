const base = import.meta.env.BASE_URL
const arquivo = (caminho) => `${base}marca/${caminho}`

// No par azul, os nomes dos arquivos estão trocados em relação ao formato (ver CLAUDE.md).
// Aqui cada logo é escolhido pelo formato real.
export const logos = {
  linha: {
    branco: arquivo('logos/Logotipo_Horizontal_Branco.png'),
    azul: arquivo('logos/Logotipo_Vertical_Azul.png'),
  },
  compacto: {
    branco: arquivo('logos/Logotipo_Vertical_Branco.png'),
    azul: arquivo('logos/Logotipo_Horizontal_Azul.png'),
  },
  icone: {
    branco: arquivo('logos/Icone_Branco.png'),
    azul: arquivo('logos/Icone_Azul.png'),
  },
}

// Parte visível de cada formato dentro do quadrado do arquivo, em pixels do arquivo (com 4px de folga).
export const caixasDosLogos = {
  linha: { x: 78, y: 464, largura: 905, altura: 149, lado: 1043 },
  compacto: { x: 115, y: 343, largura: 800, altura: 358, lado: 1043 },
  icone: { x: 9, y: 22, largura: 162, altura: 136, lado: 180 },
}

export const mascotes = {
  ebinho: arquivo('mascotes/Mascote_Ebinho.png'),
  ebinha: arquivo('mascotes/Mascote_Ebinha.png'),
}

export const iconesDasRedes = {
  Instagram: arquivo('icones/instagram.png'),
  LinkedIn: arquivo('icones/linkedin.png'),
  'LinkedIn do CAE': arquivo('icones/cae.png'),
  YouTube: arquivo('icones/youtube.png'),
  'YouTube Shorts': arquivo('icones/youtube-shorts.png'),
  WhatsApp: arquivo('icones/whatsapp.png'),
  Lideranças: arquivo('icones/liderancas.png'),
}

export const patterns = {
  circuito: arquivo('patterns/Pattern_EB_1080x1920.png'),
  ondas: arquivo('patterns/Pattern_Endomarketing_1080x1920.png'),
}
