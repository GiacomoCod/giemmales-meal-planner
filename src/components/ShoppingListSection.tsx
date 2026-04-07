import React, { useState, useMemo } from 'react';
import { Plus, Check, Trash2, X, Store, Home, Search, Sparkles, ShoppingBag, Pill, MoreVertical } from 'lucide-react';
import type { ShoppingItem } from '../types';
import shoppingCartImg from '../assets/shopping-cart-3d.png';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import './ShoppingListSection.css';

interface ShoppingListSectionProps {
  isMobile: boolean;
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
  suggestions: { text: string; icon: string; category?: 'supermarket' | 'home' | 'medicine' }[];
  onAddCustomSuggestion: (text: string, cat: 'supermarket' | 'home' | 'medicine', icon?: string) => void;
  onDeleteCustomSuggestion: (text: string) => void;
}

export function ShoppingListSection({
  isMobile,
  shoppingList,
  newItemText,
  setNewItemText,
  showSuggestions,
  setShowSuggestions,
  filteredSuggestions,
  handleAddItem,
  handleAddSuggestion,
  toggleItem,
  deleteItem,
  suggestions,
  onAddCustomSuggestion,
  onDeleteCustomSuggestion
}: ShoppingListSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSuggestionSettings, setShowSuggestionSettings] = useState(false);
  
  const { transform: sugSheetTransform, handlers: sugSheetHandlers } = useSwipeToDismiss(() => {
    setShowSuggestionSettings(false);
    setShowMoreMenu(false);
  }, 100, showSuggestionSettings);
  
  const [newSugName, setNewSugName] = useState('');
  const [newSugCat, setNewSugCat] = useState<'supermarket' | 'home' | 'medicine'>('supermarket');
  const [newSugEmoji, setNewSugEmoji] = useState('📦');

  const [formCategory, setFormCategory] = useState<'supermarket' | 'home' | 'medicine'>('supermarket');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    supermarket: true,
    home: false,
    medicine: false
  });

  const toggleAccordion = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

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

  const handleAddCustomSug = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSugName.trim()) {
      onAddCustomSuggestion(newSugName.trim(), newSugCat, newSugEmoji);
      setNewSugName('');
    }
  };

  const renderItem = (item: ShoppingItem) => (
    <li
      key={item.id}
      className={`s-item ${item.checked ? 'done' : ''}`}
      onClick={() => toggleItem(item.id)}
    >
      <div className="s-checkbox">
        {item.checked && <Check size={isMobile ? 18 : 14} strokeWidth={3} />}
      </div>
      <span className="s-item-text">{item.text}</span>

      <div onClick={e => e.stopPropagation()} className="s-actions-wrapper">
        {showDeleteConfirm === item.id ? (
          <div className="s-confirm-btns">
            <button
              className="s-confirm-btn yes"
              onClick={(e) => { deleteItem(item.id, e); setShowDeleteConfirm(null); }}
            >
              <Check size={isMobile ? 18 : 13} strokeWidth={3} />
            </button>
            <button
              className="s-confirm-btn no"
              onClick={() => setShowDeleteConfirm(null)}
            >
              <X size={isMobile ? 18 : 13} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            className="s-item-del"
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(item.id); }}
          >
            <Trash2 size={isMobile ? 22 : 15} />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <main className={`main-content shopping-only ${isMobile ? 'is-mobile' : ''}`}>
      <div className="shopping-container">

        {/* ─── Shopping Hero Header ─── */}
        <header className="shopping-hero">
          <div className="shopping-hero-text">
            <span className="shopping-welcome-label">Fai la spesa 🛒</span>
            <h1 className="shopping-hero-page-title">Lista della Spesa</h1>
            <p className="shopping-hero-page-subtitle">Organizza i tuoi acquisti per la casa e la cucina.</p>
          </div>
          
          <div className="shopping-hero-graphic">
            <div className="floating-cart-wrapper">
              <img src={shoppingCartImg} alt="3D Shopping Cart" className="floating-cart" />
              <div className="cart-shadow"></div>
            </div>
          </div>
        </header>

        {/* ─── Widget Grid ─── */}
        <div className="shopping-widget-grid">

          {/* ── ADD WIDGET ── */}
          <div className={`s-widget s-widget-add ${isMobile ? 'mobile-add-widget' : ''}`}>
            {/* Category toggle */}
            <div className="s-category-tabs">
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'supermarket' ? 'active-food' : ''}`}
                onClick={() => setFormCategory('supermarket')}
              >
                <div className="s-add-icon-ring ring-food">
                   <Store size={isMobile ? 22 : 18} />
                </div>
                {isMobile ? 'Super.' : 'Supermercato'}
              </button>
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'home' ? 'active-home' : ''}`}
                onClick={() => setFormCategory('home')}
              >
                <div className="s-add-icon-ring ring-home">
                   <Home size={isMobile ? 22 : 18} />
                </div>
                {isMobile ? 'Casa' : 'Casa & Detersivi'}
              </button>
              <button
                type="button"
                className={`s-cat-btn ${formCategory === 'medicine' ? 'active-med' : ''}`}
                onClick={() => setFormCategory('medicine')}
              >
                <div className="s-add-icon-ring ring-med">
                   <Pill size={isMobile ? 22 : 18} />
                </div>
                {isMobile ? 'Farmaci' : 'Farmaci'}
              </button>
            </div>

            <div className="s-add-divider" />

            {/* Input form */}
            <div className="s-add-form-area">
              {!isMobile && (
                <span className="s-form-label">
                  {formCategory === 'supermarket' ? '🛒 Alimentari' : formCategory === 'home' ? '🧴 Casa' : '💊 Farmaci'}
                </span>
              )}
              <form onSubmit={onSubmit}>
                <div className="s-input-row">
                  <div className="s-input-wrapper">
                    <Search className="s-input-icon" size={isMobile ? 20 : 17} />
                    <input
                      type="text"
                      className="s-input"
                      placeholder={formCategory === 'supermarket' ? 'Es. Pasta...' : formCategory === 'home' ? 'Es. Detersivo...' : 'Es. Tachipirina...'}
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
                    <Plus size={isMobile ? 28 : 20} strokeWidth={2.5} />
                    {!isMobile && 'Aggiungi'}
                  </button>
                </div>
              </form>

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

          {/* ── LISTS ── */}
          {isMobile ? (
            <div className="shopping-mobile-accordions">
              {[
                { id: 'supermarket', label: 'Supermercato', items: supermarketItems, Icon: Store, tint: '#ef4444' },
                { id: 'home', label: 'Casa & Detersivi', items: homeItems, Icon: Home, tint: '#3b82f6' },
                { id: 'medicine', label: 'Farmaci', items: medicineItems, Icon: Pill, tint: '#10b981' }
              ].map(cat => (
                <div key={cat.id} className={`s-accordion-item ${expandedCategories[cat.id] ? 'is-open' : ''}`}>
                  <div className="s-accordion-header" onClick={() => toggleAccordion(cat.id)}>
                    <div className="s-accordion-left">
                       <div className="s-acc-icon" style={{ background: `${cat.tint}10`, color: cat.tint }}>
                          <cat.Icon size={24} />
                       </div>
                       <div className="s-acc-info">
                          <span className="s-acc-label">{cat.label}</span>
                          <span className="s-acc-count">{cat.items.filter(i => !i.checked).length} da prendere</span>
                       </div>
                    </div>
                    <div className="s-acc-chevron">
                       <Plus size={22} className={expandedCategories[cat.id] ? 'rotate-45' : ''} />
                    </div>
                  </div>
                  <div className={`s-accordion-content-wrapper ${expandedCategories[cat.id] ? 'is-open' : ''}`}>
                    <div className="s-accordion-content-inner">
                      <div className="s-accordion-content">
                         <ul className="s-items-list">
                            {cat.items.length === 0 ? (
                              <div className="s-empty-small">La lista è vuota</div>
                            ) : (
                              cat.items.map(renderItem)
                            )}
                         </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="shopping-lists-grid">
              {/* Desktop Lists */}
              <div className="s-widget s-widget-list s-list-food">
                <div className="s-list-header">
                  <div className="s-list-title">
                    <div className="s-list-icon food"><Store size={22} /></div>
                    <div><h2 className="s-list-name">Supermercato</h2><p className="s-list-subtitle">Alimentari</p></div>
                  </div>
                </div>
                <ul className="s-items-list">
                  {supermarketItems.length === 0 ? <div className="s-empty"><ShoppingBag size={36} /><p>Vuota</p></div> : supermarketItems.map(renderItem)}
                </ul>
              </div>

              <div className="s-widget s-widget-list s-list-home">
                <div className="s-list-header">
                  <div className="s-list-title">
                    <div className="s-list-icon home-i"><Home size={22} /></div>
                    <div><h2 className="s-list-name">Casa & Detersivi</h2><p className="s-list-subtitle">Pulizia e cura</p></div>
                  </div>
                </div>
                <ul className="s-items-list">
                  {homeItems.length === 0 ? <div className="s-empty"><Sparkles size={36} /><p>Vuota</p></div> : homeItems.map(renderItem)}
                </ul>
              </div>

              <div className="s-widget s-widget-list s-list-med">
                <div className="s-list-header">
                  <div className="s-list-title">
                    <div className="s-list-icon med"><Pill size={22} /></div>
                    <div><h2 className="s-list-name">Farmaci</h2><p className="s-list-subtitle">Salute</p></div>
                  </div>
                </div>
                <ul className="s-items-list">
                  {medicineItems.length === 0 ? <div className="s-empty"><Pill size={36} /><p>Vuota</p></div> : medicineItems.map(renderItem)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="mobile-fab-container-left">
          {showMoreMenu && (
            <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
              <button className="mobile-menu-item" onClick={() => { setShowSuggestionSettings(true); setShowMoreMenu(false); }}>
                <Sparkles size={20} />
                <span>Personalizza suggerimenti</span>
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
      )}

      {showSuggestionSettings && (
        <div className="bottom-sheet-overlay" onClick={() => setShowSuggestionSettings(false)}>
          <div 
            className="bottom-sheet-content" 
            onClick={e => e.stopPropagation()}
            style={{ transform: sugSheetTransform }}
            {...sugSheetHandlers}
          >
            <div className="bottom-sheet-drag-handle" />
            <div className="management-sheet-header">
              <h3><Sparkles size={24} /> Suggerimenti</h3>
              <button className="management-sheet-close" onClick={() => setShowSuggestionSettings(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="management-sheet-body">
              <div className="tags-list-current">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="tag-item-editor">
                    <div className="tag-badge-preview" style={{ background: '#f1f5f9', color: '#1e293b' }}>
                      <span style={{ marginRight: '8px' }}>{s.icon}</span>
                      {s.text}
                    </div>
                    <button className="tag-delete-btn" onClick={() => onDeleteCustomSuggestion(s.text)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <form className="f-add-tag-form" onSubmit={handleAddCustomSug} style={{ flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input 
                    type="text" 
                    placeholder="Esempio: Avocado..." 
                    value={newSugName}
                    onChange={e => setNewSugName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="text" 
                    placeholder="🍱" 
                    value={newSugEmoji}
                    onChange={e => setNewSugEmoji(e.target.value)}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                </div>
                
                <div className="s-category-tabs" style={{ background: 'transparent', padding: 0, flexDirection: 'row', gap: '8px' }}>
                  <button
                    type="button"
                    className={`s-cat-btn ${newSugCat === 'supermarket' ? 'active-food' : ''}`}
                    style={{ flex: 1, height: 'auto', flexDirection: 'column', padding: '10px 4px' }}
                    onClick={() => setNewSugCat('supermarket')}
                  >
                    <div className="s-add-icon-ring ring-food" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                      <Store size={18} />
                    </div>
                    Super.
                  </button>
                  <button
                    type="button"
                    className={`s-cat-btn ${newSugCat === 'home' ? 'active-home' : ''}`}
                    style={{ flex: 1, height: 'auto', flexDirection: 'column', padding: '10px 4px' }}
                    onClick={() => setNewSugCat('home')}
                  >
                    <div className="s-add-icon-ring ring-home" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                      <Home size={18} />
                    </div>
                    Casa
                  </button>
                  <button
                    type="button"
                    className={`s-cat-btn ${newSugCat === 'medicine' ? 'active-med' : ''}`}
                    style={{ flex: 1, height: 'auto', flexDirection: 'column', padding: '10px 4px' }}
                    onClick={() => setNewSugCat('medicine')}
                  >
                    <div className="s-add-icon-ring ring-med" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                      <Pill size={18} />
                    </div>
                    Farmaci
                  </button>
                </div>

                <button type="submit" className="f-add-tag-submit" style={{ width: '100%', borderRadius: '16px', marginTop: '10px' }}>
                  <Plus size={24} />
                  <span style={{ marginLeft: '8px', fontWeight: 800 }}>Aggiungi Suggerimento</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
