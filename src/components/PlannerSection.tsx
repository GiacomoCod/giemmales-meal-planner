import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, startOfMonth, format, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { MealSlot } from './MealSlot';
import { MEALS, PASTEL_VARS } from '../constants';
import type { MealPlan } from '../types';

interface PlannerSectionProps {
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
  handleAddMealEntry: (dateKey: string, mealId: string, text: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => void;
  handleRemoveMealEntry: (dateKey: string, mealId: string, entryId: string) => void;
  handleUpdateAssignee: (dateKey: string, mealId: string, entryId: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => void;
  handleUpdateMealEntryText: (dateKey: string, mealId: string, entryId: string, newText: string) => void;
}

export function PlannerSection({
  currentMonth, prevMonth, nextMonth, calendarDays, selectedWeekStart, selectedWeekEnd, monthStart,
  setSelectedWeekStart, setCurrentMonth, weekNotes, isSavingNotes, handleUpdateNotes, activeWeekDays,
  mealPlan, handleAddMealEntry, handleRemoveMealEntry, handleUpdateAssignee, handleUpdateMealEntryText
}: PlannerSectionProps) {
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
                      onUpdateText={(id, newText) => handleUpdateMealEntryText(dateKey, meal.id, id, newText)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
