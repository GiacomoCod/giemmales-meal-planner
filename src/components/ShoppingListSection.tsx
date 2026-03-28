import React, { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Check, Trash2, X, Store, Home, Search, Sparkles, ShoppingBag, Pill } from 'lucide-react';
import type { ShoppingItem } from '../types';
import './ShoppingListSection.css';

interface ShoppingListSectionProps {
  shoppingList: ShoppingItem[];
  newItemText: string;
  setNewItemText: (text: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  filteredSuggestions: { text: string; icon: string; category?: 'supermarket' | 'home' | 'medicine' }[];
  handleAddItem: (e: React.FormEvent, category: 'supermarket' | 'home' | 'medicine') => void;
  handleAddSuggestion: (text: string, icon: string, category: 'supermarket' | 'home' | 'medicine') => void;
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
  const [formCategory, setFormCategory] = useState<'supermarket' | 'home' | 'medicine'>('supermarket');

  const supermarketItems = useMemo(() =>
    shoppingList.filter(item => item.category === 'supermarket' || !item.category),
    [shoppingList]
  );

  const homeItems = useMemo(() =>
    shoppingList.filter(item => item.category === 'home'),
    [shoppingList]
  );

  const medicineItems = useMemo(() =>
    shoppingList.filter(item => item.category === 'medicine'),
    [shoppingList]
  );

  const onSubmit = (e: React.FormEvent) => {
    handleAddItem(e, formCategory);
  };

  const renderItem = (item: ShoppingItem) => (
    <li
      key={item.id}
      className={`s-item ${item.checked ? 'done' : ''}`}
      onClick={() => toggleItem(item.id)}
    >
      <div className="s-checkbox">
        {item.checked && <Check size={14} strokeWidth={3} />}
      </div>
      <span className="s-item-text">{item.text}</span>

      <div onClick={e => e.stopPropagation()}>
        {showDeleteConfirm === item.id ? (
          <div className="s-confirm-btns">
            <button
              className="s-confirm-btn yes"
              onClick={(e) => { deleteItem(item.id, e); setShowDeleteConfirm(null); }}
            >
              <Check size={13} strokeWidth={3} />
            </button>
            <button
              className="s-confirm-btn no"
              onClick={() => setShowDeleteConfirm(null)}
            >
              <X size={13} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            className="s-item-del"
            onClick={() => setShowDeleteConfirm(item.id)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <main className="main-content shopping-only">
      <div className="shopping-container">

        {/* ─── Page Header ─── */}
        <header className="shopping-header-row">
          <ShoppingCart size={32} strokeWidth={2.5} style={{ color: '#6366f1' }} />
          <div>
            <h1 className="shopping-page-title">Lista della Spesa</h1>
            <p className="shopping-page-subtitle">Gestisci i prodotti per la spesa, casa e farmaci</p>
          </div>
        </header>

        {/* ─── Widget Grid ─── */}
        <div className="shopping-widget-grid">

          {/* ── ADD WIDGET (full width top row) ── */}
          <div className="s-widget s-widget-add">

            {/* Category toggle */}
            <div className="s-category-tabs">
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'supermarket' ? 'active-food' : ''}`}
                onClick={() => setFormCategory('supermarket')}
              >
                <div className="s-add-icon-ring ring-food" style={{ width: 32, height: 32, borderRadius: 10, boxShadow: 'none' }}>
                  <Store size={16} />
                </div>
                Supermercato
              </button>
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'home' ? 'active-home' : ''}`}
                onClick={() => setFormCategory('home')}
              >
                <div className="s-add-icon-ring ring-home" style={{ width: 32, height: 32, borderRadius: 10, boxShadow: 'none' }}>
                  <Home size={16} />
                </div>
                Casa & Detersivi
              </button>
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'medicine' ? 'active-med' : ''}`}
                onClick={() => setFormCategory('medicine')}
              >
                <div className="s-add-icon-ring ring-med" style={{ width: 32, height: 32, borderRadius: 10, boxShadow: 'none' }}>
                  <Pill size={16} />
                </div>
                Farmaci
              </button>
            </div>

            <div className="s-add-divider" />

            {/* Input form */}
            <div className="s-add-form-area">
              <span className="s-form-label">
                {formCategory === 'supermarket'
                  ? '🛒 Aggiungi alla lista alimentari'
                  : formCategory === 'home'
                    ? '🧴 Aggiungi alla lista casa'
                    : '💊 Aggiungi alla lista farmaci'}
              </span>
              <form onSubmit={onSubmit}>
                <div className="s-input-row">
                  <div className="s-input-wrapper">
                    <Search className="s-input-icon" size={17} />
                    <input
                      type="text"
                      className="s-input"
                      placeholder={formCategory === 'supermarket'
                        ? 'Es. Pasta, Latte, Uova...'
                        : formCategory === 'home'
                          ? 'Es. Detersivo, Carta igienica...'
                          : 'Es. Tachipirina, Cerotti...'}
                      value={newItemText}
                      onChange={e => setNewItemText(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`s-submit-btn ${formCategory === 'supermarket' ? 'food' : formCategory === 'home' ? 'home-btn' : 'med-btn'}`}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    Aggiungi
                  </button>
                </div>
              </form>

              {/* Suggestions: absolute, anchored to s-add-form-area */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="s-suggestions-panel">
                  {filteredSuggestions.map(s => (
                    <div
                      key={s.text}
                      className="s-suggestion-row"
                      onClick={() => handleAddSuggestion(s.text, s.icon, s.category || 'supermarket')}
                    >
                      <span className="s-sug-emoji">{s.icon}</span>
                      <span className="s-sug-name">{s.text}</span>
                      <span className={`s-sug-badge ${s.category === 'home' ? 'home-badge' : s.category === 'medicine' ? 'med-badge' : 'food'}`}>
                        {s.category === 'home' ? 'Casa' : s.category === 'medicine' ? 'Farmaco' : 'Cibo'}
                      </span>
                      <Plus size={14} strokeWidth={3} color="#cbd5e0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── LIST WIDGETS in their own 2-col grid ── */}
          <div className="shopping-lists-grid">

            {/* ── SUPERMARKET LIST WIDGET ── */}
            <div className="s-widget s-widget-list s-list-food">
              <div className="s-list-header">
                <div className="s-list-title">
                  <div className="s-list-icon food">
                    <Store size={22} />
                  </div>
                  <div>
                    <h2 className="s-list-name">Supermercato</h2>
                    <p className="s-list-subtitle">Prodotti alimentari</p>
                  </div>
                </div>
                <span className={`s-count-badge food`}>
                  {supermarketItems.filter(i => !i.checked).length} da comprare
                </span>
              </div>

              <ul className="s-items-list">
                {supermarketItems.length === 0 ? (
                  <div className="s-empty">
                    <ShoppingBag size={36} />
                    <p>La lista è vuota</p>
                  </div>
                ) : (
                  supermarketItems.map(renderItem)
                )}
              </ul>
            </div>

            {/* ── HOME/CLEANING LIST WIDGET ── */}
            <div className="s-widget s-widget-list s-list-home">
              <div className="s-list-header">
                <div className="s-list-title">
                  <div className="s-list-icon home-i">
                    <Home size={22} />
                  </div>
                  <div>
                    <h2 className="s-list-name">Casa &amp; Detersivi</h2>
                    <p className="s-list-subtitle">Prodotti per la casa</p>
                  </div>
                </div>
                <span className={`s-count-badge home-i`}>
                  {homeItems.filter(i => !i.checked).length} da comprare
                </span>
              </div>

              <ul className="s-items-list">
                {homeItems.length === 0 ? (
                  <div className="s-empty">
                    <Sparkles size={36} />
                    <p>La lista è vuota</p>
                  </div>
                ) : (
                  homeItems.map(renderItem)
                )}
              </ul>
            </div>

            {/* ── MEDICINE LIST WIDGET ── */}
            <div className="s-widget s-widget-list s-list-med">
              <div className="s-list-header">
                <div className="s-list-title">
                  <div className="s-list-icon med">
                    <Pill size={22} />
                  </div>
                  <div>
                    <h2 className="s-list-name">Farmaci</h2>
                    <p className="s-list-subtitle">Medicine e cura</p>
                  </div>
                </div>
                <span className={`s-count-badge med`}>
                  {medicineItems.filter(i => !i.checked).length} da comprare
                </span>
              </div>

              <ul className="s-items-list">
                {medicineItems.length === 0 ? (
                  <div className="s-empty">
                    <Pill size={36} />
                    <p>La lista è vuota</p>
                  </div>
                ) : (
                  medicineItems.map(renderItem)
                )}
              </ul>
            </div>

          </div>{/* end shopping-lists-grid */}

        </div>{/* end shopping-widget-grid */}
      </div>
    </main>
  );
}
