import { describe, expect, it } from 'vitest'
import { diasEntre, formatarAjustes, formatarData, formatarMes, hojeISO, lerAjustes, lerData } from './datas.js'

describe('datas', () => {
  it('lê DD/MM/AAAA e DD/MM com ano à parte', () => {
    expect(lerData('01/07/2026')).toBe('2026-07-01')
    expect(lerData('1/7/26')).toBe('2026-07-01')
    expect(lerData('28/09', 2026)).toBe('2026-09-28')
    expect(lerData('28/09')).toBeNull()
  })

  it('recusa datas que não existem', () => {
    expect(lerData('31/02/2026')).toBeNull()
    expect(lerData('32/01/2026')).toBeNull()
    expect(lerData('ontem')).toBeNull()
  })

  it('exibe como DD/MM/AAAA e o mês por extenso', () => {
    expect(formatarData('2026-10-05')).toBe('05/10/2026')
    expect(formatarMes('2026-10')).toBe('Outubro 2026')
  })

  it('conta os dias entre duas datas', () => {
    expect(diasEntre('2026-09-01', '2026-09-10')).toBe(9)
    expect(diasEntre('2026-09-30', '2026-10-01')).toBe(1)
    expect(diasEntre(null, '2026-10-01')).toBeNull()
  })

  it('usa o fuso da Bahia para saber o dia de hoje', () => {
    expect(hojeISO(new Date('2026-10-31T02:00:00Z'))).toBe('2026-10-30')
    expect(hojeISO(new Date('2026-10-31T15:00:00Z'))).toBe('2026-10-31')
  })

  it('lê os ajustes como aparecem nas planilhas', () => {
    expect(lerAjustes('01/09/2026')).toEqual(['2026-09-01'])
    expect(lerAjustes('28/09', 2026)).toEqual(['2026-09-28'])
    expect(lerAjustes('14 e 15/09', 2026)).toEqual(['2026-09-14', '2026-09-15'])
    expect(lerAjustes('23, 24 e 25/09', 2026)).toEqual(['2026-09-23', '2026-09-24', '2026-09-25'])
    expect(lerAjustes('28/09 e 29/09', 2026)).toEqual(['2026-09-28', '2026-09-29'])
    expect(lerAjustes('30/09 e 01/10', 2026)).toEqual(['2026-09-30', '2026-10-01'])
    expect(lerAjustes('semana que vem', 2026)).toBeNull()
  })

  it('exibe os ajustes no formato "DD e DD/MM"', () => {
    expect(formatarAjustes(['2026-09-15', '2026-09-14'])).toBe('14 e 15/09')
    expect(formatarAjustes(['2026-09-23', '2026-09-24', '2026-09-25'])).toBe('23, 24 e 25/09')
    expect(formatarAjustes(['2026-09-30', '2026-10-01'])).toBe('30/09 e 01/10')
    expect(formatarAjustes(['2026-10-05'])).toBe('05/10')
    expect(formatarAjustes([])).toBe('')
  })
})
