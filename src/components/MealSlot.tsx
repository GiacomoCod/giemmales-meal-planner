import React, { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import type { MealEntry, Tag } from '../types';

export function MealSlot({
  meal, entries, onAdd, onRemove, onUpdateAssignee, onUpdateText, tags, hideHeader = false
}: {
  meal: { id: string; label: string; Icon: any };
  entries: MealEntry[];
  onAdd: (text: string, assignee: string) => void;
  onRemove: (id: string) => void;
  onUpdateAssignee: (id: string, newAssignee: string) => void;
  onUpdateText: (id: string, newText: string) => void;
  tags: Tag[];
  hideHeader?: boolean;
}) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const Icon = meal.Icon;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      setPendingText(text.trim());
      setText('');
      setShowAssigneePicker(true);
    }
  };

  const confirmAdd = (assignee: string) => {
    onAdd(pendingText, assignee);
    setPendingText('');
    setShowAssigneePicker(false);
  };

  const cycleAssignee = (current: string) => {
    if (tags.length === 0) return current;
    const currentIndex = tags.findIndex(t => t.label === current);
    const nextIndex = (currentIndex + 1) % tags.length;
    return tags[nextIndex].label;
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
        {entries.map(entry => (
          <li key={entry.id} className="meal-entry">
            <button
              type="button"
              className="assignee-badge"
              style={{ backgroundColor: getTagColor(entry.assignee) }}
              onClick={() => onUpdateAssignee(entry.id, cycleAssignee(entry.assignee))}
              title="Cambia chi mangia questo pasto"
            >
              {entry.assignee}
            </button>

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
        ))}
      </ul>

      {!showAssigneePicker ? (
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
      ) : (
        <div className="assignee-picker-overlay">
          <p className="picker-label">Chi mangia?</p>
          <div className="picker-buttons">
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className="picker-btn"
                style={{ backgroundColor: tag.color }}
                onClick={() => confirmAdd(tag.label)}
              >
                {tag.label}
              </button>
            ))}
            <button
              className="picker-cancel"
              type="button"
              onClick={() => {
                setShowAssigneePicker(false);
                setText(pendingText); // Restore text in case they changed their mind
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

