import React, { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles, ChevronRight as ChevronRightIcon, Plus, Check, X, Calendar as CalendarIcon, RefreshCw, Trash2, Minus, MoreVertical, List, Settings, Users, Pencil, History } from 'lucide-react';
import { startOfWeek, startOfMonth, format, isSameMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ROOMS } from '../constants';
import type { RoomTask, CleaningLog, TaskSettings, TaskUnit, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { TagManagerModal } from './TagManagerModal';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import { useInViewport } from '../hooks/useInViewport';
import cleaningImg from '../assets/cleaning-3d-cutout.png';
import './CleaningSection.css';

type BubbleStyle = CSSProperties & {
  '--size': string;
  '--left': string;
  '--delay': string;
  '--duration': string;
  '--drift': string;
};

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
  handleCompleteTask: (roomId: string, taskName: string, dateStr?: string, performedByTagId?: string) => void;
  handleUpdateCleaningLog: (logId: string, dateStr: string, performedByTagId?: string) => Promise<void> | void;
  handleDeleteCleaningLog: (logId: string) => Promise<void> | void;
  taskSettings: TaskSettings;
  showTaskSettings: string | null;
  setShowTaskSettings: (taskName: string | null) => void;
  editingFrequency: { value: number, unit: TaskUnit };
  setEditingFrequency: React.Dispatch<React.SetStateAction<{ value: number, unit: TaskUnit }>>;
  handleUpdateTaskFrequency: (taskType: string, value: number, unit: TaskUnit) => void;
  isMobile: boolean;
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
  isActive?: boolean;
}

export function CleaningSection({
  currentMonth, prevMonth, nextMonth, calendarDays, selectedWeekStart, selectedWeekEnd, monthStart,
  setSelectedWeekStart, setCurrentMonth, cleaningNotes, isSavingCleaningNotes, handleUpdateCleaningNotes,
  selectedRoom, setSelectedRoom, showAddTask, setShowAddTask, newTaskName, setNewTaskName, handleAddTask,
  roomTasks, cleaningLogs, handleDeleteRoomTask, handleCompleteTask, handleUpdateCleaningLog, handleDeleteCleaningLog,
  taskSettings, showTaskSettings, setShowTaskSettings, editingFrequency, setEditingFrequency,
  handleUpdateTaskFrequency, isMobile, tags, onAddTag, onDeleteTag, isActive
}: CleaningSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTasksSheet, setShowTasksSheet] = useState(false);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [taskManager, setTaskManager] = useState<{ taskId: string; roomId: string; taskName: string } | null>(null);
  const [managerDate, setManagerDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [managerPerformerId, setManagerPerformerId] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logToDeleteId, setLogToDeleteId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const { ref: heroGraphicRef, isInView: isHeroGraphicInView } = useInViewport<HTMLDivElement>();
  const { transform: tasksSheetTransform, handlers: tasksSheetHandlers } = useSwipeToDismiss(() => {
    setShowTasksSheet(false);
    setShowMoreMenu(false);
  }, 100, showTasksSheet);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNowTs(Date.now()), 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedRoom, roomTasks, cleaningLogs, taskSettings]);

  // Memoizza calcoli di urgenza per evitare ricalcoli ad ogni render
  const taskUrgencies = useMemo(() => {
    const map = new Map<string, { progress: number; color: string; daysRemaining: number | null }>();
    
    roomTasks.forEach(task => {
      const logs = cleaningLogs.filter(l => 
        l.roomId === task.roomId && l.taskType === task.taskName
      );
      const latestLog = logs[0];
      const logDate = latestLog?.date || '';
      
      // Calcolo urgenza inline per memoizzazione
      if (!logDate) {
        map.set(task.id, { progress: 0, color: '#48bb78', daysRemaining: null });
        return;
      }
      
      const dateObj = parseISO(logDate);
      if (isNaN(dateObj.getTime())) {
        map.set(task.id, { progress: 0, color: '#48bb78', daysRemaining: null });
        return;
      }
      
      const setting = taskSettings[task.taskName] || { value: 1, unit: 'settimane' };
      let totalDays = setting.value;
      if (setting.unit === 'settimane') totalDays = setting.value * 7;
      else if (setting.unit === 'mesi') totalDays = setting.value * 30;
      else if (setting.unit === 'anni') totalDays = setting.value * 365;
      
      const daysPassed = Math.max(0, Math.floor((nowTs - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
      const progress = Math.min(100, (daysPassed / totalDays) * 100);
      const daysRemaining = Math.max(0, totalDays - daysPassed);
      const hue = Math.round(120 - (progress / 100) * 120);
      const color = `hsl(${hue}, 80%, 48%)`;
      
      map.set(task.id, { progress, color, daysRemaining });
    });
    
    return map;
  }, [roomTasks, cleaningLogs, taskSettings, nowTs]);

  // Memoizza funzione di sort per evitare ricreazioni
  const sortLogs = useMemo(() => 
    (logs: CleaningLog[]) => logs.sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      if (dateOrder !== 0) return dateOrder;
      return b.timestamp - a.timestamp;
    }),
  []);

  const getLogPerformer = (log: CleaningLog) => {
    const tagById = log.performedByTagId ? tags.find(t => t.id === log.performedByTagId) : null;
    if (tagById) return tagById;
    if (log.performedByLabel) {
      return {
        id: `legacy-${log.id}`,
        label: log.performedByLabel,
        color: 'color-mix(in srgb, var(--surface-subtle) 88%, var(--surface-elevated))'
      } as Tag;
    }
    return null;
  };

  const openTaskManager = (task: RoomTask, latestLog: CleaningLog | null) => {
    setTaskManager({ taskId: task.id, roomId: task.roomId, taskName: task.taskName });
    setEditingLogId(null);
    setLogToDeleteId(null);
    setManagerDate(format(new Date(), 'yyyy-MM-dd'));
    const defaultPerformer = latestLog?.performedByTagId && tags.some(t => t.id === latestLog.performedByTagId)
      ? latestLog.performedByTagId
      : tags[0]?.id || '';
    setManagerPerformerId(defaultPerformer);
  };

  const closeTaskManager = () => {
    setTaskManager(null);
    setEditingLogId(null);
    setLogToDeleteId(null);
  };

  return (
    <>
      {(!isMobile || showMobileSidebar) && (
        <aside className={`sidebar ${isMobile ? 'is-mobile-overlay' : ''}`}>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setShowMobileSidebar(false)}>
              <X size={24} />
            </button>
          )}
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
                        if (isMobile) setShowMobileSidebar(false);
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
      )}

      <main className="main-content">
        {!selectedRoom ? (
          <section className="cleaning-section">
            <header className="cleaning-hero">
              <div className="cleaning-hero-text">
                <span className="cleaning-welcome-label">Igiene & Pulizie</span>
                <div className="cleaning-hero-header-content">
                  <h1 className="cleaning-hero-page-title">Pulizie Casa</h1>
                  <InfoTooltip text="Tieni traccia della pulizia della casa. Le barre colorate indicano l'urgenza: dal verde (pulito) al rosso (necessario). Clicca su una stanza per gestire i compiti specifici." position="right" />
                </div>
                <p className="cleaning-hero-page-subtitle">Organizzazione e compiti per una casa splendente</p>
                {!isMobile && (
                  <div className="cleaning-hero-actions">
                    <button className="tag-settings-trigger" onClick={() => setShowTagSettings(true)}>
                      <span className="trigger-text">Coinquilini</span>
                      <div className="trigger-icon-wrapper">
                        <Settings size={20} />
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div ref={heroGraphicRef} className={`cleaning-hero-graphic motion-target ${isHeroGraphicInView ? '' : 'is-idle'}`}>
                <div className="cleaning-bubbles-container">
                  <div className="cleaning-bubble" style={{ '--size': '20px', '--left': '10%', '--delay': '0s', '--duration': '4s', '--drift': '20px' } as BubbleStyle}></div>
                  <div className="cleaning-bubble" style={{ '--size': '15px', '--left': '30%', '--delay': '1s', '--duration': '5s', '--drift': '-15px' } as BubbleStyle}></div>
                  <div className="cleaning-bubble" style={{ '--size': '25px', '--left': '70%', '--delay': '0.5s', '--duration': '4.5s', '--drift': '10px' } as BubbleStyle}></div>
                  <div className="cleaning-bubble" style={{ '--size': '10px', '--left': '85%', '--delay': '2s', '--duration': '6s', '--drift': '-10px' } as BubbleStyle}></div>
                  <div className="cleaning-bubble" style={{ '--size': '18px', '--left': '50%', '--delay': '1.5s', '--duration': '3.5s', '--drift': '15px' } as BubbleStyle}></div>
                </div>
                <div className="floating-kit-wrapper">
                  <img
                    src={cleaningImg}
                    alt="Cleaning Kit"
                    className="floating-kit"
                    width={1024}
                    height={1024}
                    decoding="async"
                    loading="lazy"
                  />
                  <div className="kit-shadow"></div>
                </div>
              </div>
            </header>

            <div className={`rooms-grid ${isMobile ? 'is-mobile' : ''}`}>
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
          </section>
        ) : (
          <div className="room-detail-container" style={{ backgroundColor: ROOMS.find(r => r.id === selectedRoom)?.color || '#fff' }}>
            <header className="room-detail-header">
              <button className="back-btn-cleaning" onClick={() => { setSelectedRoom(null); setShowAddTask(false); setNewTaskName(''); }}>
                <ChevronLeft size={isMobile ? 24 : 20} /> {isMobile ? '' : 'Torna alle stanze'}
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
              {!isMobile && (
                <button className="tag-settings-trigger cleaning-tag-settings-inline" onClick={() => setShowTagSettings(true)}>
                  <span className="trigger-text">Personalizza targhette</span>
                  <div className="trigger-icon-wrapper">
                    <Users size={18} />
                  </div>
                </button>
              )}
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
                {(() => {
                  return roomTasks
                    .filter(t => t.roomId === selectedRoom)
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .map(task => {
                      const taskLogs = sortLogs(
                        cleaningLogs.filter(l => l.roomId === task.roomId && l.taskType === task.taskName)
                      );
                      const latestLog = taskLogs[0] || null;
                      const latestPerformer = latestLog ? getLogPerformer(latestLog) : null;
                      const urgency = taskUrgencies.get(task.id) || { progress: 0, color: '#48bb78', daysRemaining: null };
                      const { progress, color, daysRemaining } = urgency;
                      const isOverdue = progress >= 100;

                      return (
                        <div key={task.id} className={`task-card ${isOverdue ? 'task-card-overdue' : ''}`}>
                          <div className="task-card-header">
                            <div className="task-card-name-group">
                              <span className="task-card-name">{task.taskName}</span>
                              {latestLog && (
                                <div className="task-card-last-meta">
                                  <span className="task-card-last-done">
                                    eseguito il {format(parseISO(latestLog.date), 'dd/MM/yyyy')}
                                  </span>
                                  {latestPerformer && (
                                    <span className="task-last-performer-badge" style={{ backgroundColor: latestPerformer.color }}>
                                      {latestPerformer.label}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="task-card-actions">
                              <button
                                className="task-action-btn"
                                title="Gestisci completamenti"
                                onClick={() => openTaskManager(task, latestLog)}
                              >
                                <History size={14} />
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
                                <RefreshCw size={isMobile ? 18 : 14} />
                              </button>
                              {showDeleteConfirm === task.id ? (
                                <div className="delete-confirm-inline">
                                  <button
                                    className="confirm-btn-mini"
                                    onClick={() => {
                                      handleDeleteRoomTask(task.id);
                                      setShowDeleteConfirm(null);
                                    }}
                                    title="Conferma eliminazione"
                                  >
                                    <Check size={isMobile ? 18 : 14} strokeWidth={3} />
                                  </button>
                                  <button
                                    className="cancel-btn-mini"
                                    onClick={() => setShowDeleteConfirm(null)}
                                    title="Annulla"
                                  >
                                    <X size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              ) : (
                                <button className="task-action-btn task-action-delete" title="Elimina mansione" onClick={() => setShowDeleteConfirm(task.id)}>
                                  <Trash2 size={isMobile ? 18 : 14} />
                                </button>
                              )}
                            </div>
                          </div>

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

                          <div className="task-card-meta-row">
                            {latestLog ? (
                              <span className="task-card-last-summary">
                                Ultimo: {latestPerformer?.label || 'N/D'} • {format(parseISO(latestLog.date), 'dd/MM/yyyy')}
                              </span>
                            ) : (
                              <span className="task-card-last-summary">Nessun completamento registrato</span>
                            )}
                            {taskLogs.length > 0 && (
                              <span className="task-card-log-count">{taskLogs.length} registrazioni</span>
                            )}
                          </div>

                          <button
                            className={`complete-task-btn ${isOverdue ? 'complete-task-btn-urgent' : ''}`}
                            onClick={() => openTaskManager(task, latestLog)}
                          >
                            <CalendarIcon size={14} /> {isOverdue ? 'Registra completamento' : 'Gestisci mansione'}
                          </button>
                        </div>
                      );
                    });
                })()}
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

      {showTagSettings && (
        <TagManagerModal
          tags={tags}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
          onClose={() => setShowTagSettings(false)}
          hideCloseButton={isMobile}
          closeOnOverlay={!isMobile}
          title="Personalizzazione Targhette"
          hint="Usa le targhette per segnare chi ha svolto ogni mansione e tenere uno storico ordinato."
        />
      )}

      {taskManager && (
        <div className="recipe-modal-overlay task-manager-overlay" onClick={closeTaskManager}>
          <div className="recipe-modal-content task-manager-modal" onClick={e => e.stopPropagation()}>
            <div className="task-manager-header">
              <div className="task-manager-title-wrap">
                <h3><History size={18} /> Gestisci mansione</h3>
                <p>{taskManager.taskName}</p>
              </div>
              <button className="task-manager-close" onClick={closeTaskManager}>
                <X size={18} />
              </button>
            </div>

            <div className="task-manager-form">
              <label>
                Data completamento
                <input
                  type="date"
                  value={managerDate}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setManagerDate(e.target.value)}
                />
              </label>

              <div className="task-manager-performer">
                <span>Chi l'ha svolta</span>
                <div className="task-manager-tags">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      className={`task-manager-tag ${managerPerformerId === tag.id ? 'active' : ''}`}
                      style={{ '--tag-bg': tag.color } as React.CSSProperties}
                      onClick={() => setManagerPerformerId(tag.id)}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="task-manager-actions">
                {editingLogId ? (
                  <button
                    className="add-task-confirm-btn task-manager-primary"
                    onClick={async () => {
                      await handleUpdateCleaningLog(editingLogId, managerDate, managerPerformerId || undefined);
                      setEditingLogId(null);
                    }}
                  >
                    <Check size={14} /> Salva modifica
                  </button>
                ) : (
                  <button
                    className="add-task-confirm-btn task-manager-primary"
                    onClick={async () => {
                      await handleCompleteTask(taskManager.roomId, taskManager.taskName, managerDate, managerPerformerId || undefined);
                    }}
                  >
                    <Plus size={14} /> Registra completamento
                  </button>
                )}
                {editingLogId && (
                  <button className="add-task-cancel-btn task-manager-secondary" onClick={() => setEditingLogId(null)}>
                    <X size={14} /> Annulla modifica
                  </button>
                )}
              </div>
            </div>

            <div className="task-manager-history">
              <h4>Storico mansione</h4>
              <div className="task-manager-history-list">
                {sortLogs(
                  cleaningLogs.filter(
                    log => log.roomId === taskManager.roomId && log.taskType === taskManager.taskName
                  )
                )
                  .slice(0, 12)
                  .map(log => {
                    const performer = getLogPerformer(log);
                    return (
                      <div key={log.id} className="task-manager-history-item">
                        <div className="task-manager-history-main">
                          <span className="task-manager-history-date">{format(parseISO(log.date), 'dd/MM/yyyy')}</span>
                          <span className="task-manager-history-dot">•</span>
                          <span
                            className="task-manager-history-person"
                            style={performer ? { backgroundColor: performer.color } : undefined}
                          >
                            {performer?.label || 'N/D'}
                          </span>
                        </div>
                        <div className="task-manager-history-actions">
                          <button
                            className="task-action-btn"
                            title="Modifica"
                            onClick={() => {
                              setEditingLogId(log.id);
                              setManagerDate(log.date);
                              setManagerPerformerId(log.performedByTagId || tags[0]?.id || '');
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          {logToDeleteId === log.id ? (
                            <div className="delete-confirm-inline">
                              <button
                                className="confirm-btn-mini"
                                onClick={async () => {
                                  await handleDeleteCleaningLog(log.id);
                                  setLogToDeleteId(null);
                                  if (editingLogId === log.id) setEditingLogId(null);
                                }}
                              >
                                <Check size={14} strokeWidth={3} />
                              </button>
                              <button className="cancel-btn-mini" onClick={() => setLogToDeleteId(null)}>
                                <X size={14} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <button className="task-action-btn task-action-delete" title="Elimina" onClick={() => setLogToDeleteId(log.id)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobile && !selectedRoom && createPortal(
        <div className={`mobile-tab-panel-portal ${isActive ? 'is-active' : ''}`}>
          <div className="mobile-fab-container-left">
            {showMoreMenu && (
              <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
                <button className="mobile-menu-item" onClick={() => { setShowMobileSidebar(true); setShowMoreMenu(false); }}>
                  <CalendarIcon size={20} />
                  <span>Note Pulizie</span>
                </button>
                <button className="mobile-menu-item" onClick={() => { setShowTagSettings(true); setShowMoreMenu(false); }}>
                  <Users size={20} />
                  <span>Coinquilini</span>
                </button>
                <button className="mobile-menu-item" onClick={() => { setShowTasksSheet(true); setShowMoreMenu(false); }}>
                  <List size={20} />
                  <span>Gestione delle pulizie</span>
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

          <button className="mobile-fab-add" onClick={() => {
            const firstRoom = ROOMS[0]?.id;
            if (firstRoom) setSelectedRoom(firstRoom);
          }}>
            <Plus size={28} />
          </button>

          {showTasksSheet && (
            <div className="management-sheet-overlay">
              <div
                className="management-sheet-content"
                onClick={e => e.stopPropagation()}
                style={{ transform: tasksSheetTransform }}
                {...tasksSheetHandlers}
              >
                <div className="bottom-sheet-drag-handle" />
                <div className="management-sheet-header">
                  <h3><Sparkles size={24} /> Elenco Mansioni</h3>
                </div>
                <div className="management-sheet-body">
                  {(() => {
                    const activeTasks = roomTasks.filter(task => {
                      const latestLog = sortLogs(
                        cleaningLogs.filter(l => l.roomId === task.roomId && l.taskType === task.taskName)
                      )[0];
                      if (!latestLog) return false;
                      const urgency = taskUrgencies.get(task.id) || { progress: 0, color: '#48bb78', daysRemaining: null };
                      const { progress } = urgency;
                      return progress > 0;
                    });

                    if (activeTasks.length === 0) {
                      return (
                        <div className="empty-tasks-notice" style={{ textAlign: 'center', padding: '40px 20px' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
                          <h4 style={{ fontWeight: 850, color: '#1e293b', marginBottom: '8px' }}>Tutto pulito!</h4>
                          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Non ci sono mansioni urgenti da svolgere in questo momento.</p>
                        </div>
                      );
                    }

                    return activeTasks.map(task => {
                      const room = ROOMS.find(r => r.id === task.roomId);
                      const urgency = taskUrgencies.get(task.id) || { progress: 0, color: '#48bb78', daysRemaining: null };
                      const { color, progress } = urgency;

                      return (
                        <div key={task.id} className="management-list-item" onClick={() => { setSelectedRoom(task.roomId); setShowTasksSheet(false); }}>
                          <div className="room-mini-icon" style={{ backgroundColor: room?.color, marginRight: '12px', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {room && <room.Icon size={18} />}
                          </div>
                          <div className="management-item-details">
                            <span className="management-item-title">{task.taskName}</span>
                            <span className="management-item-subtitle">{room?.label} • Urgenza: {Math.round(progress)}%</span>
                          </div>
                          <div className="urgency-dot" style={{ backgroundColor: color, width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0 }} />
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
