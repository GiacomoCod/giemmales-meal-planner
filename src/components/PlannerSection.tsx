import { useState } from 'react';
import { ChevronLeft, ChevronRight, Settings, Plus, X, Trash2, Check } from 'lucide-react';
import { startOfWeek, startOfMonth, format, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { MealSlot } from './MealSlot';
import { MEALS, PASTEL_VARS } from '../constants';
import type { MealPlan, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';

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
  handleAddMealEntry: (dateKey: string, mealId: string, text: string, assignee: string) => void;
  handleRemoveMealEntry: (dateKey: string, mealId: string, entryId: string) => void;
  handleUpdateAssignee: (dateKey: string, mealId: string, entryId: string, assignee: string) => void;
  handleUpdateMealEntryText: (dateKey: string, mealId: string, entryId: string, newText: string) => void;
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
}

const TAG_COLORS = [
  '#ffecf1', '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#f1f8e9', '#e0f2f1', '#fce4ec'
];

export function PlannerSection({
  currentMonth, prevMonth, nextMonth, calendarDays, selectedWeekStart, selectedWeekEnd, monthStart,
  setSelectedWeekStart, setCurrentMonth, weekNotes, isSavingNotes, handleUpdateNotes, activeWeekDays,
  mealPlan, handleAddMealEntry, handleRemoveMealEntry, handleUpdateAssignee, handleUpdateMealEntryText,
  tags, onAddTag, onDeleteTag
}: PlannerSectionProps) {
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [showTagDeleteConfirm, setShowTagDeleteConfirm] = useState<string | null>(null);

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagLabel.trim()) {
      const id = newTagLabel.trim().toLowerCase().replace(/\s+/g, '-');
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      onAddTag({ id, label: newTagLabel.trim(), color });
      setNewTagLabel('');
    }
  };

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div className="main-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Calendario Settimanale</h2>
            <InfoTooltip text="Qui puoi pianificare i tuoi pasti. Clicca sui pasti inseriti per cambiarne l'assegnatario o modificarne il testo. Usa il calendario a sinistra per cambiare settimana!" position="right" />
          </div>
          <div className="tag-settings-trigger" onClick={() => setShowTagSettings(true)}>
            <span className="trigger-text">Personalizza Targhette</span>
            <div className="trigger-icon-wrapper">
              <Settings size={20} />
            </div>
          </div>
        </div>
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
        <div className="modal-overlay" onClick={() => {
          setShowTagSettings(false);
          setShowTagDeleteConfirm(null);
        }}>
          <div className="tag-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-with-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3>Gestione Targhette</h3>
                <InfoTooltip text="Le targhette servono per assegnare i pasti a persone diverse (famiglia, coinquilini). Qui puoi aggiungere nuovi nomi o rimuovere quelli esistenti per personalizzare il tuo calendario!" />
              </div>
              <button className="modal-close" onClick={() => {
                setShowTagSettings(false);
                setShowTagDeleteConfirm(null);
              }}><X size={20} /></button>
            </div>
            
            <div className="tags-list-current">
              {tags.map(tag => (
                <div key={tag.id} className="tag-item-editor">
                  <div className="tag-badge-preview" style={{ backgroundColor: tag.color }}>
                    {tag.label}
                  </div>
                  
                  {showTagDeleteConfirm === tag.id ? (
                    <div className="delete-confirm-inline">
                      <button 
                        className="confirm-btn-mini" 
                        onClick={() => {
                          onDeleteTag(tag.id);
                          setShowTagDeleteConfirm(null);
                        }}
                        title="Conferma eliminazione"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button 
                        className="cancel-btn-mini" 
                        onClick={() => setShowTagDeleteConfirm(null)}
                        title="Annulla"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="tag-delete-btn" 
                      onClick={() => setShowTagDeleteConfirm(tag.id)}
                      disabled={tags.length <= 1}
                      title="Elimina targhetta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form className="add-tag-form" onSubmit={handleCreateTag}>
              <input 
                type="text" 
                placeholder="Nome persona/targhetta..." 
                value={newTagLabel}
                onChange={e => setNewTagLabel(e.target.value)}
              />
              <button type="submit" className="add-tag-btn">
                <Plus size={18} />
                <span>Aggiungi</span>
              </button>
            </form>
            
            <p className="modal-hint">Le targhette permettono di assegnare i pasti a persone diverse.</p>
          </div>
        </div>
      )}
    </>
  );
}

