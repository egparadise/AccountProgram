export type TransactionType = 'sale' | 'purchase' | 'expense' | 'deposit' | 'withdrawal'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type InvoiceStatus = 'draft' | 'issued' | 'paid'

export interface JournalLine {
  account: string
  debit: number
  credit: number
}

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  clientId?: string
  description: string
  supplyAmount: number
  vat: number
  total: number
  status: PaymentStatus
  method: 'bank' | 'card' | 'cash'
  evidence: 'tax-invoice' | 'card-slip' | 'cash-receipt' | 'none'
  journal: JournalLine[]
  createdAt: string
}

export interface Client {
  id: string
  name: string
  businessNumber: string
  contact: string
  email: string
  category: 'customer' | 'vendor' | 'both'
  balance: number
}

export interface TaxInvoice {
  id: string
  issueDate: string
  clientId: string
  item: string
  supplyAmount: number
  vat: number
  total: number
  status: InvoiceStatus
  direction: 'sales' | 'purchase'
}

export interface Employee {
  id: string
  name: string
  department: string
  joinedAt: string
  baseSalary: number
  allowance: number
  deduction: number
  active: boolean
}

export interface PayrollRun {
  id: string
  month: string
  employeeId: string
  gross: number
  deduction: number
  net: number
  status: 'calculated' | 'paid'
}

export interface Closing {
  id: string
  month: string
  revenue: number
  expense: number
  vatPayable: number
  netIncome: number
  closedAt: string
}

export interface Company {
  name: string
  businessNumber: string
  representative: string
  fiscalYear: number
}

export interface AccountingState {
  company: Company
  transactions: Transaction[]
  clients: Client[]
  invoices: TaxInvoice[]
  employees: Employee[]
  payroll: PayrollRun[]
  closings: Closing[]
}
