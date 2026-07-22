import {
  Briefcase,
  Building2,
  Bus,
  Coffee,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PiggyBank,
  Plane,
  Shirt,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  bus: Bus,
  home: Home,
  zap: Zap,
  'heart-pulse': HeartPulse,
  'gamepad-2': Gamepad2,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  coffee: Coffee,
  smartphone: Smartphone,
  shirt: Shirt,
  fuel: Fuel,
  plane: Plane,
  wallet: Wallet,
  'building-2': Building2,
  'piggy-bank': PiggyBank,
}

interface CategoryIconProps {
  name: string
  size?: number
  color?: string
  className?: string
}

export function CategoryIcon({ name, size = 20, color = 'currentColor', className }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? Wallet
  return <Icon size={size} color={color} className={className} strokeWidth={2.1} />
}
