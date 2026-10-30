import { calculateVat, createJournal } from '../lib/accounting'
import type { AccountingState, Transaction, TransactionType } from '../types'

const now = '2026-10-30T09:00:00.000+09:00'

function tx(id: string, date: string, type: TransactionType, clientId: string, description: string, supplyAmount: number, status: Transaction['status'] = 'paid'): Transaction {
  const vat = type === 'deposit' || type === 'withdrawal' ? 0 : calculateVat(supplyAmount)
  return {
    id,
    date,
    type,
    clientId,
    description,
    supplyAmount,
    vat,
    total: supplyAmount + vat,
    status,
    method: 'bank',
    evidence: type === 'sale' || type === 'purchase' ? 'tax-invoice' : 'card-slip',
    journal: createJournal(type, supplyAmount, vat),
    createdAt: now,
  }
}

export const sampleState: AccountingState = {
  company: { name: '샘플 주식회사', businessNumber: '123-45-67890', representative: '홍길동', fiscalYear: 2026 },
  clients: [
    { id: 'c1', name: '한빛유통', businessNumber: '101-81-12345', contact: '김민지', email: 'minji@example.com', category: 'customer', balance: 4950000 },
    { id: 'c2', name: '오름테크', businessNumber: '214-88-54321', contact: '이준호', email: 'junho@example.com', category: 'both', balance: 0 },
    { id: 'c3', name: '다온물류', businessNumber: '120-86-67890', contact: '박서연', email: 'seoyeon@example.com', category: 'vendor', balance: 1870000 },
    { id: 'c4', name: '새봄디자인', businessNumber: '602-12-34567', contact: '정우진', email: 'woojin@example.com', category: 'vendor', balance: 0 },
  ],
  transactions: [
    tx('t1', '2026-10-03', 'sale', 'c1', '10월 제품 공급', 4500000, 'unpaid'),
    tx('t2', '2026-10-05', 'purchase', 'c3', '포장자재 매입', 1700000, 'unpaid'),
    tx('t3', '2026-10-08', 'expense', 'c4', '브랜드 디자인 용역', 1200000),
    tx('t4', '2026-10-11', 'sale', 'c2', '유지보수 서비스', 3200000),
    tx('t5', '2026-09-03', 'sale', 'c1', '9월 제품 공급', 4100000),
    tx('t6', '2026-09-09', 'purchase', 'c3', '물류비', 1500000),
    tx('t7', '2026-08-06', 'sale', 'c2', '8월 프로젝트', 3800000),
    tx('t8', '2026-08-18', 'expense', 'c4', '광고비', 900000),
  ],
  invoices: [
    { id: 'i1', issueDate: '2026-10-03', clientId: 'c1', item: '10월 제품 공급', supplyAmount: 4500000, vat: 450000, total: 4950000, status: 'issued', direction: 'sales' },
    { id: 'i2', issueDate: '2026-10-05', clientId: 'c3', item: '포장자재 매입', supplyAmount: 1700000, vat: 170000, total: 1870000, status: 'issued', direction: 'purchase' },
  ],
  employees: [
    { id: 'e1', name: '김하늘', department: '경영지원', joinedAt: '2022-03-02', baseSalary: 3600000, allowance: 200000, deduction: 412000, active: true },
    { id: 'e2', name: '박도윤', department: '영업', joinedAt: '2023-06-12', baseSalary: 4200000, allowance: 300000, deduction: 531000, active: true },
    { id: 'e3', name: '이서아', department: '제품', joinedAt: '2024-01-08', baseSalary: 3900000, allowance: 250000, deduction: 466000, active: true },
  ],
  payroll: [],
  closings: [],
}
