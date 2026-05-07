import type { LucideIcon } from 'lucide-react'
import {
  Home, User, Heart, Car, Sparkles, Utensils, BookOpen, Gamepad2, Package,
  ShieldAlert, Plane, Wrench, Smartphone,
} from 'lucide-react'
import type { Categoria, CaixinhaCategoria } from '../../types'

type AnyCategoria = Categoria | CaixinhaCategoria

const ICONS: Partial<Record<AnyCategoria, LucideIcon>> = {
  casa: Home,
  pessoal: User,
  saude: Heart,
  locomocao: Car,
  beleza: Sparkles,
  alimentacao: Utensils,
  educacao: BookOpen,
  lazer: Gamepad2,
  outros: Package,
  emergencia: ShieldAlert,
  viagem: Plane,
  reforma: Wrench,
  eletronicos: Smartphone,
}

interface Props {
  categoria: AnyCategoria
  size?: number
  color?: string
  className?: string
}

export default function CategoryIcon({ categoria, size = 18, color, className }: Props) {
  const Icon = ICONS[categoria] ?? Package
  return <Icon size={size} color={color} className={className} />
}
