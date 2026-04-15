import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, Trash2, X, Pencil, ShoppingCart, Check, Settings, MoreVertical, List, Eye } from 'lucide-react';
import type { Recipe, Tag } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { TagManagerModal } from './TagManagerModal';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import { useInViewport } from '../hooks/useInViewport';
import cookbookImg from '../assets/cookbook-3d-cutout.png';
import './RecipesSection.css';

interface RecipesSectionProps {
  isMobile: boolean;
  recipes: Recipe[];
  handleRecipeClick: (r: Recipe) => void;
  handleAddNewRecipe: () => void;
  handleDeleteRecipe: (id: string, e?: React.MouseEvent) => void;
  selectedRecipe: Recipe | null;
  setSelectedRecipe: (r: Recipe | null) => void;
  isEditingRecipe: boolean;
  setIsEditingRecipe: (b: boolean) => void;
  tempRecipe: Recipe | null;
  setTempRecipe: React.Dispatch<React.SetStateAction<Recipe | null>>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveRecipe: () => void;
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onDeleteTag: (tagId: string) => void;
  isActive?: boolean;
}


export function RecipesSection({
  isMobile,
  recipes,
  handleRecipeClick,
  handleAddNewRecipe,
  handleDeleteRecipe,
  selectedRecipe,
  setSelectedRecipe,
  isEditingRecipe,
  setIsEditingRecipe,
  tempRecipe,
  setTempRecipe,
  handleImageUpload,
  handleSaveRecipe,
  tags,
  onAddTag,
  onDeleteTag,
  isActive
}: RecipesSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showModalDeleteConfirm, setShowModalDeleteConfirm] = useState(false);
  const [showTagSettings, setShowTagSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRecipesSheet, setShowRecipesSheet] = useState(false);
  const { ref: heroGraphicRef, isInView: isHeroGraphicInView } = useInViewport<HTMLDivElement>();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const { transform: recipesSheetTransform, handlers: recipesSheetHandlers } = useSwipeToDismiss(() => {
    setShowRecipesSheet(false);
    setShowMoreMenu(false);
  }, 100, showRecipesSheet);
  // Swipe logic
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipingId(id);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || swipingId === null) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    // Only allow swiping to the right (deltaX > 0)
    if (deltaX > 0) {
      setSwipeOffsets(prev => ({ ...prev, [swipingId]: Math.min(deltaX, 120) }));
    }
  };

  const handleTouchEnd = (id: string) => {
    const offset = swipeOffsets[id] || 0;
    if (offset > 80) {
      setShowDeleteConfirm(id);
    }
    setSwipeOffsets(prev => ({ ...prev, [id]: 0 }));
    setTouchStartX(null);
    setSwipingId(null);
  };

  const getTagByLabel = (label?: string) => {
    if (!label) return null;
    return tags.find(t => t.label === label);
  };

  const getTagBadgeStyle = (label?: string) => {
    const tag = getTagByLabel(label);
    const color = tag?.color || '#cbd5e1';
    return {
      backgroundColor: `${color}b3`,
      borderColor: `${color}66`,
      color: 'var(--text-main)'
    } as React.CSSProperties;
  };

  return (
    <>
      <main className="main-content recipes-only">
        <section className="recipes-section">
          <header className="recipes-hero">
            <div className="recipes-hero-text">
              <span className="recipes-welcome-label">Creatività in Cucina</span>
              <div className="recipes-hero-header-content">
                <h1 className="recipes-hero-page-title">Ricettario</h1>
                <InfoTooltip text="Il tuo ricettario personale. Crea nuove ricette cliccando il tasto '+' in fondo alla lista. Puoi aggiungere ingredienti, passaggi e una foto per ogni piatto." position="right" />
              </div>
              <p className="recipes-hero-page-subtitle">Le tue ricette preferite, tutte in un unico posto</p>
              
              {!isMobile && (
                <div className="recipes-hero-actions">
                  <div className="recipes-hero-tag-trigger" onClick={() => setShowTagSettings(true)}>
                    <Settings size={20} />
                    <span>Personalizza Targhette</span>
                  </div>
                </div>
              )}
            </div>

            <div ref={heroGraphicRef} className={`recipes-hero-graphic motion-target ${isHeroGraphicInView ? '' : 'is-idle'}`}>
              <div className="floating-book-wrapper">
                <img
                  src={cookbookImg}
                  alt="Cookbook"
                  className="floating-book"
                  width={1024}
                  height={1024}
                  decoding="async"
                />
                <div className="book-shadow"></div>
              </div>
            </div>
          </header>

          <div className={`recipes-grid ${isMobile ? 'is-mobile' : ''}`}>
            {recipes.map(recipe => (
              <div key={recipe.id} className="recipe-card" onClick={() => handleRecipeClick(recipe)}>
                <div className="recipe-image-wrapper">
                  <img src={recipe.image} alt={recipe.title} className="recipe-image" loading="lazy" decoding="async" />
                  {!isMobile && (
                    <div className="recipe-overlay">
                      <Plus size={24} color="white" />
                    </div>
                  )}
                  {recipe.authorId && (
                    <div 
                      className="recipe-author-badge" 
                      style={getTagBadgeStyle(recipe.authorId)}
                    >
                      {recipe.authorId}
                    </div>
                  )}
                </div>
                <div className="recipe-info">
                  <div className="recipe-info-header">
                    <h3 className="recipe-title">{recipe.title}</h3>
                    {showDeleteConfirm === recipe.id ? (
                      <div className="delete-confirm-inline" onClick={e => e.stopPropagation()}>
                        <button
                          className="confirm-btn-mini"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecipe(recipe.id);
                            setShowDeleteConfirm(null);
                          }}
                        >
                          <Check size={isMobile ? 18 : 14} strokeWidth={3} />
                        </button>
                        <button
                          className="cancel-btn-mini"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(null);
                          }}
                        >
                          <X size={isMobile ? 18 : 14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="recipe-card-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(recipe.id);
                        }}
                      >
                        <Trash2 size={isMobile ? 20 : 16} />
                      </button>
                    )}
                  </div>
                  <p className="recipe-description">{recipe.description}</p>
                </div>
              </div>
            ))}

            {!isMobile && (
              <div className="recipe-card add-new-recipe" onClick={handleAddNewRecipe}>
                <div className="add-recipe-content">
                  <div className="add-icon-circle">
                    <Plus size={32} strokeWidth={2.5} />
                  </div>
                  <span className="add-recipe-text">Aggiungi nuova ricetta</span>
                </div>
              </div>
            )}
          </div>
          
          {createPortal(
            <div className={`mobile-tab-panel-portal ${isActive ? 'is-active' : ''}`}>
              {isMobile && (
                <>
                  {/* FAB Left: More options */}
                  <div className="mobile-fab-container-left">
                    {showMoreMenu && (
                      <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
                        <button className="mobile-menu-item" onClick={() => { setShowTagSettings(true); setShowMoreMenu(false); }}>
                          <Settings size={20} />
                          <span>Personalizzazione targhette</span>
                        </button>
                        <button className="mobile-menu-item" onClick={() => { setShowRecipesSheet(true); setShowMoreMenu(false); }}>
                          <List size={20} />
                          <span>Gestione delle ricette</span>
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

                  {/* FAB Right: Add recipe */}
                  <button className="mobile-fab-add" onClick={handleAddNewRecipe}>
                    <Plus size={28} />
                  </button>

                  {/* Recipes Management Sheet */}
                  {showRecipesSheet && (
                    <div className="management-sheet-overlay">
                      <div
                        className="management-sheet-content"
                        onClick={e => e.stopPropagation()}
                        style={{ transform: recipesSheetTransform }}
                        {...recipesSheetHandlers}
                      >
                        <div className="bottom-sheet-drag-handle" />
                        <div className="management-sheet-header">
                          <h3><BookOpen size={24} /> Elenco Ricette</h3>
                        </div>
                        <div className="management-sheet-body">
                          {recipes.map(recipe => (
                            <div key={recipe.id} className="swipe-item-wrapper">
                              <div className="swipe-action-reveal">
                                <Trash2 size={24} />
                              </div>
                              <div 
                                className={`management-list-item swipeable-content ${swipeOffsets[recipe.id] > 0 ? 'is-swiping' : ''}`}
                                style={{ transform: `translateX(${swipeOffsets[recipe.id] || 0}px)` }}
                                onTouchStart={(e) => handleTouchStart(e, recipe.id)}
                                onTouchMove={(e) => handleTouchMove(e)}
                                onTouchEnd={() => handleTouchEnd(recipe.id)}
                                onClick={() => { handleRecipeClick(recipe); setShowRecipesSheet(false); }}
                              >
                                <div className="management-item-details">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="management-item-title">{recipe.title}</span>
                                    {showDeleteConfirm === recipe.id && (
                                      <span className="confirm-badge" style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800 }}>ELIMINA?</span>
                                    )}
                                  </div>
                                  <span className="management-item-subtitle">{recipe.ingredients?.length || 0} ingredienti • {recipe.steps?.length || 0} passaggi</span>
                                </div>
                                <div className="management-item-actions">
                                   <button className="management-action-btn"><Eye size={18} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedRecipe && (
                <div className={`recipe-modal-overlay ${isMobile ? 'is-mobile' : ''}`} onClick={() => setSelectedRecipe(null)}>
                  <div className="recipe-modal-content" onClick={e => e.stopPropagation()}>
                    <button className="modal-close-btn" onClick={() => setSelectedRecipe(null)}>
                      <X size={isMobile ? 32 : 24} />
                    </button>

                    <div className="modal-body">
                      <div className={`modal-image-section ${isEditingRecipe ? 'editing-image' : ''}`}
                        onClick={() => isEditingRecipe && document.getElementById('recipe-image-input')?.click()}
                      >
                        <img src={isEditingRecipe ? tempRecipe?.image : selectedRecipe.image} alt={selectedRecipe.title} decoding="async" />
                        <div className="modal-image-overlay">
                          {isEditingRecipe ? (
                            <div className="edit-image-prompt">
                              <Plus size={32} />
                              <span>Cambia Foto</span>
                              <input
                                type="file"
                                id="recipe-image-input"
                                hidden
                                accept="image/*"
                                onChange={handleImageUpload}
                              />
                            </div>
                          ) : (
                            <button className="edit-trigger-btn" onClick={() => setIsEditingRecipe(true)}>
                              <Pencil size={18} />
                              <span>Modifica Ricetta</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="modal-info-section">
                        {isEditingRecipe ? (
                          <div className="edit-form-container">
                            <input
                              className="edit-title-input"
                              value={tempRecipe?.title || ''}
                              onChange={e => setTempRecipe(prev => prev ? { ...prev, title: e.target.value } : null)}
                              placeholder="Titolo della ricetta"
                            />
                            <textarea
                              className="edit-desc-textarea"
                              value={tempRecipe?.description || ''}
                              onChange={e => setTempRecipe(prev => prev ? { ...prev, description: e.target.value } : null)}
                              placeholder="Breve descrizione"
                            />

                            <div className="edit-author-section" style={{ marginBottom: '16px' }}>
                              <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: '#64748b' }}>Chi ha creato questa ricetta?</h4>
                              <div className="author-picker" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {tags.map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    className={`author-pick-btn ${tempRecipe?.authorId === tag.label ? 'active' : ''}`}
                                    style={{
                                      backgroundColor: `${tag.color}b3`,
                                      borderColor: `${tag.color}66`,
                                      color: 'var(--text-main)',
                                      opacity: tempRecipe?.authorId === tag.label ? 1 : 0.6
                                    }}
                                    onClick={() => setTempRecipe(prev => prev ? { ...prev, authorId: tag.label } : null)}
                                  >
                                    {tag.label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className={`author-pick-btn ${!tempRecipe?.authorId ? 'active' : ''}`}
                                  style={{
                                    backgroundColor: 'white',
                                    opacity: !tempRecipe?.authorId ? 1 : 0.6,
                                    border: '1px solid #e2e8f0'
                                  }}
                                  onClick={() => setTempRecipe(prev => prev ? { ...prev, authorId: undefined } : null)}
                                >
                                  Nessuno
                                </button>
                              </div>
                            </div>

                            <div className="edit-details-grid">
                              <div className="edit-column">
                                <h4>Ingredienti (uno per riga)</h4>
                                <textarea
                                  value={tempRecipe?.ingredients?.join('\n') || ''}
                                  onChange={e => setTempRecipe(prev => prev ? { ...prev, ingredients: e.target.value.split('\n') } : null)}
                                />
                              </div>
                              <div className="edit-column">
                                <h4>Passaggi (uno per riga)</h4>
                                <textarea
                                  value={tempRecipe?.steps?.join('\n') || ''}
                                  onChange={e => setTempRecipe(prev => prev ? { ...prev, steps: e.target.value.split('\n') } : null)}
                                />
                              </div>
                            </div>

                            <div className="edit-actions">
                              <button className="cancel-btn" onClick={() => setIsEditingRecipe(false)}>Annulla</button>
                              <button className="save-btn" onClick={handleSaveRecipe}>Salva Modifiche</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="modal-title-row">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h2 className="modal-title">{selectedRecipe.title}</h2>
                                {selectedRecipe.authorId && (
                                  <span 
                                    className="recipe-author-badge-modal"
                                    style={getTagBadgeStyle(selectedRecipe.authorId)}
                                  >
                                    Creatore: {selectedRecipe.authorId}
                                  </span>
                                )}
                              </div>
                              {showModalDeleteConfirm ? (
                                <div className="delete-confirm-inline modal-delete-confirm">
                                  <span className="confirm-text">Sicuro?</span>
                                  <button 
                                    className="confirm-btn-mini" 
                                    onClick={() => {
                                      handleDeleteRecipe(selectedRecipe.id);
                                      setSelectedRecipe(null);
                                      setShowModalDeleteConfirm(false);
                                    }}
                                  >
                                    <Check size={18} strokeWidth={2.5} />
                                  </button>
                                  <button 
                                    className="cancel-btn-mini" 
                                    onClick={() => setShowModalDeleteConfirm(false)}
                                  >
                                    <X size={18} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="modal-delete-btn"
                                  onClick={() => setShowModalDeleteConfirm(true)}
                                  title="Elimina ricetta"
                                >
                                  <Trash2 size={20} />
                                  <span>Elimina</span>
                                </button>
                              )}
                            </div>
                            <p className="modal-description">{selectedRecipe.description}</p>

                            <div className="recipe-details-content">
                              <div className="ingredients-section">
                                <h3><ShoppingCart size={18} /> Ingredienti</h3>
                                <ul>
                                  {selectedRecipe.ingredients?.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="steps-section">
                                <h3><BookOpen size={18} /> Preparazione</h3>
                                <ol>
                                  {selectedRecipe.steps?.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>,
            document.body
          )}
        </section>
      </main>

      {showTagSettings && (
        <TagManagerModal 
          tags={tags}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
          onClose={() => setShowTagSettings(false)}
          hideCloseButton={isMobile}
          closeOnOverlay={!isMobile}
          title="Firme Ricette"
          hint="Le targhette permettono di firmare le ricette per indicare chi le ha create."
        />
      )}
    </>
  );
}
