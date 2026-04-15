import React, { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Trash2, Receipt, TrendingUp, PieChart,
  Settings, MoreVertical
} from 'lucide-react';
import { format, parseISO, startOfMonth, startOfToday, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Expense, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { TagManagerModal } from './TagManagerModal';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import './FinanceSection.css';

/* ============================================================
   HELPERS
   ============================================================ */
const formatEur = (v: number) => 
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

// Simple Pie Chart Placeholder
const PieChart2D = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="f-no-data">Nessun dato</div>;

  let cumulativePercent = 0;
  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  return (
    <div className="f-pie-container">
      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += d.value / total;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          const largeArcFlag = d.value / total > 0.5 ? 1 : 0;
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 0 0`,
          ].join(' ');
          return <path key={i} d={pathData} fill={d.color} />;
        })}
      </svg>
      <div className="f-pie-legend">
        {data.map((d, i) => (
          <div key={i} className="f-legend-item">
            <span className="f-legend-dot" style={{ background: d.color }}></span>
            <span className="f-legend-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Bar Chart
const BarChart = ({ bars }: { bars: { label: string; value: number }[] }) => {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="f-bar-container">
      {bars.map((b, i) => (
        <div key={i} className="f-bar-row">
          <span className="f-bar-label">{b.label}</span>
          <div className="f-bar-track">
            <div className="f-bar-fill" style={{ width: `${(b.value / max) * 100}%` }}></div>
          </div>
          <span className="f-bar-value">{formatEur(b.value)}</span>
        </div>
      ))}
    </div>
  );
};

const CATEGORY_META: Record<string, { icon: string; bg: string }> = {
  supermarket: { icon: '🛒', bg: '#fee2e2' },
  home: { icon: '🏠', bg: '#e0f2fe' },
  medicine: { icon: '💊', bg: '#dcfce7' },
  other: { icon: '📦', bg: '#f1f5f9' },
};

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
  isActive?: boolean;
}

type FinanceCoinStyle = CSSProperties & {
  '--size': string;
  '--left': string;
  '--top': string;
  '--delay': string;
  '--duration': string;
  '--drift': string;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function FinanceSection({ 
  expenses, tags, onAddExpense, onDeleteExpense, onAddTag, onDeleteTag, isMobile, isActive 
}: FinanceSectionProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Expense['category']>('supermarket');
  const [paidBy, setPaidBy] = useState(tags[0]?.id || '');
  const [splitWith, setSplitWith] = useState<string[]>(tags.map(t => t.id));
  const [isSaving, setIsSaving] = useState(false);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showExpensesSheet, setShowExpensesSheet] = useState(false);

  const { transform: expensesSheetTransform, handlers: expensesSheetHandlers } = useSwipeToDismiss(() => {
    setShowExpensesSheet(false);
    setShowMoreMenu(false);
  }, 100, showExpensesSheet);

  const today = startOfToday();
  const currentMonthStart = startOfMonth(today);
  const monthLabel = format(today, 'MMMM yyyy', { locale: it });

  const filteredExpenses = expenses
    .filter(e => isSameMonth(parseISO(e.date), currentMonthStart))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by Category for Pie
  const catTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(catTotals).map(([cat, val]) => ({
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: val,
    color: cat === 'supermarket' ? '#ef4444' : cat === 'home' ? '#3b82f6' : cat === 'medicine' ? '#10b981' : '#94a3b8'
  }));

  // Group by Person for Bar (who spent how much)
  const personTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.paidBy] = (acc[e.paidBy] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const barData = tags.map(t => ({
    label: t.label,
    value: personTotals[t.id] || 0
  }));

  // Balance calculation (Owes/Owed)
  // 1. Calculate how much each person *should* have paid based on splitWith
  const balances: Record<string, number> = {};
  tags.forEach(t => { balances[t.id] = 0; });

  filteredExpenses.forEach(exp => {
    const participants = exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : tags.map(t => t.id);
    const share = exp.amount / participants.length;
    // Payer gets credit
    balances[exp.paidBy] += exp.amount;
    // Participants get debit
    participants.forEach(pId => {
      balances[pId] -= share;
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || isSaving) return;
    setIsSaving(true);
    try {
      await onAddExpense({
        amount: parseFloat(amount.replace(',', '.')),
        description: description.trim(),
        category,
        paidBy,
        splitWith,
        date: format(today, 'yyyy-MM-dd')
      });
      setAmount('');
      setDescription('');
    } catch (err) {
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettlement = async (fromId: string, toId: string, amount: number) => {
    if (!window.confirm(`Stai registrando un rimborso di ${formatEur(amount)}? Questo bilancerà il conto nello storico fisicamente come una nuova voce.`)) return;
    setIsSaving(true);
    try {
      await onAddExpense({
        amount,
        description: `Rimborso: ${tags.find(t => t.id === fromId)?.label} → ${tags.find(t => t.id === toId)?.label}`,
        category: 'other',
        paidBy: fromId,
        splitWith: [toId],
        date: format(today, 'yyyy-MM-dd')
      });
    } catch (err) {
      alert("Errore durante la registrazione del rimborso.");
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
             <div className="finance-visual-container">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="f-floating-coin" style={{ 
                    '--size': `${15 + Math.random() * 20}px`,
                    '--left': `${Math.random() * 100}%`,
                    '--top': `${Math.random() * 100}%`,
                    '--delay': `${Math.random() * 2}s`,
                    '--duration': `${3 + Math.random() * 4}s`,
                    '--drift': `${(Math.random() - 0.5) * 40}px`
                  } as FinanceCoinStyle}>€</div>
                ))}
                <div className="f-total-bubble">
                   <span className="f-bubble-label">Totale Mese</span>
                   <span className="f-bubble-value">{formatEur(totalSpent)}</span>
                </div>
             </div>
          </div>
        </header>

        <div className="finance-grid">
           {/* Add Expense Form */}
           <div className="f-widget f-add-widget">
              <h2 className="f-widget-title"><Plus size={18} /> Nuova Spesa</h2>
              <form onSubmit={handleSubmit} className="f-add-form">
                 <div className="f-input-group">
                    <label>Importo</label>
                    <div className="f-amount-input-wrapper">
                       <span>€</span>
                       <input 
                         type="text" 
                         inputMode="decimal" 
                         placeholder="0,00" 
                         value={amount} 
                         onChange={e => setAmount(e.target.value)}
                         required
                       />
                    </div>
                 </div>

                 <div className="f-input-group">
                    <label>Descrizione</label>
                    <input 
                      type="text" 
                      placeholder="Esempio: Spesa settimanale..." 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required
                    />
                 </div>

                 <div className="f-input-row">
                    <div className="f-input-group">
                       <label>Categoria</label>
                       <select value={category} onChange={e => setCategory(e.target.value as any)}>
                          <option value="supermarket">🛒 Supermercato</option>
                          <option value="home">🏠 Casa</option>
                          <option value="medicine">💊 Farmacia</option>
                          <option value="other">📦 Altro</option>
                       </select>
                    </div>
                    <div className="f-input-group">
                       <label>Pagato da</label>
                       <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                          {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="f-input-group">
                    <label>Diviso con</label>
                    <div className="f-split-selector">
                       {tags.map(t => (
                         <button 
                           key={t.id} 
                           type="button"
                           className={`f-split-btn ${splitWith.includes(t.id) ? 'active' : ''}`}
                           style={{ '--tint': t.color } as CSSProperties}
                           onClick={() => toggleSplitParticipant(t.id)}
                         >
                            {t.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button type="submit" className="f-submit-btn" disabled={isSaving}>
                    {isSaving ? 'Salvataggio...' : 'Registra Spesa'}
                 </button>
              </form>
           </div>

           {/* Balances Widget */}
           <div className="f-widget f-balance-widget">
              <h2 className="f-widget-title"><TrendingUp size={18} /> Deficit & Crediti</h2>
              <div className="f-balances-list">
                 {tags.map(t => {
                   const bal = balances[t.id];
                   return (
                     <div key={t.id} className="f-balance-item">
                        <div className="f-balance-person">
                           <div className="f-person-dot" style={{ background: t.color }}></div>
                           <span className="f-person-name">{t.label}</span>
                        </div>
                        <div className={`f-balance-amount ${bal >= 0 ? 'pos' : 'neg'}`}>
                           {bal >= 0 ? '+' : ''}{formatEur(bal)}
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div className="f-settlements-suggestion">
                 <h3 className="f-sub-title">Suggerimenti pareggio:</h3>
                 {(() => {
                   const sorted = tags.map(t => ({ id: t.id, bal: balances[t.id] })).sort((a,b) => a.bal - b.bal);
                   let i = 0, j = sorted.length - 1;
                   const results = [];
                   const localBals = sorted.map(s => ({ ...s }));

                   while(i < j) {
                     const amount = Math.min(-localBals[i].bal, localBals[j].bal);
                     if (amount > 0.01) {
                       results.push({ from: localBals[i].id, to: localBals[j].id, amount });
                       localBals[i].bal += amount;
                       localBals[j].bal -= amount;
                     }
                     if (localBals[i].bal >= -0.01) i++;
                     if (localBals[j].bal <= 0.01) j--;
                   }
                   
                   if (results.length === 0) return <p className="f-all-even">🎉 Tutti in pari!</p>;
                   return results.map((r, idx) => (
                     <div key={idx} className="f-settle-row">
                        <span>{tags.find(t => t.id === r.from)?.label} deve dare <b>{formatEur(r.amount)}</b> a {tags.find(t => t.id === r.to)?.label}</span>
                        <button onClick={() => handleSettlement(r.from, r.to, r.amount)}>Saldato</button>
                     </div>
                   ));
                 })()}
              </div>
           </div>

           {/* Charts */}
           <div className="f-charts-row">
              <div className="f-widget f-pie-widget">
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
        </div>
      </div>

      {createPortal(
        <div className={`mobile-tab-panel-portal ${isActive ? 'is-active' : ''}`}>
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

              {showExpensesSheet && (
                <div className="management-sheet-overlay">
                  <div
                    className="management-sheet-content"
                    onClick={e => e.stopPropagation()}
                    style={{ transform: expensesSheetTransform }}
                    {...expensesSheetHandlers}
                  >
                    <div className="bottom-sheet-drag-handle" />
                    <div className="management-sheet-header">
                      <h3><Receipt size={24} /> Elenco Spese</h3>
                    </div>
                    <div className="management-sheet-body">
                      {filteredExpenses.map(exp => (
                        <div key={exp.id} className="management-list-item f-sheet-item">
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
        </div>,
        document.body
      )}

      {showTagSettings && (
        <TagManagerModal 
          tags={tags}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
          onClose={() => setShowTagSettings(false)}
          hideCloseButton={isMobile}
          closeOnOverlay={!isMobile}
          title="Coinquilini"
          hint="I coinquilini partecipano alla divisione delle spese. Puoi aggiungere o rimuovere partecipanti."
        />
      )}
    </main>
  );
}
