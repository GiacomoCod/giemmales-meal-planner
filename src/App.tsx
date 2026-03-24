import { useState, useEffect } from 'react';
import { Croissant, Soup, Utensils, ShoppingCart, Check, Trash2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, app } from './firebase';
import './App.css';

const SUGGESTIONS = [
  { text: 'Biscotti', icon: '🍪' },
  { text: 'Broccoli', icon: '🥦' },
  { text: 'Burro', icon: '🧈' },
  { text: 'Caffè', icon: '☕' },
  { text: 'Carote', icon: '🥕' },
  { text: 'Cipolle', icon: '🧅' },
  { text: 'Farina', icon: '🌾' },
  { text: 'Formaggio', icon: '🧀' },
  { text: 'Frutta', icon: '🍎' },
  { text: 'Latte', icon: '🥛' },
  { text: 'Olio extravergine', icon: '🫒' },
  { text: 'Pane', icon: '🥖' },
  { text: 'Pasta', icon: '🍝' },
  { text: 'Patate', icon: '🥔' },
  { text: 'Pepe', icon: '🧂' },
  { text: 'Pollo', icon: '🍗' },
  { text: 'Pomodori', icon: '🍅' },
  { text: 'Pesce', icon: '🐟' },
  { text: 'Riso', icon: '🍚' },
  { text: 'Sale', icon: '🧂' },
  { text: 'Uova', icon: '🥚' },
  { text: 'Zucchero', icon: '🍯' }
];

const MEALS = [
  { id: 'colazione', label: 'Colazione', Icon: Croissant },
  { id: 'pranzo', label: 'Pranzo', Icon: Soup },
  { id: 'cena', label: 'Cena', Icon: Utensils }
];

const PASTEL_VARS = [
  'var(--col-lunedi)', 'var(--col-martedi)', 'var(--col-mercoledi)',
  'var(--col-giovedi)', 'var(--col-venerdi)', 'var(--col-sabato)', 'var(--col-domenica)'
];

export type MealEntry = {
  id: string;
  text: string;
  assignee: 'Ale' | 'Giem' | 'Giemmale';
};

type MealPlan = {
  [dateKey: string]: {
    [mealId: string]: MealEntry[];
  };
};

function MealSlot({
  meal, entries, onAdd, onRemove, onUpdateAssignee
}: {
  meal: { id: string; label: string; Icon: any };
  entries: MealEntry[];
  onAdd: (text: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => void;
  onRemove: (id: string) => void;
  onUpdateAssignee: (id: string, newAssignee: 'Ale' | 'Giem' | 'Giemmale') => void;
}) {
  const [text, setText] = useState('');
  const Icon = meal.Icon;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text, 'Giemmale');
      setText('');
    }
  };

  const cycleAssignee = (current: 'Ale' | 'Giem' | 'Giemmale') => {
    if (current === 'Giemmale') return 'Ale';
    if (current === 'Ale') return 'Giem';
    return 'Giemmale';
  };

  return (
    <div className="meal-slot">
      <div className="meal-header">
        <Icon className="meal-icon" size={20} strokeWidth={2.5} />
        <h3 className="meal-title">{meal.label}</h3>
      </div>

      <ul className="meal-entries">
        {entries.map(entry => (
          <li key={entry.id} className="meal-entry">
            <button
              type="button"
              className={`assignee-badge assignee-${entry.assignee.toLowerCase()}`}
              onClick={() => onUpdateAssignee(entry.id, cycleAssignee(entry.assignee))}
              title="Cambia chi mangia questo pasto"
            >
              {entry.assignee}
            </button>
            <span className="meal-entry-text">{entry.text}</span>
            <button className="del-entry-btn" type="button" onClick={() => onRemove(entry.id)}>
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>

      <form className="add-entry-form" onSubmit={handleAdd}>
        <div className="entry-input-group">
          <input
            type="text"
            placeholder="Aggiungi pasto..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
      </form>
    </div>
  );
}

type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
};

function App() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [weekNotes, setWeekNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = SUGGESTIONS.filter(item =>
    item.text.toLowerCase().includes(newItemText.toLowerCase()) && newItemText.length > 0
  );

  useEffect(() => {
    // LocalStorage automatic silent migration to Firebase
    const savedShopping = localStorage.getItem('shoppingListData');
    if (savedShopping) {
      try {
        const list = JSON.parse(savedShopping) as ShoppingItem[];
        list.forEach(item => setDoc(doc(db, 'shoppingList', item.id), item));
        localStorage.removeItem('shoppingListData');
      } catch (e) { }
    }
    const savedMeals = localStorage.getItem('mealPlannerData');
    if (savedMeals) {
      try {
        const plans = JSON.parse(savedMeals) as MealPlan;
        Object.keys(plans).forEach(dateKey => {
          setDoc(doc(db, 'mealPlans', dateKey), plans[dateKey]);
        });
        localStorage.removeItem('mealPlannerData');
      } catch (e) { }
    }

    // Real-time Firestore Listeners
    console.log("[FIREBASE] Inizializzando listeners per:", app?.options?.projectId);

    const unsubscribeMeals = onSnapshot(
      collection(db, 'mealPlans'),
      (snapshot) => {
        const newPlan: MealPlan = {};
        snapshot.forEach(d => {
          newPlan[d.id] = d.data() as { [mealId: string]: MealEntry[] };
        });
        setMealPlan(newPlan);
      },
      (error) => {
        console.error("[FIREBASE MEALS ERROR]:", error);
      }
    );

    const unsubscribeShopping = onSnapshot(
      collection(db, 'shoppingList'),
      (snapshot) => {
        const list = snapshot.docs.map(d => d.data() as ShoppingItem);
        setShoppingList(list);
      },
      (error) => {
        console.error("[FIREBASE SHOPPING ERROR]:", error);
      }
    );

    return () => {
      unsubscribeMeals();
      unsubscribeShopping();
    };
  }, []);

  // Sync notes for the selected week
  useEffect(() => {
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    const unsubscribeNotes = onSnapshot(
      doc(db, 'weekNotes', weekKey),
      (docSnap) => {
        if (docSnap.exists()) {
          setWeekNotes(docSnap.data().content || '');
        } else {
          setWeekNotes('');
        }
      },
      (error) => {
        console.error("[FIREBASE NOTES ERROR]:", error);
      }
    );

    return () => unsubscribeNotes();
  }, [selectedWeekStart]);

  const handleUpdateNotes = async (content: string) => {
    setWeekNotes(content);
    setIsSavingNotes(true);
    const weekKey = format(selectedWeekStart, 'yyyy-MM-dd');
    try {
      await setDoc(doc(db, 'weekNotes', weekKey), { content }, { merge: true });
      setTimeout(() => setIsSavingNotes(false), 800);
    } catch (error: any) {
      console.error("[FIREBASE NOTES SAVE ERROR]:", error);
      setIsSavingNotes(false);
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ShoppingItem = { id: generateId(), text: newItemText.trim(), checked: false };
    setNewItemText('');
    setShowSuggestions(false);

    try {
      await setDoc(doc(db, 'shoppingList', newItem.id), newItem);
    } catch (err: any) {
      console.error("[FIREBASE SET ERROR]:", err);
    }
  };

  const handleAddSuggestion = async (text: string, icon: string) => {
    const newItem: ShoppingItem = { id: generateId(), text: `${icon} ${text}`, checked: false };
    setNewItemText('');
    setShowSuggestions(false);

    try { await setDoc(doc(db, 'shoppingList', newItem.id), newItem); } catch (e: any) { console.error(e); }
  };

  const toggleItem = async (id: string) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;
    try { await updateDoc(doc(db, 'shoppingList', id), { checked: !item.checked }); } catch (e: any) { console.error(e); }
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await deleteDoc(doc(db, 'shoppingList', id)); } catch (e: any) { console.error(e); }
  };

  const handleAddMealEntry = async (dateKey: string, mealId: string, text: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => {
    const newEntry: MealEntry = { id: generateId(), text, assignee };
    const dayData = mealPlan[dateKey] || {};

    try {
      await setDoc(doc(db, 'mealPlans', dateKey), {
        ...dayData,
        [mealId]: [...(dayData[mealId] || []), newEntry]
      }, { merge: true });
    } catch (e: any) {
      console.error("[FIREBASE MEALS SET ERROR]:", e);
    }
  };

  const handleRemoveMealEntry = async (dateKey: string, mealId: string, entryId: string) => {
    const dayData = mealPlan[dateKey] || {};
    const mealData = dayData[mealId] || [];

    await setDoc(doc(db, 'mealPlans', dateKey), {
      ...dayData,
      [mealId]: mealData.filter(e => e.id !== entryId)
    }, { merge: true });
  };

  const handleUpdateAssignee = async (dateKey: string, mealId: string, entryId: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => {
    const dayData = mealPlan[dateKey] || {};
    const mealData = dayData[mealId] || [];

    await setDoc(doc(db, 'mealPlans', dateKey), {
      ...dayData,
      [mealId]: mealData.map(e => e.id === entryId ? { ...e, assignee } : e)
    }, { merge: true });
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = [];
  let dayIterator = calendarStart;
  while (dayIterator <= calendarEnd) {
    calendarDays.push(dayIterator);
    dayIterator = addDays(dayIterator, 1);
  }

  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const activeWeekDays = Array.from({ length: 7 }).map((_, i) => addDays(selectedWeekStart, i));

  const [activeTab, setActiveTab] = useState<'planner' | 'shopping'>('planner');

  return (
    <div className="app-wrapper">
      <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-icon">🍽️</span>
            <h1 className="nav-title">Meal Planner</h1>
          </div>

          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveTab('planner')}
            >
              <CalendarIcon size={20} strokeWidth={2.5} />
              <span>Calendario Menù</span>
            </button>
            <button
              className={`nav-tab ${activeTab === 'shopping' ? 'active' : ''}`}
              onClick={() => setActiveTab('shopping')}
            >
              <ShoppingCart size={20} strokeWidth={2.5} />
              <span>Lista Spesa</span>
            </button>
          </div>

          <div className="nav-spacer"></div>
        </div>
      </nav>

      <div className="layout">
        {activeTab === 'planner' && (
          <>
            <aside className="sidebar">
              <div className="sidebar-sticky">
                <div className="calendar-card">
                  <div className="calendar-header">
                    <button className="calendar-nav-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <span>{format(currentMonth, 'MMMM yyyy', { locale: it })}</span>
                    <button className="calendar-nav-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
                  </div>
                  <div className="calendar-grid">
                    {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
                      <div key={i} className="calendar-day-header">{d}</div>
                    ))}
                    {calendarDays.map(day => {
                      const isSelectedWeek = day >= selectedWeekStart && day <= selectedWeekEnd;
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      return (
                        <div
                          key={day.toString()}
                          className={`calendar-cell ${!isCurrentMonth ? 'muted' : ''} ${isSelectedWeek ? 'selected-week' : ''}`}
                          onClick={() => {
                            setSelectedWeekStart(startOfWeek(day, { weekStartsOn: 1 }));
                            setCurrentMonth(startOfMonth(day));
                          }}
                        >
                          <div className="calendar-cell-inner">{format(day, 'd')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="notes-card">
                  <div className="notes-header">
                    <h3 className="notes-title">Note della Settimana 📝</h3>
                    {isSavingNotes && <span className="notes-saving">Salvataggio...</span>}
                  </div>
                  <textarea
                    className="notes-textarea"
                    placeholder="Aggiungi note per questa settimana..."
                    value={weekNotes}
                    onChange={(e) => handleUpdateNotes(e.target.value)}
                  />
                </div>
              </div>
            </aside>

        <main className="main-content">
          <div className="grid-container">
            {activeWeekDays.map((dayDate) => {
              const dateKey = format(dayDate, 'yyyy-MM-dd');
              const dayName = format(dayDate, 'EEEE d', { locale: it });

              const jsDay = dayDate.getDay();
              const cssIndex = jsDay === 0 ? 6 : jsDay - 1;

              return (
                <div key={dateKey} className="day-card" style={{ backgroundColor: PASTEL_VARS[cssIndex] }}>
                  <h2 className="day-title">{dayName}</h2>
                  <div className="meals-container">
                    {MEALS.map((meal) => (
                      <MealSlot
                        key={meal.id}
                        meal={meal}
                        entries={mealPlan[dateKey]?.[meal.id] || []}
                        onAdd={(text, assignee) => handleAddMealEntry(dateKey, meal.id, text, assignee)}
                        onRemove={(id) => handleRemoveMealEntry(dateKey, meal.id, id)}
                        onUpdateAssignee={(id, assignee) => handleUpdateAssignee(dateKey, meal.id, id, assignee)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </>
      )}

      {activeTab === 'shopping' && (
        <main className="main-content shopping-only">
          <section className="shopping-section">
            <div className="shopping-card">
              <div className="shopping-header">
                <ShoppingCart className="shopping-icon" size={26} strokeWidth={2.5} />
                <h2>Lista della Spesa</h2>
              </div>

              <form className="shopping-form" onSubmit={handleAddItem}>
                <div className="shopping-input-wrapper">
                  <input
                    type="text"
                    className="shopping-input"
                    placeholder="Cerca o aggiungi..."
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className="suggestions-dropdown">
                      {filteredSuggestions.map(suggestion => (
                        <li
                          key={suggestion.text}
                          className="suggestion-item"
                          onClick={() => handleAddSuggestion(suggestion.text, suggestion.icon)}
                        >
                          <div className="suggestion-info">
                            <span className="suggestion-icon">{suggestion.icon}</span>
                            <span className="suggestion-name">{suggestion.text}</span>
                          </div>
                          <button className="suggestion-add-btn" type="button">
                            <Plus size={16} strokeWidth={3} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button type="submit" className="shopping-btn">
                  Aggiungi
                </button>
              </form>

              <ul className="shopping-list">
                {shoppingList.map(item => (
                  <li key={item.id} className={`shopping-item ${item.checked ? 'checked' : ''}`} onClick={() => toggleItem(item.id)}>
                    <div className="checkbox">
                      {item.checked && <Check size={14} strokeWidth={3.5} />}
                    </div>
                    <span className="item-text">{item.text}</span>
                    <button
                      className="delete-btn"
                      onClick={(e) => deleteItem(item.id, e)}
                      title="Rimuovi"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      )}
    </div>
    </div >
  );
}

export default App;
