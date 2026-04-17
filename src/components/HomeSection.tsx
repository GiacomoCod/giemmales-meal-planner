import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ShoppingCart,
  BookOpen,
  Sparkles,
  Plus,
  Utensils,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  Store,
  Home as HomeIcon,
  Pill,
  Wallet
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, differenceInCalendarWeeks, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import './HomeSection.css';
import { MEALS, ROOMS } from '../constants';
import type { MealPlan, ShoppingItem, Recipe, RoomTask, CleaningLog, TaskSettings, CalendarEvent, Tag, Expense } from '../types';
import houseImg from '../assets/house-3d-cutout.png';
import { useInViewport } from '../hooks/useInViewport';
import { getNextCleaningDate } from '../utils/cleaningTasks';

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
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<boolean>;
  onDeleteEvent: (id: string) => void;
  onNavigate: (tab: 'planner' | 'shopping' | 'recipes' | 'cleaning' | 'finance') => void;
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
  expenses
}) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showEndTime, setShowEndTime] = useState(false);
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  const [eventFormAttempted, setEventFormAttempted] = useState(false);
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(() => !isMobile);
  const { ref: heroGraphicRef, isInView: isHeroGraphicInView } = useInViewport<HTMLDivElement>();

  const todayDate = new Date();
  const currentWeekStart = startOfWeek(addWeeks(todayDate, offsetWeeks), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const tasksByDate = useMemo(() => {
    const groupedTasks = new Map<string, RoomTask[]>();

    roomTasks.forEach((task) => {
      const nextDate = getNextCleaningDate(task, cleaningLogs, taskSettings);
      if (!nextDate) return;

      const currentTasks = groupedTasks.get(nextDate) || [];
      currentTasks.push(task);
      groupedTasks.set(nextDate, currentTasks);
    });

    return groupedTasks;
  }, [cleaningLogs, roomTasks, taskSettings]);

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventFormAttempted(true);
    setEventFormError(null);
    if (!newEventText.trim()) {
      setEventFormError('Inserisci una descrizione evento prima di salvare.');
      return;
    }

    if (showEndTime) {
      if (!newEventTime) {
        setEventFormError('Se imposti un orario di fine, inserisci anche l’orario di inizio.');
        return;
      }
      if (!newEventEndTime) {
        setEventFormError('Inserisci l’orario di fine oppure disattiva la relativa opzione.');
        return;
      }
      if (newEventEndTime <= newEventTime) {
        setEventFormError('L’orario di fine deve essere successivo all’orario di inizio.');
        return;
      }
    }

    const ok = await onAddEvent({
      text: newEventText.trim(),
      date: newEventDate,
      startTime: newEventTime || undefined,
      endTime: showEndTime && newEventEndTime ? newEventEndTime : undefined,
      color: '#94a3b8'
    });

    if (!ok) {
      setEventFormError('Non sono riuscito a salvare l’evento. Riprova tra un attimo.');
      return;
    }

    // Ensure the just-created event is visible in the home weekly calendar.
    const targetWeekStart = startOfWeek(new Date(newEventDate), { weekStartsOn: 1 });
    const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    setOffsetWeeks(differenceInCalendarWeeks(targetWeekStart, todayWeekStart, { weekStartsOn: 1 }));

    setNewEventText('');
    setNewEventTime('');
    setNewEventEndTime('');
    setShowEndTime(false);
    setShowEventForm(false);
  };

  const getTagColor = (label: string) => {
    const tag = tags.find(t => t.label === label);
    return tag ? tag.color : '#e2e8f0';
  };

  const pendingShopping = shoppingList.filter(item => !item.checked).length;
  const pendingFood = shoppingList.filter(item => !item.checked && (item.category === 'supermarket' || !item.category)).length;
  const pendingHome = shoppingList.filter(item => !item.checked && item.category === 'home').length;
  const pendingMed = shoppingList.filter(item => !item.checked && item.category === 'medicine').length;
  const isCreateEventDisabled = !newEventText.trim() || (showEndTime && (!newEventTime || !newEventEndTime || newEventEndTime <= newEventTime));
  const todayStart = startOfDay(todayDate);
  const todayKey = format(todayDate, 'yyyy-MM-dd');
  const todayMeals = mealPlan[todayKey] || {};
  const compactWeekDays = useMemo(() => {
    const upcomingDays = weekDays.filter((day) => day >= todayStart);
    const source = upcomingDays.length > 0 ? upcomingDays : weekDays;
    return source.slice(0, 3);
  }, [todayStart, weekDays]);
  const displayedWeekDays = isMobile && !isCalendarExpanded ? compactWeekDays : weekDays;
  const compactAgendaCount = displayedWeekDays.reduce((count, day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return count + events.filter((event) => event.date === dateKey).length + (tasksByDate.get(dateKey) || []).length;
  }, 0);

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
            <div ref={heroGraphicRef} className={`hero-graphic motion-target ${isHeroGraphicInView ? '' : 'is-idle'}`}>
              <div className="floating-house-wrapper">
                <img
                  src={houseImg}
                  alt="3D House"
                  className="floating-house"
                  width={1024}
                  height={1024}
                  decoding="async"
                  loading="lazy"
                />
                <div className="house-shadow"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="home-grid">
        {/* NEW HOUSE CALENDAR WIDGET */}
        <section className={`home-card card-full-width glass house-calendar-card ${isMobile && !isCalendarExpanded ? 'is-mobile-compact' : ''}`}>
          <div className="card-header-with-action">
            <div className="header-left">
              <Calendar className="icon-vibrant-indigo" size={24} />
              <div className="header-title-nav">
                <h3 className="card-title">
                  {isMobile && !isCalendarExpanded ? 'Agenda rapida' : 'Calendario della Casa'}
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
                {isMobile && (
                  <span className="calendar-compact-meta">
                    {isCalendarExpanded ? 'Vista completa settimana' : `${displayedWeekDays.length} giorni • ${compactAgendaCount} elementi`}
                  </span>
                )}
              </div>
            </div>
            <div className="house-calendar-actions">
              {isMobile && (
                <button
                  className="calendar-toggle-btn"
                  onClick={() => setIsCalendarExpanded((expanded) => !expanded)}
                >
                  {isCalendarExpanded ? 'Compatta' : 'Espandi'}
                </button>
              )}
              <button
                className="add-event-btn"
                onClick={() => {
                  setEventFormError(null);
                  setEventFormAttempted(false);
                  setShowEventForm(true);
                }}
              >
                <Plus size={isMobile ? 20 : 18} />
                {!isMobile && <span>Nuovo Evento</span>}
              </button>
            </div>
          </div>

          <div className="calendar-scroll-wrapper">
            <div className={`house-calendar-grid ${isMobile && !isCalendarExpanded ? 'is-compact-mobile' : ''}`}>
              {displayedWeekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = events.filter(e => e.date === dateKey);
                const dayTasks = tasksByDate.get(dateKey) || [];

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
              {MEALS.map(meal => {
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
              })}
            </div>
          </div>
          <div className="card-footer">
            <span>Vai al calendario menù</span>
            <ArrowRight size={18} />
          </div>
        </div>

        {/* Shopping Status */}
        <div className="home-card card-small glass home-summary-card" onClick={() => onNavigate('shopping')}>
          <div className="card-header home-card-header-tight">
            <ShoppingCart size={20} className="icon-vibrant-green" />
            <span className="card-tag">Spesa</span>
            <span className="home-summary-meta shopping">
              {pendingShopping} totali
            </span>
          </div>
          <div className="home-summary-list">
            <div className="home-summary-row supermarket">
              <div className="home-summary-row-label">
                <Store size={15} color="#7c4630" />
                <span>Supermercato</span>
              </div>
              <span className="home-summary-row-value">{pendingFood}</span>
            </div>
            <div className="home-summary-row home">
              <div className="home-summary-row-label">
                <HomeIcon size={15} color="#2d5a87" />
                <span>Casa</span>
              </div>
              <span className="home-summary-row-value">{pendingHome}</span>
            </div>
            <div className="home-summary-row medicine">
              <div className="home-summary-row-label">
                <Pill size={15} color="#5b21b6" />
                <span>Farmaci</span>
              </div>
              <span className="home-summary-row-value">{pendingMed}</span>
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

        {/* Finance Widget */}
        <div className="home-card card-small glass home-summary-card finance-summary-card" onClick={() => onNavigate('finance')}>
          <div className="card-header home-card-header-tight">
            <Wallet size={20} className="icon-vibrant-green" />
            <span className="card-tag">Finanze</span>
            <span className="home-summary-meta finance">
              questo mese
            </span>
          </div>
          <div className="home-summary-list finance">
            <div className="finance-summary-total">
              <span className="finance-summary-label">Totale spese</span>
              <span className="finance-summary-value">
                {monthFinanceTotal.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <div className="finance-summary-footnote">
              <span>{expenses.filter(e => { const d = new Date(e.date); const n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); }).length} spese registrate</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* NEW EVENT MODAL */}
      {showEventForm && (
        <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
          <div className="tag-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="event-modal-title-wrap">
                <div className="event-modal-title-row">
                <Calendar size={20} />
                <h3>Nuovo Evento Casa</h3>
                </div>
                <p className="event-modal-subtitle">Crea un promemoria condiviso visibile nel calendario della home.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setEventFormError(null);
                  setEventFormAttempted(false);
                  setShowEventForm(false);
                }}
              >
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
                  onChange={e => {
                    setNewEventText(e.target.value);
                    if (eventFormAttempted) setEventFormError(null);
                  }}
                  aria-invalid={eventFormAttempted && !newEventText.trim()}
                  autoFocus
                />
                {eventFormAttempted && !newEventText.trim() && (
                  <div className="event-field-error">La descrizione evento è obbligatoria.</div>
                )}
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
                <div className="form-group event-toggle-group">
                  <label className="checkbox-label event-toggle-card">
                    <input
                      type="checkbox"
                      checked={showEndTime}
                      onChange={e => {
                        setShowEndTime(e.target.checked);
                        if (!e.target.checked) {
                          setNewEventEndTime('');
                          setEventFormError(null);
                        }
                      }}
                    />
                    <span>Specifica ora fine</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Orario inizio</label>
                  <div className="time-input-wrap">
                    <Clock size={16} className="time-input-icon start" />
                    <input
                      type="time"
                      className="time-input start"
                      value={newEventTime}
                      onChange={e => {
                        setNewEventTime(e.target.value);
                        if (eventFormAttempted) setEventFormError(null);
                      }}
                      aria-invalid={eventFormAttempted && showEndTime && !newEventTime}
                    />
                  </div>
                  {eventFormAttempted && showEndTime && !newEventTime && (
                    <div className="event-field-error">Inserisci l’orario di inizio.</div>
                  )}
                </div>
                {showEndTime && (
                  <div className="form-group">
                    <label>Orario fine</label>
                    <div className="time-input-wrap">
                      <Clock size={16} className="time-input-icon end" />
                      <input
                        type="time"
                        className="time-input end"
                        value={newEventEndTime}
                        onChange={e => {
                          setNewEventEndTime(e.target.value);
                          if (eventFormAttempted) setEventFormError(null);
                        }}
                        aria-invalid={eventFormAttempted && !newEventEndTime}
                      />
                    </div>
                    {eventFormAttempted && !newEventEndTime && (
                      <div className="event-field-error">Inserisci l’orario di fine.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-hint">
                Questo evento sarà visibile a tutti i coinquilini nel calendario della home.
              </div>
              {eventFormError && (
                <div className="event-form-error">
                  {eventFormError}
                </div>
              )}

              <button type="submit" className="add-tag-btn event-submit-btn" disabled={isCreateEventDisabled}>
                <Plus size={18} />
                <span>Crea Evento</span>
              </button>
              {eventFormAttempted && !newEventText.trim() && (
                <div className="event-submit-hint">Completa i campi obbligatori per continuare.</div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
