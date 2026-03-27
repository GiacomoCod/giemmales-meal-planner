import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ChevronRight as ChevronRightIcon, Plus, Check, X, Calendar as CalendarIcon, RefreshCw, Trash2, Minus } from 'lucide-react';
import { startOfWeek, startOfMonth, format, isSameMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ROOMS } from '../constants';
import type { RoomTask, CleaningLog, TaskSettings, TaskUnit } from '../types';

interface CleaningSectionProps {
  currentMonth: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  calendarDays: Date[];
  selectedWeekStart: Date;
  selectedWeekEnd: Date;
  monthStart: Date;
  setSelectedWeekStart: (d: Date) => void;
  setCurrentMonth: (d: Date) => void;
  cleaningNotes: string;
  isSavingCleaningNotes: boolean;
  handleUpdateCleaningNotes: (notes: string) => void;
  selectedRoom: string | null;
  setSelectedRoom: (room: string | null) => void;
  showAddTask: boolean;
  setShowAddTask: (show: boolean) => void;
  newTaskName: string;
  setNewTaskName: (name: string) => void;
  handleAddTask: (roomId: string, taskName: string) => void;
  roomTasks: RoomTask[];
  cleaningLogs: CleaningLog[];
  handleDeleteRoomTask: (taskId: string) => void;
  datePickerTaskId: string | null;
  setDatePickerTaskId: (id: string | null) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  handleCompleteTask: (roomId: string, taskName: string, dateStr?: string) => void;
  taskSettings: TaskSettings;
  showTaskSettings: string | null;
  setShowTaskSettings: (taskName: string | null) => void;
  editingFrequency: {value: number, unit: TaskUnit};
  setEditingFrequency: React.Dispatch<React.SetStateAction<{value: number, unit: TaskUnit}>>;
  handleUpdateTaskFrequency: (taskType: string, value: number, unit: TaskUnit) => void;
}

export function CleaningSection({
  currentMonth, prevMonth, nextMonth, calendarDays, selectedWeekStart, selectedWeekEnd, monthStart,
  setSelectedWeekStart, setCurrentMonth, cleaningNotes, isSavingCleaningNotes, handleUpdateCleaningNotes,
  selectedRoom, setSelectedRoom, showAddTask, setShowAddTask, newTaskName, setNewTaskName, handleAddTask,
  roomTasks, cleaningLogs, handleDeleteRoomTask, datePickerTaskId, setDatePickerTaskId, customDate, setCustomDate,
  handleCompleteTask, taskSettings, showTaskSettings, setShowTaskSettings, editingFrequency, setEditingFrequency,
  handleUpdateTaskFrequency
}: CleaningSectionProps) {

  const getTaskUrgency = (logDate: string, taskType: string) => {
    if (!logDate) return { progress: 0, color: '#48bb78', daysRemaining: null };
    const dateObj = parseISO(logDate);
    if (isNaN(dateObj.getTime())) return { progress: 0, color: '#48bb78', daysRemaining: null };
    
    const setting = taskSettings[taskType] || { value: 1, unit: 'settimane' };
    let totalDays = setting.value;
    if (setting.unit === 'settimane') totalDays = setting.value * 7;
    else if (setting.unit === 'mesi') totalDays = setting.value * 30;
    else if (setting.unit === 'anni') totalDays = setting.value * 365;

    const daysPassed = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
    const progress = Math.min(100, (daysPassed / totalDays) * 100);
    const daysRemaining = Math.max(0, totalDays - daysPassed);
    
    const hue = Math.round(120 - (progress / 100) * 120);
    const color = `hsl(${hue}, 80%, 48%)`;
    
    return { progress, color, daysRemaining };
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
                    <div className="calendar-cell-inner">
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="notes-card">
            <div className="notes-header">
              <h3 className="notes-title">Note delle Pulizie ✨</h3>
              {isSavingCleaningNotes && <span className="notes-saving">Salvataggio...</span>}
            </div>
            <textarea
              className="notes-textarea"
              placeholder="Aggiungi note per le pulizie di questa settimana..."
              value={cleaningNotes}
              onChange={(e) => handleUpdateCleaningNotes(e.target.value)}
            />
          </div>
        </div>
      </aside>

      <main className="main-content">
        {!selectedRoom ? (
          <>
            <div className="cleaning-header-row">
              <Sparkles className="cleaning-icon" size={26} strokeWidth={2.5} />
              <h2 className="cleaning-title-main">Organizzazione Pulizie</h2>
            </div>

            <div className="rooms-grid">
              {ROOMS.map(room => (
                <div key={room.id} className="room-card" 
                  style={{ borderLeft: `6px solid ${room.color}` }}
                  onClick={() => setSelectedRoom(room.id)}
                >
                  <div className="room-icon-wrapper">
                    <room.Icon size={32} />
                  </div>
                  <div className="room-info">
                    <h3 className="room-label">{room.label}</h3>
                    <p className="room-status">Clicca per visualizzare i compiti</p>
                  </div>
                  <div className="room-arrow">
                    <ChevronRightIcon size={20} />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="room-detail-container" style={{ backgroundColor: ROOMS.find(r => r.id === selectedRoom)?.color || '#fff' }}>
            <header className="room-detail-header">
              <button className="back-btn-cleaning" onClick={() => { setSelectedRoom(null); setShowAddTask(false); setNewTaskName(''); }}>
                <ChevronLeft size={20} /> Torna alle stanze
              </button>
              {(() => {
                  const room = ROOMS.find(r => r.id === selectedRoom);
                  if (!room) return null;
                  return (
                    <div className="room-header-title-group">
                      <div className="room-mini-icon" style={{ backgroundColor: room.color }}>
                        <room.Icon size={24} />
                      </div>
                      <h2 className="room-detail-title">{room.label}</h2>
                    </div>
                  );
              })()}
            </header>

            <div className="room-detail-body">
              {/* Add Task Area */}
              <div className="add-task-area">
                {showAddTask ? (
                  <div className="add-task-form">
                    <input
                      className="add-task-input"
                      type="text"
                      placeholder="Nome della mansione..."
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTask(selectedRoom!, newTaskName); if (e.key === 'Escape') { setShowAddTask(false); setNewTaskName(''); } }}
                      autoFocus
                    />
                    <button className="add-task-confirm-btn" onClick={() => handleAddTask(selectedRoom!, newTaskName)}>
                      <Check size={16} /> Aggiungi
                    </button>
                    <button className="add-task-cancel-btn" onClick={() => { setShowAddTask(false); setNewTaskName(''); }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button className="add-task-trigger-btn" onClick={() => setShowAddTask(true)}>
                    <Plus size={18} /> Inserisci mansione
                  </button>
                )}
              </div>

              {/* Task List */}
              <div className="task-cards-list">
                {roomTasks
                  .filter(t => t.roomId === selectedRoom)
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .map(task => {
                    const latestLog = cleaningLogs
                      .filter(l => l.roomId === task.roomId && l.taskType === task.taskName)
                      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
                    const { progress, color, daysRemaining } = getTaskUrgency(latestLog?.date || '', task.taskName);
                    const isOverdue = progress >= 100;

                    return (
                      <div key={task.id} className={`task-card ${isOverdue ? 'task-card-overdue' : ''}`}>
                        <div className="task-card-header">
                          <div className="task-card-name-group">
                            <span className="task-card-name">{task.taskName}</span>
                            {latestLog && (
                              <span className="task-card-last-done">
                                eseguito il {format(parseISO(latestLog.date), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                          <div className="task-card-actions">
                            <button
                              className={`task-action-btn ${datePickerTaskId === task.id ? 'task-action-active' : ''}`}
                              title="Registra in una data diversa"
                              onClick={() => {
                                if (datePickerTaskId === task.id) {
                                  setDatePickerTaskId(null);
                                } else {
                                  setDatePickerTaskId(task.id);
                                  setCustomDate(format(new Date(), 'yyyy-MM-dd'));
                                }
                              }}
                            >
                              <CalendarIcon size={14} />
                            </button>
                            <button 
                              className="task-action-btn" 
                              title="Impostazioni ripetizione" 
                              onClick={() => {
                                const current = taskSettings[task.taskName] || { value: 1, unit: 'settimane' };
                                setEditingFrequency(current);
                                setShowTaskSettings(task.taskName);
                              }}
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button className="task-action-btn task-action-delete" title="Elimina mansione" onClick={() => handleDeleteRoomTask(task.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Inline date picker */}
                        {datePickerTaskId === task.id && (
                          <div className="task-date-picker">
                            <input
                              type="date"
                              className="task-date-input"
                              value={customDate}
                              max={format(new Date(), 'yyyy-MM-dd')}
                              onChange={e => setCustomDate(e.target.value)}
                            />
                            <button
                              className="task-date-confirm-btn"
                              onClick={() => {
                                handleCompleteTask(task.roomId, task.taskName, customDate);
                                setDatePickerTaskId(null);
                              }}
                            >
                              <Check size={14} /> Conferma
                            </button>
                            <button className="task-date-cancel-btn" onClick={() => setDatePickerTaskId(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {latestLog ? (
                          <div className="urgency-container">
                            <div className="urgency-bar-wrapper">
                              <div className="urgency-bar-fill" style={{ width: `${progress}%`, backgroundColor: color }} />
                            </div>
                            <div className="urgency-labels">
                              <span className="urgency-label" style={{ color }}>
                                {isOverdue ? `È ora di "${task.taskName}"!` : `${Math.round(progress)}% decorso`}
                              </span>
                              {!isOverdue && daysRemaining !== null && (
                                <span className="urgency-days-remaining">
                                  Mancano {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="task-never-done">Mai eseguito — clicca per registrarlo oggi</p>
                        )}

                        <button
                          className={`complete-task-btn ${isOverdue ? 'complete-task-btn-urgent' : ''}`}
                          onClick={() => handleCompleteTask(task.roomId, task.taskName)}
                        >
                          <Check size={14} /> {isOverdue ? 'Fatto! Azzera il timer' : 'Segna come fatto oggi'}
                        </button>
                      </div>
                    );
                  })
                }
                {roomTasks.filter(t => t.roomId === selectedRoom).length === 0 && (
                  <p className="no-history">Nessuna mansione configurata. Aggiungine una!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showTaskSettings && (
        <div className="recipe-modal-overlay" onClick={() => setShowTaskSettings(null)}>
          <div className="recipe-modal-content frequency-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-info-section">
              <div className="modal-header-mini">
                <RefreshCw size={20} className="modal-header-icon" />
                <h3 className="modal-title-small">Impostazioni Ripetizione</h3>
              </div>
              <p className="modal-subtitle">Frequenza per: <strong>{showTaskSettings}</strong></p>
              
              <div className="frequency-selector-premium">
                <div className="freq-stepper">
                  <button 
                    className="stepper-btn" 
                    onClick={() => setEditingFrequency(prev => ({ ...prev, value: Math.max(1, prev.value - 1) }))}
                  >
                    <Minus size={18} />
                  </button>
                  <div className="stepper-value">
                    <span className="value-num">{editingFrequency.value}</span>
                    <span className="value-label">
                      {editingFrequency.value === 1 
                        ? { giorni: 'giorno', settimane: 'settimana', mesi: 'mese', anni: 'anno' }[editingFrequency.unit] 
                        : editingFrequency.unit}
                    </span>
                  </div>
                  <button 
                    className="stepper-btn" 
                    onClick={() => setEditingFrequency(prev => ({ ...prev, value: prev.value + 1 }))}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="unit-chips-grid">
                  {(['giorni', 'settimane', 'mesi', 'anni'] as TaskUnit[]).map(u => (
                    <button 
                      key={u}
                      className={`unit-chip ${editingFrequency.unit === u ? 'active' : ''}`}
                      onClick={() => setEditingFrequency(prev => ({ ...prev, unit: u }))}
                    >
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions-simple" style={{ marginTop: '30px', gap: '16px' }}>
                <button className="cancel-simple-btn" onClick={() => setShowTaskSettings(null)}>Annulla</button>
                <button 
                  className="add-task-confirm-btn" 
                  onClick={() => handleUpdateTaskFrequency(showTaskSettings, editingFrequency.value, editingFrequency.unit)}
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
