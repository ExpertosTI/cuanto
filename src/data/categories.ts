import type { Category } from '../types'

export const CATEGORY_COLORS = [
  '#5A9A78',
  '#C9A45A',
  '#C47A6E',
  '#6B8FBF',
  '#8E7AB5',
  '#5AA89A',
  '#D08A5A',
  '#5A6878',
  '#5A9EBF',
  '#C06B90',
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
    { id: 'cat-colmadon', name: 'Colmado / Mercado', icon: 'shopping-cart', color: '#5A9A78', type: 'expense', isDefault: true },
    { id: 'cat-comida', name: 'Comida', icon: 'utensils', color: '#C47A6E', type: 'expense', isDefault: true },
    { id: 'cat-transporte', name: 'Transporte', icon: 'bus', color: '#6B8FBF', type: 'expense', isDefault: true },
    { id: 'cat-casa', name: 'Casa / Alquiler', icon: 'home', color: '#C9A45A', type: 'expense', isDefault: true },
    { id: 'cat-servicios', name: 'Luz / Agua / Internet', icon: 'zap', color: '#8E7AB5', type: 'expense', isDefault: true },
    { id: 'cat-salud', name: 'Salud', icon: 'heart-pulse', color: '#D08A5A', type: 'expense', isDefault: true },
    { id: 'cat-ocio', name: 'Ocio', icon: 'gamepad-2', color: '#5AA89A', type: 'expense', isDefault: true },
    { id: 'cat-salario', name: 'Salario', icon: 'briefcase', color: '#5A9A78', type: 'income', isDefault: true },
    { id: 'cat-negocio', name: 'Negocio / Freelance', icon: 'building-2', color: '#6B8FBF', type: 'income', isDefault: true },
    { id: 'cat-remesas', name: 'Remesas', icon: 'piggy-bank', color: '#C9A45A', type: 'income', isDefault: true },
  ]
}
