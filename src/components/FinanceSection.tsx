import React, { useState, useMemo } from 'react';
import {
  Wallet, Plus, Trash2, Check, X, ChevronLeft, ChevronRight,
  TrendingUp, PieChart,
  ArrowRightLeft, Receipt, Settings, Users, MoreVertical
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Expense, ExpenseCategory, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import financeImg from '../assets/finance-3d.png';
import './FinanceSection.css';

/* ============================================================
   HELPERS
   ============================================================ */

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string; bg: string }> = {
  supermarket: { label: 'Supermercato', icon: '🛒', color: '#7c4630', bg: '#fde9d4' },
  home:        { label: 'Casa',          icon: '🏠', color: '#2d5a87', bg: '#d4e9f7' },
  medicine:    { label: 'Farmaci',       icon: '💊', color: '#5b21b6', bg: '#ede9fe' },
  repayment:   { label: 'Rimborso',      icon: '🤝', color: '#0369a1', bg: '#e0f2fe' },
  other:       { label: 'Altro',         icon: '📦', color: '#065f46', bg: '#d1fae5' },
};

function formatEur(n: number) {
  return `${Math.abs(n).toFixed(2).replace('.', ',')} €`;
}

const TAG_COLORS = [
  '#ffecf1', '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#f1f8e9', '#e0f2f1', '#fce4ec'
];

/* ============================================================
   PIE CHART (pure SVG, zero deps)
   ============================================================ */
function PieChart2D({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="f-no-data">
      <PieChart size={36} />
      <p>Nessuna spesa</p>
    </div>
  );

  const SIZE = 120;
  const R = 42;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  let cumAngle = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const ratio = d.value / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + ratio * 2 * Math.PI;
    cumAngle = endAngle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    return { ...d, ratio, path: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z` };
  });

  return (
    <div className="f-pie-container">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="f-pie-svg">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke="white" strokeWidth={2} />
        ))}
        <circle cx={CX} cy={CY} r={22} fill="white" />
      </svg>
      <div className="f-pie-legend">
        {data.filter(d => d.value > 0).map((d, i) => (
          <div key={i} className="f-legend-row">
            <div className="f-legend-dot" style={{ backgroundColor: d.color }} />
            <span className="f-legend-label">{d.label}</span>
            <span className="f-legend-value">{formatEur(d.value)}</span>
            <span className="f-legend-pct">({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   BAR CHART (pure SVG-ish, zero deps)
   ============================================================ */
function BarChart({ bars }: { bars: { label: string; amount: number }[] }) {
  const max = Math.max(...bars.map(b => b.amount), 1);
  return (
    <div className="f-bar-chart">
      {bars.map((b, i) => {
        const pct = (b.amount / max) * 100;
        return (
          <div key={i} className="f-bar-col">
            {b.amount > 0 && (
              <span className="f-bar-amount">{b.amount.toFixed(0)}€</span>
            )}
            <div
              className="f-bar"
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${b.label}: ${formatEur(b.amount)}`}
            />
            <span className="f-bar-label">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   PROPS
   ============================================================ */
interface FinanceSectionProps {
  expenses: Expense[];
  tags: Tag[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onAddTag: (tag: Tag) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  isMobile: boolean;
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function FinanceSection({ 
  expenses, tags, onAddExpense, onDeleteExpense, onAddTag, onDeleteTag, isMobile 
}: FinanceSectionProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('supermarket');
  const [paidBy, setPaidBy] = useState<string>(tags[0]?.id ?? '');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [isSplit, setIsSplit] = useState(false);
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [showMobileAddForm, setShowMobileAddForm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showExpensesSheet, setShowExpensesSheet] = useState(false);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd   = endOfMonth(viewMonth);
  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: it });

  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = parseISO(e.date);
      return d >= monthStart && d <= monthEnd;
    }),
    [expenses, viewMonth]
  );

  const spendingExpenses = useMemo(() => 
    monthExpenses.filter(e => e.category !== 'repayment'),
    [monthExpenses]
  );

  const monthTotal = spendingExpenses.reduce((s, e) => s + e.amount, 0);

  const personTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) {
      map[e.paidBy] = (map[e.paidBy] ?? 0) + e.amount;
    }
    return map;
  }, [monthExpenses]);

  const balanceSummary = useMemo(() => {
    const persons = tags;
    if (persons.length < 2) return [];
    const netBalances: Record<string, number> = {};
    persons.forEach(p => { netBalances[p.id] = 0; });

    for (const e of monthExpenses) {
      if (netBalances[e.paidBy] !== undefined) netBalances[e.paidBy] += e.amount;
      const targets = (e.splitWith && e.splitWith.length > 0) ? e.splitWith : persons.map(p => p.id);
      const share = e.amount / Math.max(targets.length, 1);
      targets.forEach(tid => {
        if (netBalances[tid] !== undefined) netBalances[tid] -= share;
      });
    }

    const credits = persons.map(p => ({ id: p.id, label: p.label, balance: netBalances[p.id] || 0 }));
    const debts: { from: string; to: string; amount: number }[] = [];
    const debtors  = credits.filter(c => c.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = credits.filter(c => c.balance >  0.01).sort((a, b) => b.balance - a.balance);

    let di = 0, ci = 0;
    const d = debtors.map(x => ({ ...x }));
    const c = creditors.map(x => ({ ...x }));
    while (di < d.length && ci < c.length) {
      const settled = Math.min(-d[di].balance, c[ci].balance);
      if (settled > 0.01) debts.push({ from: d[di].label, to: c[ci].label, amount: settled });
      d[di].balance += settled;
      c[ci].balance -= settled;
      if (Math.abs(d[di].balance) < 0.01) di++;
      if (Math.abs(c[ci].balance) < 0.01) ci++;
    }
    return debts;
  }, [monthExpenses, tags]);

  const categoryTotals = useMemo(() => {
    const map: Record<ExpenseCategory, number> = { supermarket: 0, home: 0, medicine: 0, other: 0, repayment: 0 };
    for (const e of spendingExpenses) { map[e.category] += e.amount; }
    return map;
  }, [spendingExpenses]);

  const barData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = subMonths(new Date(), 5 - i);
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      const total = expenses
        .filter(e => { const d = parseISO(e.date); return d >= ms && d <= me; })
        .reduce((s, e) => s + e.amount, 0);
      return { label: format(m, 'MMM', { locale: it }), amount: total };
    });
  }, [expenses]);

  const pieData = (Object.entries(categoryTotals) as [ExpenseCategory, number][])
    .filter(([cat, val]) => cat !== 'repayment' && val > 0)
    .map(([cat, val]) => ({
      label: CATEGORY_META[cat].label,
      value: val,
      color: { supermarket: '#f5c4a0', home: '#a8cff0', medicine: '#c4b5fd', other: '#6ee7b7', repayment: '#0ea5e9' }[cat],
  }));

  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter(e => {
        const d = parseISO(e.date);
        return d >= monthStart && d <= monthEnd;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, viewMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !paidBy) return;
    setIsSaving(true);
    try {
      await onAddExpense({
        amount: parsed,
        description: description.trim() || '—',
        category,
        date,
        paidBy,
        splitWith: isSplit && splitWith.length > 0 ? splitWith : undefined
      });
      setAmount('');
      setDescription('');
      setIsSplit(false);
      setSplitWith([]);
      setShowMobileAddForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagLabel.trim()) {
      const id = newTagLabel.trim().toLowerCase().replace(/\s+/g, '-');
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      onAddTag({ id, label: newTagLabel.trim(), color });
      setNewTagLabel('');
    }
  };

  const handleRepay = async (from: string, to: string, amount: number) => {
    const debtor = tags.find(t => t.label === from);
    const creditor = tags.find(t => t.label === to);
    if (!debtor || !creditor) return;
    setIsSaving(true);
    try {
      await onAddExpense({
        amount,
        description: `Rimborso a ${creditor.label}`,
        category: 'repayment',
        date: format(new Date(), 'yyyy-MM-dd'),
        paidBy: debtor.id,
        splitWith: [creditor.id]
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSplitParticipant = (id: string) => {
    setSplitWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <main className="main-content shopping-only">
      <div className="finance-container">
        
        <header className="finance-hero">
          <div className="finance-hero-text">
            <span className="finance-welcome-label">Bilancio & Risparmi</span>
            <div className="finance-hero-header-content">
              <h1 className="finance-hero-page-title">Finanze</h1>
              <InfoTooltip text="Gestisci le spese comuni della casa. Registra gli acquisti e visualizza i rimborsi necessari per pareggiare i conti tra i coinquilini." position="right" />
            </div>
            <p className="finance-hero-page-subtitle">Gestione intelligente delle spese e dei rimborsi</p>

            {!isMobile && (
              <button className="tag-settings-trigger" style={{ marginTop: '24px' }} onClick={() => setShowTagSettings(true)}>
                <span className="trigger-text">Coinquilini</span>
                <div className="trigger-icon-wrapper">
                  <Settings size={20} />
                </div>
              </button>
            )}
          </div>

          <div className="finance-hero-graphic">
            <div className="finance-coins-container">
              <div className="finance-coin" style={{ '--size': '40px', '--left': '10%', '--top': '20%', '--delay': '0s', '--duration': '4s', '--drift': '20px' } as any}></div>
              <div className="finance-coin" style={{ '--size': '30px', '--left': '80%', '--top': '15%', '--delay': '1s', '--duration': '5s', '--drift': '-15px' } as any}></div>
              <div className="finance-coin" style={{ '--size': '35px', '--left': '40%', '--top': '70%', '--delay': '0.5s', '--duration': '4.5s', '--drift': '10px' } as any}></div>
              <div className="finance-coin" style={{ '--size': '25px', '--left': '65%', '--top': '60%', '--delay': '1.5s', '--duration': '6s', '--drift': '-12px' } as any}></div>
            </div>
            <div className="floating-piggy-wrapper">
              <img src={financeImg} alt="Finance Piggy" className="floating-piggy" />
              <div className="piggy-shadow"></div>
            </div>
          </div>
        </header>

        {isMobile && (
          <div className="f-mobile-summary-cards">
             <div className="f-summary-card total" style={{ background: '#ecfdf5', borderBottom: '4px solid #10b981' }}>
                <span className="f-sum-label">Totale {format(viewMonth, 'MMM', { locale: it })}</span>
                <span className="f-sum-value">{formatEur(monthTotal)}</span>
             </div>
             <div className="f-summary-card breakdown">
                <div className="f-month-selector finance-mobile-nav">
                  <button className="f-month-btn" onClick={() => setViewMonth(m => subMonths(m, 1))}><ChevronLeft size={24} /></button>
                  <span className="f-mobile-month-name">{format(viewMonth, 'MMM yyyy', { locale: it })}</span>
                  <button className="f-month-btn" onClick={() => setViewMonth(m => addMonths(m, 1))}><ChevronRight size={24} /></button>
                </div>
             </div>
          </div>
        )}

        <div className={`finance-grid ${isMobile ? 'is-mobile' : ''}`}>
          
          {(!isMobile || showMobileAddForm) && (
            <div className={`finance-top-row ${isMobile ? 'management-sheet-overlay' : ''}`} onClick={() => isMobile && setShowMobileAddForm(false)}>
              <div className={`f-widget f-add-widget ${isMobile ? 'management-sheet-content' : ''}`} onClick={e => e.stopPropagation()}>
                {isMobile ? (
                  <div className="management-sheet-header">
                    <h3><Plus size={24} /> Nuova Spesa</h3>
                    <button className="management-sheet-close" onClick={() => setShowMobileAddForm(false)}>
                      <X size={24} />
                    </button>
                  </div>
                ) : (
                  <h2 className="f-form-title"><Plus size={18} /> Aggiungi Spesa</h2>
                )}
                
                <div className={isMobile ? 'management-sheet-body' : ''}>
                  <form onSubmit={handleSubmit}>
                    <div className="f-form-grid">
                      <div className="f-form-group">
                        <label className="f-label">Importo</label>
                        <div className="f-amount-wrapper">
                          <span className="f-amount-symbol">€</span>
                          <input type="number" inputMode="decimal" step="0.01" min="0" className="f-input f-input-amount" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                        </div>
                      </div>
                      <div className="f-form-group">
                        <label className="f-label">Data</label>
                        <input type="date" className="f-input" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div className="f-form-group full-width">
                        <label className="f-label">Descrizione</label>
                        <input type="text" className="f-input" placeholder="Es. Spesa..." value={description} onChange={e => setDescription(e.target.value)} />
                      </div>
                      <div className="f-form-group full-width">
                        <label className="f-label">Categoria</label>
                        <div className="f-cat-group">
                          {(Object.entries(CATEGORY_META) as [ExpenseCategory, typeof CATEGORY_META[ExpenseCategory]][]).filter(([k]) => k !== 'repayment').map(([key, meta]) => (
                            <button key={key} type="button" className={`f-cat-pill ${category === key ? `active-${key}` : ''}`} onClick={() => setCategory(key)}>{meta.icon} {isMobile ? meta.label : meta.label}</button>
                          ))}
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="f-form-group full-width">
                          <label className="f-label">Pagato da</label>
                          <div className="f-person-group">
                            {tags.map(tag => (
                              <button key={tag.id} type="button" className={`f-person-pill ${paidBy === tag.id ? 'selected' : ''}`} style={paidBy === tag.id ? { background: tag.color } : {}} onClick={() => setPaidBy(tag.id)}>{tag.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="f-form-group full-width">
                        <div className="f-split-header">
                          <label className="f-label">Divisione</label>
                          <button type="button" className={`f-split-toggle ${isSplit ? 'split-active' : 'all-active'}`} onClick={() => { setIsSplit(!isSplit); if (!isSplit) setSplitWith(tags.map(t => t.id)); }}><Users size={14} /> {isSplit ? 'Specifica' : 'Tutti'}</button>
                        </div>
                        {isSplit && (
                          <div className="f-split-selector">
                            <div className="f-person-group">
                              {tags.map(tag => (
                                <button key={tag.id} type="button" className={`f-person-pill ${splitWith.includes(tag.id) ? 'selected' : ''}`} style={splitWith.includes(tag.id) ? { background: tag.color } : {}} onClick={() => toggleSplitParticipant(tag.id)}>{tag.label}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="f-submit-btn" disabled={isSaving || !amount || !paidBy}>{isSaving ? 'Salvataggio…' : 'Registra Spesa'}</button>
                    </div>
                  </form>
                </div>
              </div>

              {!isMobile && (
                <div className="f-widget f-balance-widget">
                  <div className="f-widget-header">
                    <h2 className="f-widget-title"><ArrowRightLeft size={16} /> Riepilogo Mensile</h2>
                    <div className="f-month-selector">
                      <button className="f-month-btn" onClick={() => setViewMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
                      <span>{format(viewMonth, 'MMM yy', { locale: it })}</span>
                      <button className="f-month-btn" onClick={() => setViewMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
                    </div>
                  </div>
                  <p className="f-sum-label-desk">Totale {monthLabel}</p>
                  <p className="f-sum-value-desk">{formatEur(monthTotal)}</p>
                  <div className="f-person-cards">
                    {tags.map(tag => {
                      const spent = personTotals[tag.id] ?? 0;
                      const count = monthExpenses.filter(e => e.paidBy === tag.id).length;
                      if (spent === 0 && monthTotal === 0) return null;
                      return (
                        <div key={tag.id} className="f-person-card">
                          <div className="f-person-avatar" style={{ background: tag.color }}>{tag.label.substring(0, 2).toUpperCase()}</div>
                          <div className="f-person-info">
                            <p className="f-person-name">{tag.label}</p>
                            <span className="f-person-count">{count} spese</span>
                          </div>
                          <span className="f-person-amount">{formatEur(spent)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isMobile && balanceSummary.length > 0 && (
            <div className="f-mobile-repay-cards">
               {balanceSummary.map((s, i) => (
                  <div key={i} className="f-repay-card">
                     <div className="f-repay-info">
                        <span className="f-repay-from">{s.from}</span>
                        <ArrowRightLeft size={16} />
                        <span className="f-repay-to">{s.to}</span>
                     </div>
                     <div className="f-repay-actions">
                        <span className="f-repay-amount">{formatEur(s.amount)}</span>
                        <button className="f-repay-confirm" onClick={() => handleRepay(s.from, s.to, s.amount)}><Check size={18} /></button>
                     </div>
                  </div>
               ))}
            </div>
          )}

          <div className="finance-bottom-row">
            <div className="f-widget f-chart-widget">
              <h2 className="f-widget-title"><PieChart size={16} /> Categorie</h2>
              <PieChart2D data={pieData} />
            </div>
            <div className="f-widget f-bar-widget">
              <h2 className="f-widget-title"><TrendingUp size={16} /> Tendenza</h2>
              <BarChart bars={barData} />
            </div>
          </div>

          <div className="f-widget f-history-widget">
            <div className="f-widget-header" style={{ marginBottom: '20px' }}>
              <h2 className="f-widget-title"><Receipt size={16} /> Storico {isMobile ? '' : monthLabel}</h2>
            </div>
            <div className="f-expenses-list">
              {filteredExpenses.map(exp => {
                const meta = CATEGORY_META[exp.category];
                const tag  = tags.find(t => t.id === exp.paidBy);
                return (
                  <div key={exp.id} className="f-expense-item">
                    <div className="f-expense-cat-icon" style={{ background: meta.bg }}>{meta.icon}</div>
                    <div className="f-expense-info">
                      <p className="f-expense-desc">{exp.description}</p>
                      <div className="f-expense-meta">
                        <span>{format(parseISO(exp.date), 'dd MMM', { locale: it })}</span>
                        {tag && <span className="f-expense-person-tag" style={{ background: tag.color }}>{tag.label}</span>}
                      </div>
                    </div>
                    <span className="f-expense-amount">{formatEur(exp.amount)}</span>
                    <button className="f-expense-del" onClick={() => onDeleteExpense(exp.id)}><Trash2 size={16} /></button>
                  </div>
                );
              })}
              {filteredExpenses.length === 0 && <p className="f-empty-msg">Nessuna spesa trovata.</p>}
            </div>
          </div>

          {isMobile && (
            <>
              <div className="mobile-fab-container-left">
                {showMoreMenu && (
                  <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
                    <button className="mobile-menu-item" onClick={() => { setShowTagSettings(true); setShowMoreMenu(false); }}>
                      <Settings size={20} />
                      <span>Personalizzazione targhette</span>
                    </button>
                    <button className="mobile-menu-item" onClick={() => { setShowExpensesSheet(true); setShowMoreMenu(false); }}>
                      <Receipt size={20} />
                      <span>Gestione delle spese</span>
                    </button>
                  </div>
                )}
                <button 
                  className={`mobile-fab-more ${showMoreMenu ? 'active' : ''}`}
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                >
                  <MoreVertical size={28} />
                </button>
              </div>

              <button className="mobile-fab-add finance" onClick={() => setShowMobileAddForm(true)}>
                <Plus size={28} />
              </button>

              {showExpensesSheet && (
                <div className="management-sheet-overlay" onClick={() => setShowExpensesSheet(false)}>
                  <div className="management-sheet-content" onClick={e => e.stopPropagation()}>
                    <div className="management-sheet-header">
                      <h3><Wallet size={24} /> Elenco Spese</h3>
                      <button className="management-sheet-close" onClick={() => setShowExpensesSheet(false)}>
                        <X size={24} />
                      </button>
                    </div>
                    <div className="management-sheet-body">
                      {filteredExpenses.map(exp => (
                        <div key={exp.id} className="management-list-item">
                          <div className="f-expense-cat-icon" style={{ background: CATEGORY_META[exp.category].bg, marginRight: '12px' }}>
                            {CATEGORY_META[exp.category].icon}
                          </div>
                          <div className="management-item-details">
                            <span className="management-item-title">{exp.description}</span>
                            <span className="management-item-subtitle">{format(parseISO(exp.date), 'dd MMM', { locale: it })} • {tags.find(t => t.id === exp.paidBy)?.label}</span>
                          </div>
                          <span className="management-item-amount" style={{ fontWeight: 800, color: '#059669' }}>
                            {formatEur(exp.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {showTagSettings && (
        <div className={`modal-overlay ${isMobile ? 'management-sheet-overlay' : ''}`} onClick={() => setShowTagSettings(false)}>
          <div className={isMobile ? 'management-sheet-content' : 'tag-modal'} onClick={e => e.stopPropagation()}>
            {isMobile ? (
              <div className="management-sheet-header">
                <h3><Users size={24} /> Coinquilini</h3>
                <button className="management-sheet-close" onClick={() => setShowTagSettings(false)}>
                  <X size={24} />
                </button>
              </div>
            ) : (
              <div className="modal-header">
                <h3>Coinquilini</h3>
                <button onClick={() => setShowTagSettings(false)}><X size={24} /></button>
              </div>
            )}

            <div className={isMobile ? 'management-sheet-body' : ''}>
              <div className="tags-list-current">
                {tags.map(tag => (
                  <div key={tag.id} className="tag-item-editor">
                    <span className="tag-badge-preview" style={{ background: tag.color }}>{tag.label}</span>
                    <button className="tag-delete-btn" onClick={() => onDeleteTag(tag.id)} title="Elimina Coinquilino">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleCreateTag} className="f-add-tag-form">
                <input 
                  type="text" 
                  placeholder="Nuovo coinquilino..." 
                  value={newTagLabel} 
                  onChange={e => setNewTagLabel(e.target.value)} 
                />
                <button type="submit" className="f-add-tag-submit">
                  <Plus size={24} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
