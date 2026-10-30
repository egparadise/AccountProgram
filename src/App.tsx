import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
import {
  BadgeDollarSign, Banknote, BarChart3, Bell, BookOpenCheck, Building2, CalendarDays,
  CheckCircle2, ChevronDown, CircleDollarSign, CreditCard, Download, FileSpreadsheet,
  FileText, LayoutDashboard, Menu, Plus, ReceiptText, Search, Settings, ShieldCheck,
  TrendingDown, TrendingUp, Trash2, UserRoundPlus, Users, WalletCards, X,
} from 'lucide-react'
import { calculateVat, createJournal, dashboardTotals, isBalanced, number, summarizeMonth, toCsv, trialBalance, won } from './lib/accounting'
import { useStore } from './store'
import type { Client, Employee, InvoiceStatus, PayrollRun, TaxInvoice, Transaction, TransactionType } from './types'

type Page = 'dashboard' | 'transactions' | 'settlement' | 'invoices' | 'payroll' | 'clients' | 'reports' | 'settings'

const PAGE_TITLES: Record<Page, [string, string]> = {
  dashboard: ['경영 대시보드', '우리 회사의 재무 흐름을 한눈에 확인하세요.'],
  transactions: ['거래·전표 관리', '매입·매출과 입출금을 기록하면 복식부기 전표가 자동 생성됩니다.'],
  settlement: ['월 정산·마감', '월별 손익과 부가세를 검토하고 회계기간을 마감합니다.'],
  invoices: ['전자세금계산서', '매출·매입 세금계산서를 작성하고 발행 상태를 관리합니다.'],
  payroll: ['인사·급여', '직원정보와 월 급여 계산, 지급 상태를 관리합니다.'],
  clients: ['거래처 관리', '매출처와 매입처의 기본정보 및 미수·미지급금을 관리합니다.'],
  reports: ['재무 보고서', '손익, 부가세, 합계잔액시산표를 조회하고 CSV로 내보냅니다.'],
  settings: ['회사·데이터 설정', '사업자 정보와 회계연도를 설정하고 로컬 데이터를 관리합니다.'],
}

const transactionLabels: Record<TransactionType, string> = {
  sale: '매출', purchase: '매입', expense: '경비', deposit: '입금', withdrawal: '출금',
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
}

function currentMonth() {
  return today().slice(0, 7)
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'green' | 'blue' | 'amber' | 'red' | 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty"><FileText size={38} /><strong>{title}</strong><span>{text}</span></div>
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><span className="eyebrow">NEW RECORD</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
      {children}
    </div>
  </div>
}

function Dashboard() {
  const { state } = useStore()
  const totals = dashboardTotals(state)
  const month = currentMonth()
  const summary = summarizeMonth(state.transactions, month)
  const recent = state.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const monthRows = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(2026, 9 - index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, label: `${date.getMonth() + 1}월`, ...summarizeMonth(state.transactions, key) }
  }).reverse()
  const max = Math.max(1, ...monthRows.flatMap((row) => [row.revenue, row.totalExpense]))
  return <div className="page-stack">
    <div className="notice-strip"><ShieldCheck size={18} /><span><strong>로컬 우선 모드</strong> · 모든 회계 데이터는 이 브라우저에만 저장됩니다.</span><span className="notice-date">{month} 기준</span></div>
    <div className="kpi-grid">
      <Kpi title="연 누적 매출" value={won.format(totals.sales)} note="공급가액 기준" icon={<TrendingUp />} tone="teal" />
      <Kpi title="연 누적 비용" value={won.format(totals.expense)} note="매입 + 판매관리비" icon={<TrendingDown />} tone="navy" />
      <Kpi title="영업이익" value={won.format(totals.profit)} note={totals.profit >= 0 ? '흑자 운영 중' : '비용 점검 필요'} icon={<CircleDollarSign />} tone="amber" />
      <Kpi title="미수금" value={won.format(totals.receivable)} note={`${state.transactions.filter((item) => item.type === 'sale' && item.status !== 'paid').length}건 미수`} icon={<WalletCards />} tone="coral" />
    </div>
    <div className="dashboard-grid">
      <Card className="chart-card">
        <div className="section-head"><div><span className="eyebrow">CASH FLOW</span><h3>최근 6개월 매출·비용</h3></div><div className="legend"><span><i className="dot sales" />매출</span><span><i className="dot expense" />비용</span></div></div>
        <div className="bar-chart">
          {monthRows.map((row) => <div className="bar-group" key={row.key} title={`${row.key} 매출 ${won.format(row.revenue)}, 비용 ${won.format(row.totalExpense)}`}>
            <div className="bars"><i className="bar sales" style={{ height: `${Math.max(4, row.revenue / max * 100)}%` }} /><i className="bar expense" style={{ height: `${Math.max(4, row.totalExpense / max * 100)}%` }} /></div>
            <span>{row.label}</span>
          </div>)}
        </div>
      </Card>
      <Card>
        <div className="section-head"><div><span className="eyebrow">THIS MONTH</span><h3>10월 정산 미리보기</h3></div><Badge tone={state.closings.some((item) => item.month === month) ? 'green' : 'amber'}>{state.closings.some((item) => item.month === month) ? '마감완료' : '마감 전'}</Badge></div>
        <div className="summary-list">
          <SummaryRow label="매출" value={summary.revenue} />
          <SummaryRow label="매입·경비" value={summary.totalExpense} />
          <SummaryRow label="예상 부가세" value={summary.vatPayable} />
          <SummaryRow label="당기 손익" value={summary.netIncome} strong />
        </div>
        <div className="progress-block"><div><span>증빙 연결률</span><strong>{Math.round(state.transactions.filter((item) => item.evidence !== 'none').length / Math.max(1, state.transactions.length) * 100)}%</strong></div><div className="progress"><i style={{ width: `${state.transactions.filter((item) => item.evidence !== 'none').length / Math.max(1, state.transactions.length) * 100}%` }} /></div></div>
      </Card>
    </div>
    <Card>
      <div className="section-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>최근 거래</h3></div><span className="muted">총 {number.format(state.transactions.length)}건</span></div>
      <TransactionTable rows={recent} compact />
    </Card>
  </div>
}

function Kpi({ title, value, note, icon, tone }: { title: string; value: string; note: string; icon: ReactNode; tone: string }) {
  return <Card className="kpi"><div className={`kpi-icon ${tone}`}>{icon}</div><span>{title}</span><strong>{value}</strong><small>{note}</small></Card>
}

function SummaryRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={strong ? 'summary-strong' : ''}><span>{label}</span><strong>{won.format(value)}</strong></div>
}

function TransactionTable({ rows, compact = false, onDelete }: { rows: Transaction[]; compact?: boolean; onDelete?: (id: string) => void }) {
  const { state, dispatch } = useStore()
  const clientName = (id?: string) => state.clients.find((item) => item.id === id)?.name ?? '자체거래'
  if (!rows.length) return <Empty title="거래가 없습니다" text="새 거래를 등록하면 자동 전표가 생성됩니다." />
  return <div className="table-scroll"><table><thead><tr><th>일자</th><th>구분</th><th>거래처 / 적요</th><th>증빙</th><th>결제</th><th className="right">금액</th>{!compact && <th />}</tr></thead><tbody>
    {rows.map((item) => <tr key={item.id}>
      <td className="mono">{item.date}</td>
      <td><Badge tone={item.type === 'sale' || item.type === 'deposit' ? 'green' : item.type === 'expense' ? 'amber' : 'blue'}>{transactionLabels[item.type]}</Badge></td>
      <td><strong>{clientName(item.clientId)}</strong><small>{item.description}</small></td>
      <td>{item.evidence === 'tax-invoice' ? '세금계산서' : item.evidence === 'card-slip' ? '카드전표' : item.evidence === 'cash-receipt' ? '현금영수증' : '미첨부'}</td>
      <td><button className={`status-button status-${item.status}`} onClick={() => dispatch({ type: 'UPDATE_TRANSACTION_STATUS', payload: { id: item.id, status: item.status === 'paid' ? 'unpaid' : 'paid' } })}>{item.status === 'paid' ? '완료' : item.status === 'partial' ? '일부' : '미결'}</button></td>
      <td className="right amount">{won.format(item.total)}</td>
      {!compact && <td><button className="icon-button danger" onClick={() => onDelete?.(item.id)} aria-label="삭제"><Trash2 size={17} /></button></td>}
    </tr>)}
  </tbody></table></div>
}

function Transactions() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | TransactionType>('all')
  const rows = state.transactions.filter((item) => (filter === 'all' || item.type === filter) && `${item.description} ${state.clients.find((client) => client.id === item.clientId)?.name ?? ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date))
  return <div className="page-stack">
    <Card>
      <div className="toolbar"><div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="거래처 또는 적요 검색" /></div><div className="filter-tabs">{(['all', 'sale', 'purchase', 'expense', 'deposit', 'withdrawal'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? '전체' : transactionLabels[item]}</button>)}</div><button className="primary" onClick={() => setOpen(true)}><Plus />새 거래</button></div>
      <div className="table-caption"><span>검색 결과 <strong>{rows.length}</strong>건</span><span>합계 <strong>{won.format(rows.reduce((sum, item) => sum + item.total, 0))}</strong></span></div>
      <TransactionTable rows={rows} onDelete={(id) => window.confirm('이 거래와 전표를 삭제할까요?') && dispatch({ type: 'DELETE_TRANSACTION', payload: id })} />
    </Card>
    {open && <TransactionForm onClose={() => setOpen(false)} />}
  </div>
}

function TransactionForm({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [type, setType] = useState<TransactionType>('sale')
  const [supply, setSupply] = useState(0)
  const [taxable, setTaxable] = useState(true)
  const vat = type === 'deposit' || type === 'withdrawal' ? 0 : calculateVat(supply, taxable)
  const journal = createJournal(type, supply, vat)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const transaction: Transaction = {
      id: uid('tx'), date: String(data.get('date')), type, clientId: String(data.get('clientId') || ''), description: String(data.get('description')),
      supplyAmount: supply, vat, total: supply + vat, status: String(data.get('status')) as Transaction['status'], method: String(data.get('method')) as Transaction['method'], evidence: String(data.get('evidence')) as Transaction['evidence'], journal, createdAt: new Date().toISOString(),
    }
    if (!isBalanced(transaction.journal)) return window.alert('차변과 대변이 일치하지 않습니다.')
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction })
    onClose()
  }
  return <Modal title="거래 등록" onClose={onClose}><form onSubmit={submit} className="form-stack">
    <div className="type-picker">{(['sale', 'purchase', 'expense', 'deposit', 'withdrawal'] as TransactionType[]).map((item) => <button type="button" key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)}>{transactionLabels[item]}</button>)}</div>
    <div className="form-grid"><label>거래일<input name="date" type="date" defaultValue={today()} required /></label><label>거래처<select name="clientId"><option value="">자체 거래</option>{state.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="span-2">적요<input name="description" placeholder="거래 내용을 입력하세요" required /></label><label>공급가액<input name="supply" type="number" min="0" value={supply || ''} onChange={(event) => setSupply(Number(event.target.value))} required /></label><label className="check-label"><input type="checkbox" checked={taxable} onChange={(event) => setTaxable(event.target.checked)} disabled={type === 'deposit' || type === 'withdrawal'} />과세 10%</label><label>결제수단<select name="method"><option value="bank">계좌이체</option><option value="card">카드</option><option value="cash">현금</option></select></label><label>처리상태<select name="status"><option value="paid">완료</option><option value="unpaid">미결</option><option value="partial">일부결제</option></select></label><label>증빙<select name="evidence"><option value="tax-invoice">세금계산서</option><option value="card-slip">카드전표</option><option value="cash-receipt">현금영수증</option><option value="none">미첨부</option></select></label></div>
    <div className="calculation"><span>공급가액 <strong>{won.format(supply)}</strong></span><span>부가세 <strong>{won.format(vat)}</strong></span><span className="total">합계 <strong>{won.format(supply + vat)}</strong></span></div>
    <div className="journal-preview"><div><BookOpenCheck size={18} /><strong>자동 분개</strong><Badge tone={isBalanced(journal) ? 'green' : 'red'}>{isBalanced(journal) ? '차대변 일치' : '불일치'}</Badge></div>{journal.map((line, index) => <div className="journal-line" key={`${line.account}-${index}`}><span>{line.account}</span><span>차변 {won.format(line.debit)}</span><span>대변 {won.format(line.credit)}</span></div>)}</div>
    <div className="form-actions"><button type="button" className="secondary" onClick={onClose}>취소</button><button className="primary">저장 및 전표생성</button></div>
  </form></Modal>
}

function Settlement() {
  const { state, dispatch } = useStore()
  const [month, setMonth] = useState(currentMonth())
  const summary = summarizeMonth(state.transactions, month)
  const closed = state.closings.find((item) => item.month === month)
  const checks = [
    ['거래 전표 균형', state.transactions.filter((item) => item.date.startsWith(month)).every((item) => isBalanced(item.journal))],
    ['증빙 누락 없음', state.transactions.filter((item) => item.date.startsWith(month)).every((item) => item.evidence !== 'none')],
    ['미결 거래 없음', state.transactions.filter((item) => item.date.startsWith(month)).every((item) => item.status === 'paid')],
  ] as const
  function closeMonth() {
    dispatch({ type: 'ADD_CLOSING', payload: { id: uid('close'), month, revenue: summary.revenue, expense: summary.totalExpense, vatPayable: summary.vatPayable, netIncome: summary.netIncome, closedAt: new Date().toISOString() } })
  }
  return <div className="page-stack">
    <Card><div className="period-head"><div><span className="eyebrow">ACCOUNTING PERIOD</span><h3>정산 대상 기간</h3></div><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><Badge tone={closed ? 'green' : 'amber'}>{closed ? '마감완료' : '검토 중'}</Badge></div></Card>
    <div className="kpi-grid settlement-kpis"><Kpi title="공급가액 매출" value={won.format(summary.revenue)} note={`${summary.count}건의 거래`} icon={<TrendingUp />} tone="teal" /><Kpi title="매입·경비" value={won.format(summary.totalExpense)} note={`매입 ${won.format(summary.purchases)}`} icon={<TrendingDown />} tone="navy" /><Kpi title="납부예상 부가세" value={won.format(summary.vatPayable)} note={`매출세액 - 매입세액`} icon={<ReceiptText />} tone="amber" /><Kpi title="당기손익" value={won.format(summary.netIncome)} note={summary.netIncome >= 0 ? '순이익' : '순손실'} icon={<BadgeDollarSign />} tone="coral" /></div>
    <div className="two-col">
      <Card><div className="section-head"><div><span className="eyebrow">CLOSING CHECK</span><h3>마감 점검</h3></div></div><div className="check-list">{checks.map(([label, pass]) => <div key={label}><span className={pass ? 'check-pass' : 'check-warn'}>{pass ? <CheckCircle2 /> : <Bell />}</span><span>{label}</span><Badge tone={pass ? 'green' : 'amber'}>{pass ? '완료' : '확인 필요'}</Badge></div>)}</div></Card>
      <Card><div className="section-head"><div><span className="eyebrow">BALANCE</span><h3>채권·채무</h3></div></div><div className="summary-list"><SummaryRow label="미수금" value={summary.receivables} /><SummaryRow label="미지급금" value={summary.payables} /><SummaryRow label="순운전자금" value={summary.receivables - summary.payables} strong /></div></Card>
    </div>
    <Card className="closing-card"><div><ShieldCheck /><div><h3>{closed ? `${month} 마감이 완료되었습니다.` : '검토를 마쳤다면 회계기간을 마감하세요.'}</h3><p>{closed ? `${new Date(closed.closedAt).toLocaleString('ko-KR')}에 확정됨` : '마감 후에도 관리자 권한으로 다시 열 수 있습니다.'}</p></div></div>{closed ? <button className="secondary danger-text" onClick={() => dispatch({ type: 'REMOVE_CLOSING', payload: month })}>마감 취소</button> : <button className="primary" onClick={closeMonth}>월 마감 확정</button>}</Card>
  </div>
}

function Invoices() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const total = state.invoices.reduce((sum, item) => sum + item.total, 0)
  const changeStatus = (id: string, status: InvoiceStatus) => dispatch({ type: 'UPDATE_INVOICE_STATUS', payload: { id, status } })
  return <div className="page-stack">
    <div className="mini-kpis"><Card><ReceiptText /><span>전체 계산서</span><strong>{state.invoices.length}건</strong></Card><Card><CircleDollarSign /><span>공급대가 합계</span><strong>{won.format(total)}</strong></Card><Card><CheckCircle2 /><span>발행·완료</span><strong>{state.invoices.filter((item) => item.status !== 'draft').length}건</strong></Card></div>
    <Card><div className="toolbar simple"><div><span className="eyebrow">TAX INVOICE</span><h3>세금계산서 목록</h3></div><button className="primary" onClick={() => setOpen(true)}><Plus />계산서 작성</button></div>
      {state.invoices.length ? <div className="table-scroll"><table><thead><tr><th>작성일</th><th>구분</th><th>거래처</th><th>품목</th><th>공급가액</th><th>세액</th><th className="right">합계</th><th>상태</th></tr></thead><tbody>{state.invoices.map((item) => <tr key={item.id}><td>{item.issueDate}</td><td><Badge tone={item.direction === 'sales' ? 'green' : 'blue'}>{item.direction === 'sales' ? '매출' : '매입'}</Badge></td><td><strong>{state.clients.find((client) => client.id === item.clientId)?.name}</strong></td><td>{item.item}</td><td>{won.format(item.supplyAmount)}</td><td>{won.format(item.vat)}</td><td className="right amount">{won.format(item.total)}</td><td><select className={`status-select ${item.status}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value as InvoiceStatus)}><option value="draft">작성중</option><option value="issued">발행</option><option value="paid">수금완료</option></select></td></tr>)}</tbody></table></div> : <Empty title="계산서가 없습니다" text="새 계산서를 작성해 주세요." />}
    </Card>{open && <InvoiceForm onClose={() => setOpen(false)} />}
  </div>
}

function InvoiceForm({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const [supply, setSupply] = useState(0)
  const vat = calculateVat(supply)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    const invoice: TaxInvoice = { id: uid('inv'), issueDate: String(data.get('issueDate')), clientId: String(data.get('clientId')), item: String(data.get('item')), supplyAmount: supply, vat, total: supply + vat, status: 'draft', direction: String(data.get('direction')) as TaxInvoice['direction'] }
    dispatch({ type: 'ADD_INVOICE', payload: invoice }); onClose()
  }
  return <Modal title="세금계산서 작성" onClose={onClose}><form className="form-stack" onSubmit={submit}><div className="form-grid"><label>구분<select name="direction"><option value="sales">매출 세금계산서</option><option value="purchase">매입 세금계산서</option></select></label><label>작성일<input type="date" name="issueDate" defaultValue={today()} required /></label><label className="span-2">거래처<select name="clientId" required><option value="">선택</option>{state.clients.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.businessNumber}</option>)}</select></label><label className="span-2">품목<input name="item" required placeholder="품목 또는 서비스명" /></label><label>공급가액<input type="number" min="0" value={supply || ''} onChange={(event) => setSupply(Number(event.target.value))} required /></label><label>부가세<input value={vat} readOnly /></label></div><div className="calculation"><span>공급가액 <strong>{won.format(supply)}</strong></span><span>부가세 <strong>{won.format(vat)}</strong></span><span className="total">합계 <strong>{won.format(supply + vat)}</strong></span></div><div className="form-actions"><button type="button" className="secondary" onClick={onClose}>취소</button><button className="primary">임시저장</button></div></form></Modal>
}

function Payroll() {
  const { state, dispatch } = useStore()
  const [month, setMonth] = useState(currentMonth())
  const [open, setOpen] = useState(false)
  const current = state.payroll.filter((item) => item.month === month)
  function calculate() {
    const other = state.payroll.filter((item) => item.month !== month)
    const runs: PayrollRun[] = state.employees.filter((item) => item.active).map((item) => ({ id: uid('pay'), month, employeeId: item.id, gross: item.baseSalary + item.allowance, deduction: item.deduction, net: item.baseSalary + item.allowance - item.deduction, status: 'calculated' }))
    dispatch({ type: 'SET_PAYROLL', payload: [...other, ...runs] })
  }
  function markPaid() {
    dispatch({ type: 'SET_PAYROLL', payload: state.payroll.map((item) => item.month === month ? { ...item, status: 'paid' } : item) })
  }
  return <div className="page-stack">
    <div className="mini-kpis"><Card><Users /><span>재직 인원</span><strong>{state.employees.filter((item) => item.active).length}명</strong></Card><Card><Banknote /><span>{month} 지급총액</span><strong>{won.format(current.reduce((sum, item) => sum + item.gross, 0))}</strong></Card><Card><ShieldCheck /><span>공제액</span><strong>{won.format(current.reduce((sum, item) => sum + item.deduction, 0))}</strong></Card></div>
    <Card><div className="toolbar simple"><div className="period-inline"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="secondary" onClick={calculate}>급여 계산</button><button className="primary" onClick={markPaid} disabled={!current.length}>지급 완료</button></div><button className="secondary" onClick={() => setOpen(true)}><UserRoundPlus />직원 등록</button></div>
      <div className="table-scroll"><table><thead><tr><th>직원</th><th>부서</th><th>기본급</th><th>수당</th><th>공제</th><th className="right">실지급액</th><th>상태</th></tr></thead><tbody>{state.employees.filter((item) => item.active).map((employee) => { const run = current.find((item) => item.employeeId === employee.id); return <tr key={employee.id}><td><strong>{employee.name}</strong><small>{employee.joinedAt} 입사</small></td><td>{employee.department}</td><td>{won.format(employee.baseSalary)}</td><td>{won.format(employee.allowance)}</td><td>{won.format(run?.deduction ?? employee.deduction)}</td><td className="right amount">{won.format(run?.net ?? employee.baseSalary + employee.allowance - employee.deduction)}</td><td><Badge tone={run?.status === 'paid' ? 'green' : run ? 'amber' : 'neutral'}>{run?.status === 'paid' ? '지급완료' : run ? '계산완료' : '계산 전'}</Badge></td></tr> })}</tbody></table></div>
    </Card>{open && <EmployeeForm onClose={() => setOpen(false)} />}
  </div>
}

function EmployeeForm({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const employee: Employee = { id: uid('emp'), name: String(data.get('name')), department: String(data.get('department')), joinedAt: String(data.get('joinedAt')), baseSalary: Number(data.get('baseSalary')), allowance: Number(data.get('allowance')), deduction: Number(data.get('deduction')), active: true }; dispatch({ type: 'ADD_EMPLOYEE', payload: employee }); onClose() }
  return <Modal title="직원 등록" onClose={onClose}><form className="form-stack" onSubmit={submit}><div className="form-grid"><label>성명<input name="name" required /></label><label>부서<input name="department" required /></label><label>입사일<input type="date" name="joinedAt" defaultValue={today()} required /></label><label>기본급<input type="number" name="baseSalary" min="0" required /></label><label>수당<input type="number" name="allowance" min="0" defaultValue="0" required /></label><label>월 공제액<input type="number" name="deduction" min="0" defaultValue="0" required /></label></div><div className="form-actions"><button type="button" className="secondary" onClick={onClose}>취소</button><button className="primary">등록</button></div></form></Modal>
}

function Clients() {
  const { state } = useStore(); const [open, setOpen] = useState(false); const [query, setQuery] = useState('')
  const clients = state.clients.filter((item) => `${item.name} ${item.businessNumber} ${item.contact}`.includes(query))
  return <div className="page-stack"><Card><div className="toolbar"><div className="search"><Search size={18} /><input placeholder="상호, 사업자번호, 담당자 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></div><span /><button className="primary" onClick={() => setOpen(true)}><Plus />거래처 등록</button></div><div className="client-grid">{clients.map((item) => <article className="client-card" key={item.id}><div><span className="client-avatar">{item.name.slice(0, 1)}</span><Badge tone={item.category === 'customer' ? 'green' : item.category === 'vendor' ? 'blue' : 'amber'}>{item.category === 'customer' ? '매출처' : item.category === 'vendor' ? '매입처' : '매입·매출'}</Badge></div><h3>{item.name}</h3><p>{item.businessNumber}</p><dl><div><dt>담당자</dt><dd>{item.contact}</dd></div><div><dt>이메일</dt><dd>{item.email}</dd></div><div><dt>잔액</dt><dd className="amount">{won.format(item.balance)}</dd></div></dl></article>)}</div></Card>{open && <ClientForm onClose={() => setOpen(false)} />}</div>
}

function ClientForm({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore()
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const client: Client = { id: uid('client'), name: String(data.get('name')), businessNumber: String(data.get('businessNumber')), contact: String(data.get('contact')), email: String(data.get('email')), category: String(data.get('category')) as Client['category'], balance: 0 }; dispatch({ type: 'ADD_CLIENT', payload: client }); onClose() }
  return <Modal title="거래처 등록" onClose={onClose}><form className="form-stack" onSubmit={submit}><div className="form-grid"><label>상호<input name="name" required /></label><label>구분<select name="category"><option value="customer">매출처</option><option value="vendor">매입처</option><option value="both">매입·매출</option></select></label><label>사업자번호<input name="businessNumber" placeholder="000-00-00000" required /></label><label>담당자<input name="contact" required /></label><label className="span-2">이메일<input type="email" name="email" required /></label></div><div className="form-actions"><button type="button" className="secondary" onClick={onClose}>취소</button><button className="primary">등록</button></div></form></Modal>
}

function Reports() {
  const { state } = useStore(); const [month, setMonth] = useState(currentMonth()); const [tab, setTab] = useState<'income' | 'vat' | 'trial'>('income'); const summary = summarizeMonth(state.transactions, month); const balance = trialBalance(state.transactions.filter((item) => item.date.startsWith(month)))
  const download = () => { let rows: Array<Record<string, string | number>>; if (tab === 'trial') rows = balance.map((item) => ({ 계정과목: item.account, 차변: item.debit, 대변: item.credit, 잔액: item.balance })); else if (tab === 'vat') rows = [{ 구분: '매출세액', 금액: summary.outputVat }, { 구분: '매입세액', 금액: summary.inputVat }, { 구분: '납부예상세액', 금액: summary.vatPayable }]; else rows = [{ 구분: '매출액', 금액: summary.revenue }, { 구분: '매출원가 및 경비', 금액: summary.totalExpense }, { 구분: '당기순손익', 금액: summary.netIncome }]; const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${month}-${tab}.csv`; anchor.click(); URL.revokeObjectURL(url) }
  return <div className="page-stack"><Card><div className="toolbar simple"><div className="report-tabs"><button className={tab === 'income' ? 'active' : ''} onClick={() => setTab('income')}>손익계산</button><button className={tab === 'vat' ? 'active' : ''} onClick={() => setTab('vat')}>부가세 요약</button><button className={tab === 'trial' ? 'active' : ''} onClick={() => setTab('trial')}>합계잔액시산표</button></div><div className="period-inline"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="secondary" onClick={download}><Download />CSV</button></div></div>
    <div className="report-paper"><div className="report-title"><span>{state.company.name}</span><h2>{tab === 'income' ? '손 익 계 산 서' : tab === 'vat' ? '부 가 세 요 약 표' : '합 계 잔 액 시 산 표'}</h2><span>{month}</span></div>{tab === 'income' && <div className="report-lines"><SummaryRow label="Ⅰ. 매출액" value={summary.revenue} /><SummaryRow label="Ⅱ. 매입원가" value={summary.purchases} /><SummaryRow label="Ⅲ. 판매비와관리비" value={summary.expenses} /><SummaryRow label="당기순손익" value={summary.netIncome} strong /></div>}{tab === 'vat' && <div className="report-lines"><SummaryRow label="매출세액" value={summary.outputVat} /><SummaryRow label="매입세액" value={summary.inputVat} /><SummaryRow label="납부(환급) 예상세액" value={summary.vatPayable} strong /></div>}{tab === 'trial' && <div className="table-scroll"><table><thead><tr><th>계정과목</th><th className="right">차변합계</th><th className="right">대변합계</th><th className="right">잔액</th></tr></thead><tbody>{balance.map((row) => <tr key={row.account}><td><strong>{row.account}</strong></td><td className="right">{won.format(row.debit)}</td><td className="right">{won.format(row.credit)}</td><td className="right amount">{won.format(row.balance)}</td></tr>)}</tbody><tfoot><tr><th>합계</th><th className="right">{won.format(balance.reduce((sum, item) => sum + item.debit, 0))}</th><th className="right">{won.format(balance.reduce((sum, item) => sum + item.credit, 0))}</th><th /></tr></tfoot></table></div>}</div>
  </Card></div>
}

function SettingsPage() {
  const { state, dispatch } = useStore(); const [saved, setSaved] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); dispatch({ type: 'UPDATE_COMPANY', payload: { name: String(data.get('name')), businessNumber: String(data.get('businessNumber')), representative: String(data.get('representative')), fiscalYear: Number(data.get('fiscalYear')) } }); setSaved(true); window.setTimeout(() => setSaved(false), 2000) }
  return <div className="settings-grid"><Card><div className="section-head"><div><span className="eyebrow">COMPANY PROFILE</span><h3>사업자 정보</h3></div>{saved && <Badge tone="green">저장됨</Badge>}</div><form className="form-stack" onSubmit={submit}><div className="form-grid"><label className="span-2">회사명<input name="name" defaultValue={state.company.name} required /></label><label>사업자등록번호<input name="businessNumber" defaultValue={state.company.businessNumber} required /></label><label>대표자<input name="representative" defaultValue={state.company.representative} required /></label><label>회계연도<input type="number" name="fiscalYear" min="2000" max="2100" defaultValue={state.company.fiscalYear} required /></label></div><div className="form-actions"><button className="primary">변경사항 저장</button></div></form></Card><Card><div className="section-head"><div><span className="eyebrow">LOCAL DATA</span><h3>데이터 보관</h3></div></div><div className="data-summary"><div><FileSpreadsheet /><span><strong>{state.transactions.length}</strong> 거래</span></div><div><Users /><span><strong>{state.clients.length}</strong> 거래처</span></div><div><ReceiptText /><span><strong>{state.invoices.length}</strong> 계산서</span></div></div><div className="danger-zone"><strong>샘플 데이터로 초기화</strong><p>현재 브라우저에 저장된 변경사항이 모두 사라집니다.</p><button className="secondary danger-text" onClick={() => window.confirm('모든 변경사항을 지우고 샘플로 되돌릴까요?') && dispatch({ type: 'RESET' })}>데이터 초기화</button></div></Card></div>
}

function App() {
  const { state } = useStore(); const [page, setPage] = useState<Page>('dashboard'); const [mobileOpen, setMobileOpen] = useState(false)
  const menu = useMemo(() => [
    ['dashboard', '홈', LayoutDashboard], ['transactions', '거래·전표', CreditCard], ['settlement', '월 정산', BookOpenCheck], ['invoices', '세금계산서', ReceiptText], ['payroll', '인사·급여', Users], ['clients', '거래처', Building2], ['reports', '보고서', BarChart3], ['settings', '설정', Settings],
  ] as const, [])
  const [title, subtitle] = PAGE_TITLES[page]
  const content: Record<Page, ReactNode> = { dashboard: <Dashboard />, transactions: <Transactions />, settlement: <Settlement />, invoices: <Invoices />, payroll: <Payroll />, clients: <Clients />, reports: <Reports />, settings: <SettingsPage /> }
  return <div className="app-shell">
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}><div className="brand"><span className="brand-mark"><FileSpreadsheet /></span><div><strong>정산ON</strong><small>ACCOUNTING</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X /></button></div><div className="company-switch"><span>{state.company.name.slice(0, 1)}</span><div><strong>{state.company.name}</strong><small>{state.company.fiscalYear} 회계연도</small></div><ChevronDown size={16} /></div><nav>{menu.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setMobileOpen(false) }}><Icon /><span>{label}</span>{id === 'settlement' && state.closings.length > 0 && <i>{state.closings.length}</i>}</button>)}</nav><div className="sidebar-foot"><div className="secure"><ShieldCheck /><span><strong>오프라인 저장</strong><small>브라우저 암호화 영역</small></span></div><small>v1.0.0 · 독립 구현</small></div></aside>
    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}
    <main><header><button className="menu-button" onClick={() => setMobileOpen(true)}><Menu /></button><div><span className="eyebrow">{page.toUpperCase()}</span><h1>{title}</h1><p>{subtitle}</p></div><div className="header-actions"><button className="icon-button"><CalendarDays /></button><button className="icon-button notification"><Bell /><i /></button><span className="profile"><b>회계</b><span>관리자<small>admin@local</small></span></span></div></header><div className="content">{content[page]}</div><footer><span>정산ON · 로컬 회계 정산</span><span>데이터는 외부로 전송되지 않습니다.</span></footer></main>
  </div>
}

export default App
