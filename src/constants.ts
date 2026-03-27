import { Croissant, Soup, Utensils, ChefHat, Bed, Bath, Sofa, DoorOpen } from 'lucide-react';
import type { Recipe } from './types';

export const SUGGESTIONS = [
  { text: 'Biscotti', icon: '🍪' },
  { text: 'Birra', icon: '🍺' },
  { text: 'Broccoli', icon: '🥦' },
  { text: 'Burro', icon: '🧈' },
  { text: 'Caffè', icon: '☕' },
  { text: 'Carote', icon: '🥕' },
  { text: 'Cipolle', icon: '🧅' },
  { text: 'Farina', icon: '🌾' },
  { text: 'Formaggio', icon: '🧀' },
  { text: 'Frutta', icon: '🍎' },
  { text: 'Latte', icon: '🥛' },
  { text: 'Olio extravergine', icon: '🫒' },
  { text: 'Pane', icon: '🥖' },
  { text: 'Pasta', icon: '🍝' },
  { text: 'Patate', icon: '🥔' },
  { text: 'Pepe', icon: '🧂' },
  { text: 'Pollo', icon: '🍗' },
  { text: 'Pomodori', icon: '🍅' },
  { text: 'Pesce', icon: '🐟' },
  { text: 'Riso', icon: '🍚' },
  { text: 'Sale', icon: '🧂' },
  { text: 'Uova', icon: '🥚' },
  { text: 'Vino', icon: '🍷' },
  { text: 'Yogurt', icon: '🥛' },
  { text: 'Zucchero', icon: '🍯' }
];

export const MEALS = [
  { id: 'colazione', label: 'Colazione', Icon: Croissant },
  { id: 'pranzo', label: 'Pranzo', Icon: Soup },
  { id: 'cena', label: 'Cena', Icon: Utensils }
];

export const ROOMS = [
  { id: 'cucina', label: 'Cucina', Icon: ChefHat, color: '#FFFAF0' },
  { id: 'camera', label: 'Camera da letto', Icon: Bed, color: '#F5F5FF' },
  { id: 'bagno', label: 'Bagno', Icon: Bath, color: '#F0FFFF' },
  { id: 'salotto', label: 'Salotto', Icon: Sofa, color: '#F0FFF4' },
  { id: 'ingresso', label: 'Ingresso', Icon: DoorOpen, color: '#FFF5F5' }
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
  '#FFF5F5', // Monday - Subtle red/pink
  '#FFF9F0', // Tuesday - Subtle orange
  '#FFFDF0', // Wednesday - Subtle yellow
  '#F0FFF4', // Thursday - Subtle green
  '#F0FFFF', // Friday - Subtle blue/cyan
  '#F5F5FF', // Saturday - Subtle indigo/blue
  '#FAF5FF'  // Sunday - Subtle purple
];
