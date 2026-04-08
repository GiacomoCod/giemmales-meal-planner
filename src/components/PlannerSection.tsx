import { useState } from 'react';
import { ChevronLeft, ChevronRight, Settings, Trash2, MoreVertical, Users, Calendar as CalendarIcon } from 'lucide-react';
import { startOfWeek, startOfMonth, format, isSameMonth, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { MealSlot } from './MealSlot';
import { MEALS, PASTEL_VARS } from '../constants';
import type { MealPlan, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { TagManagerModal } from './TagManagerModal';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import spaghettiImg from '../assets/spaghetti-3d-cutout.png';
import './PlannerSection.css';

interface PlannerSectionProps {
  isMobile: boolean;
  currentMonth: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  calendarDays: Date[];
  selectedWeekStart: Date;
  selectedWeekEnd: Date;
  monthStart: Date;
  setSelectedWeekStart: (d: Date) => void;
  setCurrentMonth: (d: Date) => void;
  weekNotes: string;
  isSavingNotes: boolean;
  handleUpdateNotes: (notes: string) => void;
  activeWeekDays: Date[];
  mealPlan: MealPlan;
  handleAddMealEntry: (dateKey: string, mealId: string, text: string, assignees: string[]) => void;
  handleRemoveMealEntry: (dateKey: string, mealId: string, entryId: string) => void;
  handleUpdateAssignee: (dateKey: string, mealId: string, entryId: string, assignees: string[]) => void;
  handleUpdateMealEntryText: (dateKey: string, mealId: string, entryId: string, newText: string) => void;
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
}

export function PlannerSection({
  isMobile, currentMonth, prevMonth, nextMonth, calendarDays, selectedWeekStart, selectedWeekEnd, monthStart,
  setSelectedWeekStart, setCurrentMonth, weekNotes, isSavingNotes, handleUpdateNotes, activeWeekDays,
  mealPlan, handleAddMealEntry, handleRemoveMealEntry, handleUpdateAssignee, handleUpdateMealEntryText,
  tags, onAddTag, onDeleteTag
}: PlannerSectionProps) {
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [showPlannerSheet, setShowPlannerSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { transform: plannerSheetTransform, handlers: plannerSheetHandlers } = useSwipeToDismiss(() => {
    setShowPlannerSheet(false);
    setShowMoreMenu(false);
  }, 100, showPlannerSheet);

  const handlePrevWeek = () => {
    const newDate = addDays(selectedWeekStart, -7);
    setSelectedWeekStart(newDate);
    setCurrentMonth(startOfMonth(newDate));
  };

  const handleNextWeek = () => {
    const newDate = addDays(selectedWeekStart, 7);
    setSelectedWeekStart(newDate);
    setCurrentMonth(startOfMonth(newDate));
  };

  if (isMobile) {
    return (
      <div className="planner-mobile">
        {/* Mobile Planner Hero - Standardized structure */}
        <div className="planner-hero mobile-view">
          <div className="planner-hero-text">
            <span className="planner-welcome-label">Pianificazione Pasti</span>
            <div className="planner-hero-header-content">
              <h1 className="planner-page-title">I Tuoi Menù</h1>
              <InfoTooltip text="Pianifica i tuoi pasti settimanali in modo semplice. Aggiungi piatti per colazione, pranzo e cena, e assegna chi deve cucinare." position="right" />
            </div>
            <p className="planner-page-subtitle">Organizza la tua settimana culinaria in modo semplice e veloce</p>
          </div>
          <div className="planner-hero-graphic">
            <div className="floating-burger-wrapper">
              <img src={spaghettiImg} alt="3D Spaghetti Island" className="floating-burger" />
              <div className="burger-shadow"></div>
            </div>
          </div>
        </div>

        <div className="planner-mobile-navigator">
          <div className="week-navigator-pill">
            <button
              className="f-week-btn"
              onClick={handlePrevWeek}
              title="Settimana Precedente"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="week-display" onClick={() => {
              setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
              setCurrentMonth(startOfMonth(new Date()));
            }}>
              <span className="week-month-label">{format(selectedWeekStart, 'MMMM yyyy', { locale: it })}</span>
              <div className="week-range-row">
                <span className="week-range-text">
                  {format(selectedWeekStart, 'd')} - {format(selectedWeekEnd, 'd MMM', { locale: it })}
                </span>
              </div>
            </div>

            <button
              className="f-week-btn"
              onClick={handleNextWeek}
              title="Settimana Successiva"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="planner-mobile-content">
           <div className="mobile-days-list">
              {activeWeekDays.map((dayDate) => {
                const dateKey = format(dayDate, 'yyyy-MM-dd');
                const dayName = format(dayDate, 'EEEE', { locale: it });
                const dayNum = format(dayDate, 'd MMM', { locale: it });
                const jsDay = dayDate.getDay();
                const cssIndex = jsDay === 0 ? 6 : jsDay - 1;

                return (
                  <div key={dateKey} className="mobile-day-card" style={{ '--day-bg': PASTEL_VARS[cssIndex] } as any}>
                    <div className="mobile-day-header">
                       <span className="m-day-name">{dayName}</span>
                       <span className="m-day-num">{dayNum}</span>
                    </div>
                    <div className="mobile-meals-grid">
                       {MEALS.map((meal) => (
                         <div key={meal.id} className="mobile-meal-item">
                            <div className="m-meal-label">
                               <meal.Icon size={16} />
                               <span>{meal.label}</span>
                            </div>
                            <MealSlot
                              meal={meal}
                              entries={mealPlan[dateKey]?.[meal.id] || []}
                              onAdd={(text, assignees) => handleAddMealEntry(dateKey, meal.id, text, assignees)}
                              onRemove={(id) => handleRemoveMealEntry(dateKey, meal.id, id)}
                              onUpdateAssignee={(id, assignees) => handleUpdateAssignee(dateKey, meal.id, id, assignees)}
                              onUpdateText={(id, newText) => handleUpdateMealEntryText(dateKey, meal.id, id, newText)}
                              tags={tags}
                              hideHeader={true}
                            />
                         </div>
                       ))}
                    </div>
                  </div>
                );
              })}
           </div>

           <div className="mobile-notes-section">
              <h3><InfoTooltip text="Appunti veloci per la settimana." /> Note Settimanali</h3>
              <textarea
                placeholder="Aggiungi note..."
                value={weekNotes}
                onChange={(e) => handleUpdateNotes(e.target.value)}
              />
              {isSavingNotes && <div className="m-saving">Salvataggio...</div>}
           </div>
        </div>

        <div className="mobile-fab-container-left">
          {showMoreMenu && (
            <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
              <button className="mobile-menu-item" onClick={() => { setShowTagSettings(true); setShowMoreMenu(false); }}>
                <Users size={20} />
                <span>Personalizzazione targhette</span>
              </button>
              <button className="mobile-menu-item" onClick={() => { setShowPlannerSheet(true); setShowMoreMenu(false); }}>
                <CalendarIcon size={20} />
                <span>Gestione menù</span>
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

        {showTagSettings && (
          <TagManagerModal 
            tags={tags}
            onAddTag={onAddTag}
            onDeleteTag={onDeleteTag}
            onClose={() => setShowTagSettings(false)}
            hideCloseButton={isMobile}
            closeOnOverlay={!isMobile}
          />
        )}

        {showPlannerSheet && (
          <div className="management-sheet-overlay">
            <div
              className="management-sheet-content"
              onClick={e => e.stopPropagation()}
              style={{ transform: plannerSheetTransform }}
              {...plannerSheetHandlers}
            >
              <div className="bottom-sheet-drag-handle" />
              <div className="management-sheet-header">
                <h3><CalendarIcon size={24} /> Gestione Menù</h3>
              </div>

              <div className="management-sheet-body">
                {activeWeekDays.length === 0 ? (
                  <div className="f-empty-msg planner-management-empty">
                    Nessuna settimana selezionata.
                  </div>
                ) : (
                  <div className="planner-summary-list">
                    {activeWeekDays.map((dayDate) => {
                      const dateKey = format(dayDate, 'yyyy-MM-dd');
                      const dayName = format(dayDate, 'EEEE d MMM', { locale: it });
                      const jsDay = dayDate.getDay();
                      const cssIndex = jsDay === 0 ? 6 : jsDay - 1;
                      
                      const dayMeals = MEALS.map(m => ({ meal: m, items: mealPlan[dateKey]?.[m.id] || [] }))
                                          .filter(m => m.items.length > 0);

                      return (
                        <div key={dateKey} className="planner-sheet-day">
                          <h4 className="planner-sheet-day-title" style={{ background: PASTEL_VARS[cssIndex] }}>
                            {dayName}
                          </h4>
                          <div className="planner-sheet-meals">
                            {dayMeals.length === 0 ? (
                              <p className="m-no-meals">Nessun pasto inserito</p>
                            ) : (
                              dayMeals.map(({ meal, items }) => (
                                <div key={meal.id} className="planner-sheet-meal-group">
                                  <div className="planner-sheet-meal-label">
                                    <meal.Icon size={14} /> {meal.label}
                                  </div>
                                  {items.map(item => {
                                    const entryTags = item.assignees && item.assignees.length > 0 ? item.assignees : (item.assignee ? [item.assignee] : []);
                                    return (
                                      <div key={item.id} className="planner-sheet-item">
                                        <span className="p-item-text">{item.text}</span>
                                        <div className="p-item-tags">
                                          {entryTags.slice(0, 2).map(a => (
                                            <span key={a} className="p-item-tag" style={{ background: tags.find(t => t.label === a)?.color || tags.find(t => t.id === a)?.color }}>
                                              {a}
                                            </span>
                                          ))}
                                          {entryTags.length > 2 && (
                                            <span className="p-item-tag p-item-tag-more">
                                              +{entryTags.length - 2}
                                            </span>
                                          )}
                                        </div>
                                        <button className="p-item-del" onClick={() => handleRemoveMealEntry(dateKey, meal.id, item.id)}>
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
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
              <div className="notes-title-row">
                <h3 className="notes-title">Note della Settimana 📝</h3>
                <InfoTooltip text="Appunti veloci per la settimana: promemoria, eventi o liste rapide che non rientrano nel calendario pasti." position="right" />
              </div>
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
        <header className="planner-hero">
          <div className="planner-hero-text">
            <span className="planner-welcome-label">Pianificazione Pasti</span>
            <div className="planner-hero-header-content">
              <h1 className="planner-page-title">Calendario Menù</h1>
              <InfoTooltip text="Pianifica i tuoi pasti settimanali in modo semplice. Aggiungi piatti per colazione, pranzo e cena, e assegna chi deve cucinare." position="right" />
            </div>
            <p className="planner-page-subtitle">Organizza la tua settimana culinaria in modo semplice e veloce</p>

            {/* Tags action */}
            <div className="planner-hero-actions">
              <div className="tag-settings-trigger" onClick={() => setShowTagSettings(true)}>
                <Settings size={20} />
                <span>Personalizza Targhette</span>
              </div>
            </div>
          </div>
          
          <div className="planner-hero-graphic">
            <div className="floating-burger-wrapper">
              <img src={spaghettiImg} alt="3D Spaghetti Island" className="floating-burger" />
              <div className="burger-shadow"></div>
            </div>
          </div>
        </header>
        <div className="grid-container">
          {activeWeekDays.map((dayDate) => {
            const dateKey = format(dayDate, 'yyyy-MM-dd');
            const dayName = format(dayDate, 'EEEE d', { locale: it });

            const jsDay = dayDate.getDay();
            const cssIndex = jsDay === 0 ? 6 : jsDay - 1;

            return (
              <div key={dateKey} className="day-card" style={{ '--day-bg': PASTEL_VARS[cssIndex] } as any}>
                <h2 className="day-title">{dayName}</h2>
                <div className="meals-container">
                  {MEALS.map((meal) => (
                    <MealSlot
                      key={meal.id}
                      meal={meal}
                      entries={mealPlan[dateKey]?.[meal.id] || []}
                      onAdd={(text, assignees) => handleAddMealEntry(dateKey, meal.id, text, assignees)}
                      onRemove={(id) => handleRemoveMealEntry(dateKey, meal.id, id)}
                      onUpdateAssignee={(id, assignees) => handleUpdateAssignee(dateKey, meal.id, id, assignees)}
                      onUpdateText={(id, newText) => handleUpdateMealEntryText(dateKey, meal.id, id, newText)}
                      tags={tags}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {showTagSettings && (
        <TagManagerModal 
          tags={tags}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
          onClose={() => setShowTagSettings(false)}
        />
      )}
    </>
  );
}
