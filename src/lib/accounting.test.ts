import { describe, expect, it } from 'vitest'
import { calculateVat, createJournal, isBalanced, summarizeMonth, trialBalance } from './accounting'
import type { Transaction } from '../types'

function transaction(type: Transaction['type'], date: string, supplyAmount: number, status: Transaction['status'] = 'paid'): Transaction {
  const vat = type === 'deposit' || type === 'withdrawal' ? 0 : calculateVat(supplyAmount)
  return {
    id: `${type}-${date}`, date, type, description: 'test', supplyAmount, vat, total: supplyAmount + vat,
    status, method: 'bank', evidence: 'tax-invoice', journal: createJournal(type, supplyAmount, vat), createdAt: date,
  }
}

describe('회계 계산', () => {
  it('과세 공급가액의 10%를 원 단위로 반올림한다', () => {
    expect(calculateVat(10_005)).toBe(1_001)
    expect(calculateVat(10_005, false)).toBe(0)
  })

  it.each(['sale', 'purchase', 'expense', 'deposit', 'withdrawal'] as const)('%s 자동분개가 차대변 균형을 이룬다', (type) => {
    expect(isBalanced(createJournal(type, 100_000, type === 'deposit' || type === 'withdrawal' ? 0 : 10_000))).toBe(true)
  })

  it('월 손익·부가세·미수금을 집계한다', () => {
    const rows = [
      transaction('sale', '2026-10-01', 1_000_000, 'unpaid'),
      transaction('purchase', '2026-10-02', 300_000),
      transaction('expense', '2026-10-03', 100_000),
      transaction('sale', '2026-09-01', 9_000_000),
    ]
    expect(summarizeMonth(rows, '2026-10')).toMatchObject({
      revenue: 1_000_000,
      purchases: 300_000,
      expenses: 100_000,
      vatPayable: 60_000,
      netIncome: 600_000,
      receivables: 1_100_000,
      count: 3,
    })
  })

  it('합계잔액시산표의 차변·대변 총액이 일치한다', () => {
    const balance = trialBalance([transaction('sale', '2026-10-01', 100_000), transaction('expense', '2026-10-02', 30_000)])
    expect(balance.reduce((sum, row) => sum + row.debit, 0)).toBe(balance.reduce((sum, row) => sum + row.credit, 0))
  })
})
