import { afterEach, describe, expect, it, vi } from 'vitest'
import { acertarRelogio, agoraNoServidor } from './relogio.js'
import { fecharSessao } from './regras.js'

const AGORA = Date.UTC(2026, 10, 5, 12, 0, 0)

describe('relógio do computador diferente do servidor', () => {
  afterEach(() => {
    acertarRelogio(0, 0)
    vi.useRealTimers()
  })

  it('sem medição, usa o relógio do computador', () => {
    vi.useFakeTimers({ now: AGORA })
    expect(agoraNoServidor()).toBe(AGORA)
  })

  it('computador 2 minutos atrasado: o tempo conta desde o início, sem ficar parado', () => {
    vi.useFakeTimers({ now: AGORA })
    const inicioNoServidor = AGORA + 120_000
    acertarRelogio(inicioNoServidor, AGORA)
    expect(agoraNoServidor() - inicioNoServidor).toBe(0)
    vi.advanceTimersByTime(5_000)
    expect(agoraNoServidor() - inicioNoServidor).toBe(5_000)
  })

  it('computador adiantado: não começa com tempo sobrando', () => {
    vi.useFakeTimers({ now: AGORA })
    const inicioNoServidor = AGORA - 300_000
    acertarRelogio(inicioNoServidor, AGORA)
    expect(agoraNoServidor() - inicioNoServidor).toBe(0)
  })

  it('pausar grava o tempo real, mesmo com o relógio atrasado', () => {
    vi.useFakeTimers({ now: AGORA })
    const inicioNoServidor = AGORA + 120_000
    acertarRelogio(inicioNoServidor, AGORA)
    vi.advanceTimersByTime(5_000)
    expect(fecharSessao(inicioNoServidor, agoraNoServidor())).toEqual({ segundos: 5 })
    expect(fecharSessao(inicioNoServidor, Date.now())).toEqual({ segundos: 0 })
  })
})
