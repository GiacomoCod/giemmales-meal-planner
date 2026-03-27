import React from 'react';
import { ShoppingCart, Plus, Check, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '../types';

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
  return (
    <main className="main-content shopping-only">
      <section className="shopping-section">
        <div className="shopping-card">
          <div className="shopping-header">
            <ShoppingCart className="shopping-icon" size={26} strokeWidth={2.5} />
            <h2>Lista della Spesa</h2>
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
                <button
                  className="delete-btn"
                  onClick={(e) => deleteItem(item.id, e)}
                  title="Rimuovi"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
