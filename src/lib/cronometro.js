// Cronômetro da pessoa (cronometros/{email}), sem acesso ao Firestore.
//
// Desde 25/11/2026 a pessoa pode ter várias demandas rodando ao mesmo tempo (pedido dela: às vezes faz várias
// juntas). O documento guarda um mapa { ativos: { [demandaId]: { area, inicio } }, rodando }. É mapa, e não lista,
// porque o serverTimestamp não funciona dentro de listas. Documentos antigos, de um cronômetro só, têm
// { rodando, demandaId, area, inicio } e continuam sendo lidos.

// As demandas rodando, da mais antiga para a mais nova. "inicio" pode vir null por um instante, logo depois de
// ligar (o servidor ainda não devolveu a hora): conta como a mais nova.
export function ativosDoCronometro(dados) {
  if (!dados) return []
  let lista
  if (dados.ativos && typeof dados.ativos === 'object') {
    lista = Object.entries(dados.ativos).map(([demandaId, ativo]) => ({ demandaId, area: ativo?.area ?? null, inicio: ativo?.inicio ?? null }))
  } else if (dados.rodando && dados.demandaId) {
    lista = [{ demandaId: dados.demandaId, area: dados.area ?? null, inicio: dados.inicio ?? null }]
  } else {
    return []
  }
  const ms = (inicio) => (inicio?.toMillis ? inicio.toMillis() : Infinity)
  return lista.sort((a, b) => ms(a.inicio) - ms(b.inicio))
}

// O que gravar de volta: sempre no formato novo, sem os campos do cronômetro único.
export function cronometroComAtivos(lista) {
  return {
    ativos: Object.fromEntries(lista.map(({ demandaId, area, inicio }) => [demandaId, { area: area ?? null, inicio }])),
    rodando: lista.length > 0,
  }
}
