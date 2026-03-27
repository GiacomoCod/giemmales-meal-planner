import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, X, Pencil, ShoppingCart, Check } from 'lucide-react';
import type { Recipe } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface RecipesSectionProps {
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
}

export function RecipesSection({
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
  handleSaveRecipe
}: RecipesSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showModalDeleteConfirm, setShowModalDeleteConfirm] = useState(false);
  return (
    <main className="main-content recipes-only">
      <section className="recipes-section">
        <div className="recipes-header-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen className="recipes-icon" size={26} strokeWidth={2.5} />
          <h2 className="recipes-title-main">Le mie ricette</h2>
          <InfoTooltip text="Il tuo ricettario personale. Crea nuove ricette cliccando il tasto '+' in fondo alla lista. Puoi aggiungere ingredienti, passaggi e una foto per ogni piatto." position="right" />
        </div>

        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div key={recipe.id} className="recipe-card" onClick={() => handleRecipeClick(recipe)}>
              <div className="recipe-image-wrapper">
                <img src={recipe.image} alt={recipe.title} className="recipe-image" />
                <div className="recipe-overlay">
                  <Plus size={24} color="white" />
                </div>
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
                      className="recipe-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(recipe.id);
                      }}
                      title="Elimina ricetta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="recipe-description">{recipe.description}</p>
              </div>
            </div>
          ))}

          <div className="recipe-card add-new-recipe" onClick={handleAddNewRecipe}>
            <div className="add-recipe-content">
              <div className="add-icon-circle">
                <Plus size={32} strokeWidth={2.5} />
              </div>
              <span className="add-recipe-text">Aggiungi nuova ricetta</span>
            </div>
          </div>
        </div>
      </section>

      {selectedRecipe && (
        <div className="recipe-modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="recipe-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedRecipe(null)}>
              <X size={24} />
            </button>

            <div className="modal-body">
              <div className={`modal-image-section ${isEditingRecipe ? 'editing-image' : ''}`}
                onClick={() => isEditingRecipe && document.getElementById('recipe-image-input')?.click()}
              >
                <img src={isEditingRecipe ? tempRecipe?.image : selectedRecipe.image} alt={selectedRecipe.title} />
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
                      <h2 className="modal-title">{selectedRecipe.title}</h2>
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
    </main>
  );
}
