import type { BandeiraCartao, TipoConta } from '../../types'

/** Opções dos formulários de conta e cartão */
export const TIPOS_CONTA: { value: TipoConta; label: string }[] = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'carteira', label: 'Carteira (dinheiro)' },
]

export const BANDEIRAS: { value: BandeiraCartao; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'outros', label: 'Outros' },
]
