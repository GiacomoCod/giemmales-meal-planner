import React, { useState } from 'react';
import {
  Calendar,
  ShoppingCart,
  BookOpen,
  Sparkles,
  Plus,
  Utensils,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  Store,
  Home as HomeIcon,
  Pill,
  Wallet
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import './HomeSection.css';
import { MEALS, ROOMS } from '../constants';
import type { MealPlan, ShoppingItem, Recipe, RoomTask, CleaningLog, TaskSettings, CalendarEvent, Tag, Expense } from '../types';
import houseImg from '../assets/house-3d.png';

interface HomeSectionProps {
  isMobile?: boolean;
  userName: string;
  mealPlan: MealPlan;
  shoppingList: ShoppingItem[];
  recipes: Recipe[];
  roomTasks: RoomTask[];
  cleaningLogs: CleaningLog[];
  taskSettings: TaskSettings;
  events: CalendarEvent[];
  tags: Tag[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  onNavigate: (tab: 'planner' | 'shopping' | 'recipes' | 'cleaning' | 'finance') => void;
  onQuickAction: (action: string) => void;
  expenses: Expense[];
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  isMobile,
  userName,
  mealPlan,
  shoppingList,
  recipes,
  roomTasks,
  cleaningLogs,
  taskSettings,
  events,
  tags,
  onAddEvent,
  onDeleteEvent,
  onNavigate,
  onQuickAction,
  expenses
}) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showEndTime, setShowEndTime] = useState(false);
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const todayDate = new Date();
  const currentWeekStart = startOfWeek(addWeeks(todayDate, offsetWeeks), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Calculate next cleaning date
  const getNextCleaningDate = (taskName: string, roomId: string) => {
    const logs = cleaningLogs.filter(l => l.roomId === roomId && l.taskType === taskName);
    const settings = taskSettings[taskName] || { value: 1, unit: 'settimane' };

    let totalDays = settings.value;
    if (settings.unit === 'settimane') totalDays *= 7;
    else if (settings.unit === 'mesi') totalDays *= 30;
    else if (settings.unit === 'anni') totalDays *= 365;

    if (logs.length === 0) return null; // Don't show in calendar if never done before

    const lastLog = logs.sort((a, b) => b.timestamp - a.timestamp)[0];
    const nextDate = addDays(new Date(lastLog.timestamp), totalDays);
    return format(nextDate, 'yyyy-MM-dd');
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventText.trim()) {
      onAddEvent({
        text: newEventText.trim(),
        date: newEventDate,
        startTime: newEventTime || undefined,
        endTime: showEndTime && newEventEndTime ? newEventEndTime : undefined,
        color: '#e2e8f0'
      });
      setNewEventText('');
      setNewEventTime('');
      setNewEventEndTime('');
      setShowEndTime(false);
      setShowEventForm(false);
    }
  };

  const getTagColor = (label: string) => {
    const tag = tags.find(t => t.label === label);
    return tag ? tag.color : '#e2e8f0';
  };

  const pendingShopping = shoppingList.filter(item => !item.checked).length;
  const pendingFood = shoppingList.filter(item => !item.checked && (item.category === 'supermarket' || !item.category)).length;
  const pendingHome = shoppingList.filter(item => !item.checked && item.category === 'home').length;
  const pendingMed = shoppingList.filter(item => !item.checked && item.category === 'medicine').length;

  // Finance: totale spese mese corrente
  const monthFinanceTotal = expenses.reduce((sum, e) => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      ? sum + e.amount
      : sum;
  }, 0);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="welcome-section">
          <div className="hero-container">
            <div className="hero-text">
              <span className="welcome-label">Bentornat*,</span>
              <h1 className="welcome-name">{userName}</h1>
              <p className="hero-subtitle">Organizza al meglio la tua casetta</p>
            </div>
            <div className="hero-graphic">
              <div className="floating-house-wrapper">
                <img src={houseImg} alt="3D House" className="floating-house" />
                <div className="house-shadow"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="home-grid">
        {/* NEW HOUSE CALENDAR WIDGET */}
        <section className="home-card card-full-width glass house-calendar-card">
          <div className="card-header-with-action">
            <div className="header-left">
              <Calendar className="icon-vibrant-indigo" size={24} />
              <div className="header-title-nav">
                <h3 className="card-title">
                  Calendario della Casa
                </h3>
                <div className="calendar-nav-arrows">
                  <div className="nav-btn-group">
                    <button className="nav-arrow-btn" onClick={() => setOffsetWeeks(prev => prev - 1)}>
                      <ChevronLeft size={20} />
                    </button>
                    <button className="nav-arrow-btn" onClick={() => setOffsetWeeks(prev => prev + 1)}>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  <span className="current-week-label">
                    {(() => {
                      const start = weekDays[0];
                      const end = weekDays[6];
                      if (format(start, 'M') === format(end, 'M')) {
                        return format(start, 'MMMM yyyy', { locale: it });
                      } else {
                        const startMonth = format(start, 'MMM', { locale: it });
                        const endMonth = format(end, 'MMM', { locale: it });
                        const year = format(end, 'yyyy');
                        return `${startMonth} - ${endMonth} ${year}`;
                      }
                    })()}
                  </span>
                  {offsetWeeks !== 0 && (
                    <button className="nav-today-btn" onClick={() => setOffsetWeeks(0)}>Oggi</button>
                  )}
                </div>
              </div>
            </div>
            <button className="add-event-btn" onClick={() => setShowEventForm(true)}>
              <Plus size={isMobile ? 20 : 18} />
              {!isMobile && <span>Nuovo Evento</span>}
            </button>
          </div>

          <div className="calendar-scroll-wrapper">
            <div className="house-calendar-grid">
              {weekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = events.filter(e => e.date === dateKey);
                const dayTasks = roomTasks.filter(t => getNextCleaningDate(t.taskName, t.roomId) === dateKey);

                const isToday = isSameDay(day, new Date());

                return (
                  <div key={dateKey} className={`calendar-day-col ${isToday ? 'is-today' : ''}`}>
                    <div className="day-header">
                      <span className="day-name">{format(day, 'EEE', { locale: it })}</span>
                      <span className="day-number">{format(day, 'd')}</span>
                    </div>
                    <div className="day-events">
                      {dayEvents.map(event => (
                        <div key={event.id} className="calendar-event-item" style={{ borderLeftColor: event.color }}>
                          <div className="event-info">
                            {(event.startTime || event.endTime) && (
                              <span className="event-time">
                                {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
                              </span>
                            )}
                            <span className="event-text">{event.text}</span>
                          </div>
                          <button className="event-delete-btn" onClick={() => onDeleteEvent(event.id)}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {dayTasks.map((task, i) => {
                        const room = ROOMS.find(r => r.id === task.roomId);
                        return (
                          <div key={`task-${i}`} className="calendar-task-item">
                            <Sparkles size={10} />
                            <span style={{ fontSize: '11px' }}>{task.taskName} {room ? `(${room.label})` : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Home Banner / Today's Menu */}
        <div className="home-card card-medium glass" onClick={() => onNavigate('planner')}>
          <div className="card-content">
            <div className="card-header">
              <Utensils className="icon-vibrant-orange" size={24} />
              <span className="card-tag">Menù di Oggi</span>
            </div>
            <div className="meal-preview-list">
              {(() => {
                const todayKey = format(new Date(), 'yyyy-MM-dd');
                const todayMeals = mealPlan[todayKey] || {};
                return MEALS.map(meal => {
                  const entries = todayMeals[meal.id] || [];
                  return (
                    <div key={meal.id} className="meal-preview-row">
                      <span className="meal-name-label">{meal.label}</span>
                      <div className="meal-entries-stack">
                        {entries.length > 0 ? (
                          entries.map(entry => (
                            <div key={entry.id} className="meal-entry-pill">
                              <span
                                className="assignee-tag-mini"
                                style={{ backgroundColor: getTagColor(entry.assignee) }}
                              >
                                {entry.assignee}
                              </span>
                              <span className="meal-entry-name">{entry.text}</span>
                            </div>
                          ))
                        ) : (
                          <span className="meal-entry-empty">Non pianificato</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div className="card-footer">
            <span>Vai al calendario menù</span>
            <ArrowRight size={18} />
          </div>
        </div>

        {/* Quick Organizers */}
        <div className="home-card card-medium glass highlight-blue">
          <div className="card-content">
            <h3 className="card-title">Cosa vuoi organizzare?</h3>
            <div className="action-buttons">
              <button
                className="action-btn"
                onClick={() => onQuickAction('add-shopping')}
              >
                <div className="action-icon blue">
                  <Plus size={20} />
                </div>
                <span>Spesa</span>
              </button>
              <button
                className="action-btn"
                onClick={() => onQuickAction('add-recipe')}
              >
                <div className="action-icon purple">
                  <Plus size={20} />
                </div>
                <span>Ricetta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Shopping Status */}
        <div className="home-card card-small glass" onClick={() => onNavigate('shopping')} style={{ cursor: 'pointer' }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <ShoppingCart size={20} className="icon-vibrant-green" />
            <span className="card-tag">Spesa</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
              {pendingShopping} totali
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff4ec', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Store size={15} color="#7c4630" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c4630' }}>Supermercato</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#7c4630' }}>{pendingFood}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <HomeIcon size={15} color="#2d5a87" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2d5a87' }}>Casa</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2d5a87' }}>{pendingHome}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f5f3ff', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pill size={15} color="#5b21b6" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5b21b6' }}>Farmaci</span>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#5b21b6' }}>{pendingMed}</span>
            </div>
          </div>
          <ChevronRight className="card-arrow" />
        </div>

        {/* Recipe Suggestion */}
        <div className="home-card card-medium glass home-recipe-card" onClick={() => onNavigate('recipes')}>
          <div className="card-content">
            <div className="card-header">
              <BookOpen className="icon-vibrant-purple" size={20} />
              <span className="card-title">Ispirazione del giorno</span>
            </div>
            {recipes.length > 0 ? (
              <div className="recipe-suggestion">
                <div className="recipe-img-mini" style={{ backgroundImage: `url(${recipes[0].image})` }}></div>
                <div className="recipe-info">
                  <span className="recipe-name">{recipes[0].title}</span>
                  <span className="recipe-meta">Scopri la ricetta</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Plus size={32} className="icon-muted" />
                <span>Aggiungi una ricetta</span>
              </div>
            )}
          </div>
        </div>

        <div className="home-card card-small glass shortcut-card" onClick={() => onQuickAction('add-task')}>
          <div className="card-content centered">
            <ClipboardList className="icon-vibrant-teal" size={28} />
            <span className="shortcut-label">Gestisci Pulizie</span>
          </div>
        </div>

        {/* Finance Widget */}
        <div className="home-card card-small glass" onClick={() => onNavigate('finance')} style={{ cursor: 'pointer', borderTop: '3px solid #6ee7b7' }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <Wallet size={20} style={{ color: '#059669' }} />
            <span className="card-tag">Finanze</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
              questo mese
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '10px 14px', background: '#ecfdf5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#065f46' }}>Totale spese</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#059669' }}>
                {monthFinanceTotal.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <div style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{expenses.filter(e => { const d = new Date(e.date); const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); }).length} spese registrate</span>
              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            </div>
          </div>
        </div>
      </div>

      {/* NEW EVENT MODAL */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="tag-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={20} />
                <h3>Nuovo Evento Casa</h3>
              </div>
              <button className="modal-close" onClick={() => setShowEventForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form className="add-event-form-full" onSubmit={handleAddEventSubmit}>
              <div className="form-group">
                <label>Descrizione evento</label>
                <input
                  type="text"
                  placeholder="Esempio: Pizza di gruppo, Visita tecnici..."
                  value={newEventText}
                  onChange={e => setNewEventText(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={e => setNewEventDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label className="checkbox-label" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showEndTime}
                      onChange={e => setShowEndTime(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>Specifica ora fine</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Orario inizio</label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="time"
                      style={{ paddingLeft: '38px' }}
                      value={newEventTime}
                      onChange={e => setNewEventTime(e.target.value)}
                    />
                  </div>
                </div>
                {showEndTime && (
                  <div className="form-group">
                    <label>Orario fine</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }} />
                      <input
                        type="time"
                        style={{ paddingLeft: '38px', borderColor: '#ef4444' }}
                        value={newEventEndTime}
                        onChange={e => setNewEventEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-hint">
                Questo evento sarà visibile a tutti i coinquilini nel calendario della home.
              </div>

              <button type="submit" className="add-tag-btn" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
                <Plus size={18} />
                <span>Crea Evento</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

