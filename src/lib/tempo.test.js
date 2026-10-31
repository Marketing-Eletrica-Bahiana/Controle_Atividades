import { describe, expect, it } from 'vitest'
import { formatarTempo, horasParaSegundos, lerTempo, segundosParaHoras, tempoEconomizado } from './tempo.js'

describe('tempo', () => {
  it('formata segundos como HH:MM:SS', () => {
    expect(formatarTempo(747)).toBe('00:12:27')
    expect(formatarTempo(57600)).toBe('16:00:00')
    expect(formatarTempo(0)).toBe('00:00:00')
    expect(formatarTempo(-30)).toBe('00:00:00')
    expect(formatarTempo(null)).toBe('')
  })

  it('lê H:MM, H:MM:SS e HH:MM:SS', () => {
    expect(lerTempo('0:12:27')).toBe(747)
    expect(lerTempo('00:30:00')).toBe(1800)
    expect(lerTempo('1:30')).toBe(5400)
    expect(lerTempo(' 16:00:00 ')).toBe(57600)
  })

  it('recusa formatos inválidos', () => {
    expect(lerTempo('1:75:00')).toBeNull()
    expect(lerTempo('-0:10:00')).toBeNull()
    expect(lerTempo('meia hora')).toBeNull()
    expect(lerTempo('')).toBeNull()
  })

  it('converte horas decimais', () => {
    expect(horasParaSegundos(0.33)).toBe(1188)
    expect(segundosParaHoras(1200)).toBeCloseTo(0.333333, 6)
    expect(horasParaSegundos(segundosParaHoras(1200))).toBe(1200)
  })

  it('tempo economizado nunca fica negativo', () => {
    expect(tempoEconomizado(1800, 1440)).toBe(360)
    expect(tempoEconomizado(1800, 5000)).toBe(0)
    expect(tempoEconomizado(null, 100)).toBeNull()
  })
})
