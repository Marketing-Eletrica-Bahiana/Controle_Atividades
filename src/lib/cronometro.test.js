import { describe, expect, it } from 'vitest'
import { ativosDoCronometro, cronometroComAtivos } from './cronometro.js'

const ts = (ms) => ({ toMillis: () => ms })

describe('cronômetro com várias demandas', () => {
  it('lê o formato novo, da mais antiga para a mais nova', () => {
    const lidos = ativosDoCronometro({
      rodando: true,
      ativos: { b: { area: 'designs', inicio: ts(2000) }, a: { area: 'marketing', inicio: ts(1000) }, c: { area: 'designs', inicio: null } },
    })
    expect(lidos.map((a) => a.demandaId)).toEqual(['a', 'b', 'c'])
    expect(lidos[0].area).toBe('marketing')
  })

  it('lê o formato antigo, de um cronômetro só', () => {
    expect(ativosDoCronometro({ rodando: true, demandaId: 'x', area: 'designs', inicio: ts(5) })).toEqual([{ demandaId: 'x', area: 'designs', inicio: ts(5) }].map((a) => ({ ...a, inicio: expect.anything() })))
    expect(ativosDoCronometro({ rodando: false, demandaId: null, area: null, inicio: null })).toEqual([])
    expect(ativosDoCronometro(null)).toEqual([])
    expect(ativosDoCronometro({ ativos: {}, rodando: false })).toEqual([])
  })

  it('grava sempre no formato novo', () => {
    const inicio = ts(10)
    expect(cronometroComAtivos([{ demandaId: 'a', area: 'designs', inicio }])).toEqual({ ativos: { a: { area: 'designs', inicio } }, rodando: true })
    expect(cronometroComAtivos([])).toEqual({ ativos: {}, rodando: false })
  })
})
