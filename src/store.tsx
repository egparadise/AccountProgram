/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext, useEffect, useMemo, useReducer } from 'react'
import { sampleState } from './data/sample'
import type { AccountingState, Client, Closing, Company, Employee, PayrollRun, TaxInvoice, Transaction } from './types'

type Action =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_TRANSACTION_STATUS'; payload: { id: string; status: Transaction['status'] } }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'ADD_INVOICE'; payload: TaxInvoice }
  | { type: 'UPDATE_INVOICE_STATUS'; payload: { id: string; status: TaxInvoice['status'] } }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'SET_PAYROLL'; payload: PayrollRun[] }
  | { type: 'ADD_CLOSING'; payload: Closing }
  | { type: 'REMOVE_CLOSING'; payload: string }
  | { type: 'UPDATE_COMPANY'; payload: Company }
  | { type: 'RESET' }

const STORAGE_KEY = 'jeongsan-on-state-v1'

function reducer(state: AccountingState, action: Action): AccountingState {
  switch (action.type) {
    case 'ADD_TRANSACTION': return { ...state, transactions: [action.payload, ...state.transactions] }
    case 'DELETE_TRANSACTION': return { ...state, transactions: state.transactions.filter((item) => item.id !== action.payload) }
    case 'UPDATE_TRANSACTION_STATUS': return { ...state, transactions: state.transactions.map((item) => item.id === action.payload.id ? { ...item, status: action.payload.status } : item) }
    case 'ADD_CLIENT': return { ...state, clients: [...state.clients, action.payload] }
    case 'ADD_INVOICE': return { ...state, invoices: [action.payload, ...state.invoices] }
    case 'UPDATE_INVOICE_STATUS': return { ...state, invoices: state.invoices.map((item) => item.id === action.payload.id ? { ...item, status: action.payload.status } : item) }
    case 'ADD_EMPLOYEE': return { ...state, employees: [...state.employees, action.payload] }
    case 'SET_PAYROLL': return { ...state, payroll: action.payload }
    case 'ADD_CLOSING': return { ...state, closings: [...state.closings.filter((item) => item.month !== action.payload.month), action.payload] }
    case 'REMOVE_CLOSING': return { ...state, closings: state.closings.filter((item) => item.month !== action.payload) }
    case 'UPDATE_COMPANY': return { ...state, company: action.payload }
    case 'RESET': return structuredClone(sampleState)
  }
}

function initialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as AccountingState : structuredClone(sampleState)
  } catch {
    return structuredClone(sampleState)
  }
}

const StoreContext = createContext<{ state: AccountingState; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('StoreProvider가 필요합니다.')
  return value
}
