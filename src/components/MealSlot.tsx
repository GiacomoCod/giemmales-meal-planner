import React, { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import type { MealEntry, Tag } from '../types';
import './MealSlot.css';

export function MealSlot({
  meal, entries, onAdd, onRemove, onUpdateAssignee, onUpdateText, tags, hideHeader = false
}: {
  meal: { id: string; label: string; Icon: any };
  entries: MealEntry[];
  onAdd: (text: string, assignees: string[]) => void;
  onRemove: (id: string) => void;
  onUpdateAssignee: (id: string, newAssignees: string[]) => void;
  onUpdateText: (id: string, newText: string) => void;
  tags: Tag[];
  hideHeader?: boolean;
}) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Picker state
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // null = adding new entry. string = editing existing entry's assignees
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null); 

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const Icon = meal.Icon;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      setPendingText(text.trim());
      setText('');
      setSelectedTags([]); // default to none
      setPickerTargetId(null); // adding mode
      setShowAssigneePicker(true);
    }
  };

  const openEditTags = (entry: MealEntry) => {
    setPickerTargetId(entry.id);
    setSelectedTags(entry.assignees && entry.assignees.length > 0 ? entry.assignees : (entry.assignee ? [entry.assignee] : []));
    setShowAssigneePicker(true);
  };

  const confirmTags = () => {
    if (pickerTargetId) {
      // mode: editing assignees of an existing entry
      onUpdateAssignee(pickerTargetId, selectedTags);
    } else {
      // mode: adding new entry
      onAdd(pendingText, selectedTags);
      setPendingText('');
    }
    setShowAssigneePicker(false);
  };

  const cancelTags = () => {
    setShowAssigneePicker(false);
    if (!pickerTargetId) {
      setText(pendingText); // Restore input text
    }
  };

  const toggleTag = (tagLabel: string) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter(t => t !== tagLabel));
    } else {
      setSelectedTags([...selectedTags, tagLabel]);
    }
  };

  const startEditing = (entry: MealEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim() && editText.trim() !== entries.find(e => e.id === id)?.text) {
      onUpdateText(id, editText.trim());
    }
    setEditingId(null);
  };

  const getTagColor = (label: string) => {
    const tag = tags.find(t => t.label === label);
    return tag ? tag.color : '#e2e8f0';
  };

  return (
    <div className="meal-slot">
      {!hideHeader && (
        <div className="meal-header">
          <Icon className="meal-icon" size={20} strokeWidth={2.5} />
          <h3 className="meal-title">{meal.label}</h3>
        </div>
      )}

      <ul className="meal-entries">
        {entries.map(entry => {
          const entryTags = entry.assignees && entry.assignees.length > 0 ? entry.assignees : (entry.assignee ? [entry.assignee] : []);
          
          return (
            <li key={entry.id} className="meal-entry">
              <div 
                className="entry-tags-container" 
                onClick={() => openEditTags(entry)}
                title="Cambia chi mangia questo pasto"
              >
                {entryTags.length === 0 ? (
                  <button type="button" className="assignee-badge-empty">?</button>
                ) : (
                  <>
                    {entryTags.slice(0, 2).map((tagLabel, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="assignee-badge"
                        style={{ backgroundColor: getTagColor(tagLabel) }}
                      >
                        {tagLabel}
                      </button>
                    ))}
                    {entryTags.length > 2 && (
                      <button type="button" className="assignee-badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                        +{entryTags.length - 2}
                      </button>
                    )}
                  </>
                )}
              </div>

              {editingId === entry.id ? (
                <input
                  className="meal-edit-input"
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => saveEdit(entry.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(entry.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
              ) : (
                <span
                  className="meal-entry-text"
                  onClick={() => startEditing(entry)}
                  title="Clicca per modificare"
                >
                  {entry.text}
                </span>
              )}

              {showDeleteConfirm === entry.id ? (
                <div className="delete-confirm-inline">
                  <button 
                    className="confirm-btn-mini" 
                    onClick={() => {
                      onRemove(entry.id);
                      setShowDeleteConfirm(null);
                    }}
                    title="Conferma eliminazione"
                  >
                    <Check size={14} strokeWidth={3} />
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
                <button 
                  className="del-entry-btn" 
                  type="button" 
                  onClick={() => setShowDeleteConfirm(entry.id)}
                  title="Elimina pasto"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          );
        })}
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

      {/* Global Assignee Picker Modal */}
      {showAssigneePicker && (
        <div className="assignee-modal-overlay" onClick={cancelTags}>
          <div className="assignee-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="assignee-modal-header">
              <h4>Chi mangia?</h4>
              <button onClick={cancelTags} className="assignee-modal-close"><X size={20} /></button>
            </div>
            
            <div className="assignee-modal-body">
              {tags.length === 0 ? (
                <p className="no-tags-msg">Nessuna targhetta configurata.</p>
              ) : (
                <div className="multi-tag-grid">
                  {tags.map(tag => {
                    const isSelected = selectedTags.includes(tag.label);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`multi-tag-btn ${isSelected ? 'selected' : ''}`}
                        style={{ 
                          backgroundColor: isSelected ? tag.color : 'transparent',
                          borderColor: tag.color 
                        }}
                        onClick={() => toggleTag(tag.label)}
                      >
                        {isSelected && <Check size={16} />}
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="assignee-modal-footer">
              <button className="assignee-modal-confirm" onClick={confirmTags}>
                <Check size={18} /> Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

