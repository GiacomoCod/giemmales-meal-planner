import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Check, Users } from 'lucide-react';
import type { Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import './TagManagerModal.css';

interface TagManagerModalProps {
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  hideCloseButton?: boolean;
  closeOnOverlay?: boolean;
}

const PRESET_COLORS = [
  '#ffecf1', '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', 
  '#f1f8e9', '#e0f2f1', '#fce4ec', '#fed7aa', '#fde68a', 
  '#d9f99d', '#a7f3d0', '#bae6fd', '#e9d5ff', '#fbcfe8'
];

export function TagManagerModal({ 
  tags, 
  onAddTag, 
  onDeleteTag, 
  onClose,
  title = "Gestione Targhette",
  hint = "Le targhette permettono di assegnare i pasti a persone diverse.",
  hideCloseButton = false,
  closeOnOverlay = true
}: TagManagerModalProps) {
  const [newTagLabel, setNewTagLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [showTagDeleteConfirm, setShowTagDeleteConfirm] = useState<string | null>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagLabel.trim()) {
      const id = newTagLabel.trim().toLowerCase().replace(/\s+/g, '-');
      onAddTag({ id, label: newTagLabel.trim(), color: selectedColor });
      setNewTagLabel('');
      setShowColorPalette(false);
      setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    }
  };

  const { transform, handlers } = useSwipeToDismiss(() => {
    onClose();
    setShowTagDeleteConfirm(null);
  }, 100);

  return createPortal(
    <div className="bottom-sheet-overlay tm-global-portal" onClick={() => {
      if (!closeOnOverlay) return;
      onClose();
      setShowTagDeleteConfirm(null);
    }}>
      <div 
        className="bottom-sheet-content" 
        style={{ transform }}
        {...handlers}
        onClick={e => e.stopPropagation()}
      >
        <div className="bottom-sheet-drag-handle" />
        <div className="tm-modal-header">
          <div className="tm-modal-title">
            <h3><Users size={20} /> {title}</h3>
            <InfoTooltip text={hint} />
          </div>
          {!hideCloseButton && (
            <button className="tm-modal-close" onClick={() => {
              onClose();
              setShowTagDeleteConfirm(null);
            }}>
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="tm-tags-list">
          {tags.map(tag => (
            <div key={tag.id} className="tm-tag-item">
              <div className="tm-tag-badge" style={{ backgroundColor: tag.color }}>
                {tag.label}
              </div>
              
              {showTagDeleteConfirm === tag.id ? (
                <div className="tm-delete-confirm">
                  <button 
                    className="tm-confirm-btn" 
                    onClick={() => {
                      onDeleteTag(tag.id);
                      setShowTagDeleteConfirm(null);
                    }}
                    title="Conferma eliminazione"
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button 
                    className="tm-cancel-btn" 
                    onClick={() => setShowTagDeleteConfirm(null)}
                    title="Annulla"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button 
                  className="tm-tag-delete" 
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

        <form className="tm-add-form" onSubmit={handleCreateTag}>
          <div className="tm-add-inputs">
            <input 
              type="text" 
              placeholder="Nome persona/targhetta..." 
              value={newTagLabel}
              onChange={e => setNewTagLabel(e.target.value)}
              onFocus={() => setShowColorPalette(true)}
              required
            />
            <div 
              className="tm-color-preview-btn" 
              style={{ backgroundColor: selectedColor }}
              onClick={() => setShowColorPalette(!showColorPalette)}
              title="Cambia colore"
            ></div>
          </div>
          
          {showColorPalette && (
            <div className="tm-color-palette">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`tm-color-dot ${selectedColor === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setSelectedColor(c);
                  }}
                  title="Scegli colore"
                >
                  {selectedColor === c && <Check size={14} />}
                </button>
              ))}
            </div>
          )}

          <button type="submit" className="tm-add-btn">
            <Plus size={18} />
            <span>Aggiungi</span>
          </button>
        </form>
        
        <p className="tm-modal-hint">{hint}</p>
      </div>
    </div>,
    document.body
  );
}
