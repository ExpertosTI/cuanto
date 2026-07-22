import type { Category } from '../types'

export const CATEGORY_COLORS = [
  '#2F8A5C',
  '#C9A045',
  '#C45C4E',
  '#4A7EB5',
  '#7A6BA8',
  '#2F9A8A',
  '#D07A45',
  '#4A5A68',
  '#3A8FB0',
  '#B05A7A',
]

export const CATEGORY_ICONS = [
  'shopping-cart',
  'utensils',
  'bus',
  'home',
  'zap',
  'heart-pulse',
  'gamepad-2',
  'graduation-cap',
  'briefcase',
  'gift',
  'coffee',
  'smartphone',
  'shirt',
  'fuel',
  'plane',
  'wallet',
  'building-2',
  'piggy-bank',
] as const

/** Default categories for República Dominicana — names are editable */
export function createDefaultCategories(): Category[] {
  return [
    { id: 'cat-colmadon', name: 'Colmado / Mercado', icon: 'shopping-cart', color: '#2F8A5C', type: 'expense', isDefault: true },
    { id: 'cat-comida', name: 'Comida', icon: 'utensils', color: '#C45C4E', type: 'expense', isDefault: true },
    { id: 'cat-transporte', name: 'Transporte', icon: 'bus', color: '#4A7EB5', type: 'expense', isDefault: true },
    { id: 'cat-casa', name: 'Casa / Alquiler', icon: 'home', color: '#C9A045', type: 'expense', isDefault: true },
    { id: 'cat-servicios', name: 'Luz / Agua / Internet', icon: 'zap', color: '#7A6BA8', type: 'expense', isDefault: true },
    { id: 'cat-salud', name: 'Salud', icon: 'heart-pulse', color: '#D07A45', type: 'expense', isDefault: true },
    { id: 'cat-ocio', name: 'Ocio', icon: 'gamepad-2', color: '#2F9A8A', type: 'expense', isDefault: true },
    { id: 'cat-salario', name: 'Salario', icon: 'briefcase', color: '#2F8A5C', type: 'income', isDefault: true },
    { id: 'cat-negocio', name: 'Negocio / Freelance', icon: 'building-2', color: '#4A7EB5', type: 'income', isDefault: true },
    { id: 'cat-remesas', name: 'Remesas', icon: 'piggy-bank', color: '#C9A045', type: 'income', isDefault: true },
  ]
}
