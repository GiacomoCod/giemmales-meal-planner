import { Croissant, Soup, Utensils, ChefHat, Bed, Bath, Sofa, DoorOpen } from 'lucide-react';
import type { Recipe } from './types';

export const SUGGESTIONS = [
  /* Supermercato */
  { text: 'Biscotti', icon: '🍪', category: 'supermarket' },
  { text: 'Birra', icon: '🍺', category: 'supermarket' },
  { text: 'Broccoli', icon: '🥦', category: 'supermarket' },
  { text: 'Burro', icon: '🧈', category: 'supermarket' },
  { text: 'Caffè', icon: '☕', category: 'supermarket' },
  { text: 'Carote', icon: '🥕', category: 'supermarket' },
  { text: 'Cipolle', icon: '🧅', category: 'supermarket' },
  { text: 'Farina', icon: '🌾', category: 'supermarket' },
  { text: 'Formaggio', icon: '🧀', category: 'supermarket' },
  { text: 'Frutta', icon: '🍎', category: 'supermarket' },
  { text: 'Latte', icon: '🥛', category: 'supermarket' },
  { text: 'Olio extravergine', icon: '🫒', category: 'supermarket' },
  { text: 'Pane', icon: '🥖', category: 'supermarket' },
  { text: 'Pasta', icon: '🍝', category: 'supermarket' },
  { text: 'Patate', icon: '🥔', category: 'supermarket' },
  { text: 'Pepe', icon: '🧂', category: 'supermarket' },
  { text: 'Pollo', icon: '🍗', category: 'supermarket' },
  { text: 'Pomodori', icon: '🍅', category: 'supermarket' },
  { text: 'Pesce', icon: '🐟', category: 'supermarket' },
  { text: 'Riso', icon: '🍚', category: 'supermarket' },
  { text: 'Sale', icon: '🧂', category: 'supermarket' },
  { text: 'Uova', icon: '🥚', category: 'supermarket' },
  { text: 'Vino', icon: '🍷', category: 'supermarket' },
  { text: 'Yogurt', icon: '🥛', category: 'supermarket' },
  { text: 'Zucchero', icon: '🍯', category: 'supermarket' },
  
  /* Casa & Detersivi */
  { text: 'Detersivo Piatti', icon: '🧼', category: 'home' },
  { text: 'Sgrassatore', icon: '🧴', category: 'home' },
  { text: 'Ammorbidente', icon: '🧺', category: 'home' },
  { text: 'Buste Immondizia', icon: '🗑️', category: 'home' },
  { text: 'Carta Igienica', icon: '🧻', category: 'home' },
  { text: 'Dentifricio', icon: '🪥', category: 'home' },
  { text: 'Sapone Mani', icon: '🧼', category: 'home' },
  { text: 'Spugnette', icon: '🧽', category: 'home' },
  { text: 'Scottex', icon: '🧻', category: 'home' },

  /* Farmaci */
  { text: 'Tachipirina', icon: '🌡️', category: 'medicine' },
  { text: 'Aspirina', icon: '💊', category: 'medicine' },
  { text: 'Brufen', icon: '🦴', category: 'medicine' },
  { text: 'Voltaren', icon: '🧴', category: 'medicine' },
  { text: 'Oki', icon: '🌬️', category: 'medicine' },
  { text: 'Gaviscon', icon: '🫧', category: 'medicine' },
  { text: 'Biochetasi', icon: '🍋', category: 'medicine' },
  { text: 'Bentelan', icon: '🌬️', category: 'medicine' },
  { text: 'Enterogermina', icon: '🥛', category: 'medicine' },
  { text: 'Buscopan', icon: '🌀', category: 'medicine' },
  { text: 'Zerinol', icon: '🤧', category: 'medicine' },
  { text: 'Vivin C', icon: '🍊', category: 'medicine' },
  { text: 'Cerotti', icon: '🩹', category: 'medicine' },
  { text: 'Disinfettante', icon: '🧴', category: 'medicine' },
  { text: 'Garze', icon: '🧶', category: 'medicine' }
] as const;

export const MEALS = [
  { id: 'colazione', label: 'Colazione', Icon: Croissant },
  { id: 'pranzo', label: 'Pranzo', Icon: Soup },
  { id: 'cena', label: 'Cena', Icon: Utensils }
];

export const ROOMS = [
  { id: 'cucina', label: 'Cucina', Icon: ChefHat, color: 'var(--room-cucina)' },
  { id: 'camera', label: 'Camera da letto', Icon: Bed, color: 'var(--room-camera)' },
  { id: 'bagno', label: 'Bagno', Icon: Bath, color: 'var(--room-bagno)' },
  { id: 'salotto', label: 'Salotto', Icon: Sofa, color: 'var(--room-salotto)' },
  { id: 'ingresso', label: 'Ingresso', Icon: DoorOpen, color: 'var(--room-ingresso)' }
];

export const DEFAULT_ROOM_TASKS: Record<string, string[]> = {
  camera: ['Pulizia pavimento', 'Cambio lenzuola', 'Spolvero mobili', 'Pulizia armadio', 'Cambio copri-piumino'],
  cucina: ['Pulizia piano cottura', 'Pulizia forno', 'Pulizia pavimento', 'Svuota frigorifero'],
  bagno: ['Pulizia WC', 'Pulizia lavandino', 'Pulizia pavimento', 'Cambio asciugamani'],
  salotto: ['Pulizia pavimento', 'Spolvero mobili', 'Pulizia divano'],
  ingresso: ['Spolvero mobili', 'Pulizia pavimento']
};

export const DUMMY_RECIPES: Recipe[] = [];

export const PASTEL_VARS = [
  'var(--col-lunedi)',
  'var(--col-martedi)',
  'var(--col-mercoledi)',
  'var(--col-giovedi)',
  'var(--col-venerdi)',
  'var(--col-sabato)',
  'var(--col-domenica)'
];
