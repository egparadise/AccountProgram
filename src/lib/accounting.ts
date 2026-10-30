import type { AccountingState, JournalLine, Transaction, TransactionType } from '../types'

export const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 })
export const number = new Intl.NumberFormat('ko-KR')

export function calculateVat(supplyAmount: number, taxable = true) {
  return taxable ? Math.round(supplyAmount * 0.1) : 0
}

export function createJournal(type: TransactionType, supply: number, vat: number): JournalLine[] {
  const total = supply + vat
  switch (type) {
    case 'sale':
      return [
        { account: '외상매출금', debit: total, credit: 0 },
        { account: '매출', debit: 0, credit: supply },
        { account: '부가세예수금', debit: 0, credit: vat },
      ]
    case 'purchase':
      return [
        { account: '상품매입', debit: supply, credit: 0 },
        { account: '부가세대급금', debit: vat, credit: 0 },
        { account: '외상매입금', debit: 0, credit: total },
      ]
    case 'expense':
      return [
        { account: '판매관리비', debit: supply, credit: 0 },
        { account: '부가세대급금', debit: vat, credit: 0 },
        { account: '보통예금', debit: 0, credit: total },
      ]
    case 'deposit':
      return [
        { account: '보통예금', debit: total, credit: 0 },
        { account: '외상매출금', debit: 0, credit: total },
      ]
    case 'withdrawal':
      return [
        { account: '외상매입금', debit: total, credit: 0 },
        { account: '보통예금', debit: 0, credit: total },
      ]
  }
}

export function isBalanced(lines: JournalLine[]) {
  const debit = lines.reduce((sum, line) => sum + line.debit, 0)
  const credit = lines.reduce((sum, line) => sum + line.credit, 0)
  return debit === credit
}

export function monthOf(date: string) {
  return date.slice(0, 7)
}

export function summarizeMonth(transactions: Transaction[], month: string) {
  const current = transactions.filter((item) => monthOf(item.date) === month)
  const revenue = current.filter((item) => item.type === 'sale').reduce((sum, item) => sum + item.supplyAmount, 0)
  const purchases = current.filter((item) => item.type === 'purchase').reduce((sum, item) => sum + item.supplyAmount, 0)
  const expenses = current.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.supplyAmount, 0)
  const outputVat = current.filter((item) => item.type === 'sale').reduce((sum, item) => sum + item.vat, 0)
  const inputVat = current.filter((item) => item.type === 'purchase' || item.type === 'expense').reduce((sum, item) => sum + item.vat, 0)
  const receivables = current.filter((item) => item.type === 'sale' && item.status !== 'paid').reduce((sum, item) => sum + item.total, 0)
  const payables = current.filter((item) => (item.type === 'purchase' || item.type === 'expense') && item.status !== 'paid').reduce((sum, item) => sum + item.total, 0)
  return {
    revenue,
    purchases,
    expenses,
    totalExpense: purchases + expenses,
    outputVat,
    inputVat,
    vatPayable: outputVat - inputVat,
    netIncome: revenue - purchases - expenses,
    receivables,
    payables,
    count: current.length,
  }
}

export function trialBalance(transactions: Transaction[]) {
  const rows = new Map<string, { account: string; debit: number; credit: number; balance: number }>()
  transactions.flatMap((item) => item.journal).forEach((line) => {
    const row = rows.get(line.account) ?? { account: line.account, debit: 0, credit: 0, balance: 0 }
    row.debit += line.debit
    row.credit += line.credit
    row.balance = row.debit - row.credit
    rows.set(line.account, row)
  })
  return [...rows.values()].sort((a, b) => a.account.localeCompare(b.account, 'ko'))
}

export function dashboardTotals(state: AccountingState) {
  const year = String(state.company.fiscalYear)
  const annual = state.transactions.filter((item) => item.date.startsWith(year))
  const sales = annual.filter((item) => item.type === 'sale').reduce((sum, item) => sum + item.supplyAmount, 0)
  const expense = annual.filter((item) => item.type === 'purchase' || item.type === 'expense').reduce((sum, item) => sum + item.supplyAmount, 0)
  const receivable = annual.filter((item) => item.type === 'sale' && item.status !== 'paid').reduce((sum, item) => sum + item.total, 0)
  const cashIn = annual.filter((item) => item.type === 'deposit' || (item.type === 'sale' && item.status === 'paid')).reduce((sum, item) => sum + item.total, 0)
  return { sales, expense, profit: sales - expense, receivable, cashIn }
}

export function toCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  return `\uFEFF${headers.map(escape).join(',')}\n${rows.map((row) => headers.map((key) => escape(row[key])).join(',')).join('\n')}`
}
