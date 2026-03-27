import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { MealEntry } from '../types';

export function MealSlot({
  meal, entries, onAdd, onRemove, onUpdateAssignee, onUpdateText
}: {
  meal: { id: string; label: string; Icon: any };
  entries: MealEntry[];
  onAdd: (text: string, assignee: 'Ale' | 'Giem' | 'Giemmale') => void;
  onRemove: (id: string) => void;
  onUpdateAssignee: (id: string, newAssignee: 'Ale' | 'Giem' | 'Giemmale') => void;
  onUpdateText: (id: string, newText: string) => void;
}) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const Icon = meal.Icon;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      setPendingText(text.trim());
      setText('');
      setShowAssigneePicker(true);
    }
  };

  const confirmAdd = (assignee: 'Ale' | 'Giem' | 'Giemmale') => {
    onAdd(pendingText, assignee);
    setPendingText('');
    setShowAssigneePicker(false);
  };

  const cycleAssignee = (current: 'Ale' | 'Giem' | 'Giemmale') => {
    if (current === 'Giemmale') return 'Ale';
    if (current === 'Ale') return 'Giem';
    return 'Giemmale';
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

            <button className="del-entry-btn" type="button" onClick={() => onRemove(entry.id)}>
              <Trash2 size={13} />
            </button>
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
            {(['Ale', 'Giem', 'Giemmale'] as const).map(person => (
              <button
                key={person}
                type="button"
                className={`picker-btn assignee-${person.toLowerCase()}`}
                onClick={() => confirmAdd(person)}
              >
                {person}
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
