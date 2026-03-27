import React, { useState } from 'react';
import { ShoppingCart, Plus, Check, Trash2, X } from 'lucide-react';
import type { ShoppingItem } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface ShoppingListSectionProps {
  shoppingList: ShoppingItem[];
  newItemText: string;
  setNewItemText: (text: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  filteredSuggestions: { text: string; icon: string }[];
  handleAddItem: (e: React.FormEvent) => void;
  handleAddSuggestion: (text: string, icon: string) => void;
  toggleItem: (id: string) => void;
  deleteItem: (id: string, e: React.MouseEvent) => void;
}

export function ShoppingListSection({
  shoppingList,
  newItemText,
  setNewItemText,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  handleAddItem,
  handleAddSuggestion,
  toggleItem,
  deleteItem
}: ShoppingListSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  return (
    <main className="main-content shopping-only">
      <section className="shopping-section">
        <div className="shopping-card">
          <div className="shopping-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShoppingCart className="shopping-icon" size={26} strokeWidth={2.5} />
              <h2>Lista della Spesa</h2>
              <InfoTooltip text="La tua lista della spesa intelligente. Clicca sui suggerimenti rapidi per aggiungere elementi comuni o scrivi nel campo in basso." position="right" />
            </div>
          </div>

          <form className="shopping-form" onSubmit={handleAddItem}>
            <div className="shopping-input-wrapper">
              <input
                type="text"
                className="shopping-input"
                placeholder="Cerca o aggiungi..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="suggestions-dropdown">
                  {filteredSuggestions.map(suggestion => (
                    <li
                      key={suggestion.text}
                      className="suggestion-item"
                      onClick={() => handleAddSuggestion(suggestion.text, suggestion.icon)}
                    >
                      <div className="suggestion-info">
                        <span className="suggestion-icon">{suggestion.icon}</span>
                        <span className="suggestion-name">{suggestion.text}</span>
                      </div>
                      <button className="suggestion-add-btn" type="button">
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="shopping-btn">
              Aggiungi
            </button>
          </form>

          <ul className="shopping-list">
            {shoppingList.map((item: ShoppingItem) => (
              <li key={item.id} className={`shopping-item ${item.checked ? 'checked' : ''}`} onClick={() => toggleItem(item.id)}>
                <div className="checkbox">
                  {item.checked && <Check size={14} strokeWidth={3.5} />}
                </div>
                <span className="item-text">{item.text}</span>
                {showDeleteConfirm === item.id ? (
                  <div className="delete-confirm-inline" onClick={e => e.stopPropagation()}>
                    <button 
                      className="confirm-btn-mini" 
                      onClick={(e) => {
                        deleteItem(item.id, e);
                        setShowDeleteConfirm(null);
                      }}
                      title="Conferma eliminazione"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <button 
                      className="cancel-btn-mini" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(null);
                      }}
                      title="Annulla"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(item.id);
                    }}
                    title="Rimuovi"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
