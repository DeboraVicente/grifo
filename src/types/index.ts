export type Categoria =
  | 'casa'
  | 'pessoal'
  | 'saude'
  | 'locomocao'
  | 'beleza'
  | 'alimentacao'
  | 'educacao'
  | 'lazer'
  | 'outros'

export type MetodoPagamento = 'debito' | 'credito' | 'pix' | 'dinheiro'

export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outros'

export interface CartaoCredito {
  id: string
  nome: string
  banco: string
  bandeira?: BandeiraCartao
  limite?: number
  diaVencimento?: number
  melhorDiaCompra?: number
  userId: string
  criadoEm: string
}

export interface CartaoCreditoForm {
  nome: string
  banco: string
  bandeira?: BandeiraCartao
  limite?: number
  diaVencimento?: number
  melhorDiaCompra?: number
}

export interface Pagamento {
  id: string
  userId: string
  valor: number
  data: string
  observacao?: string
}

export interface Parcela {
  numero: number
  valor: number
  dataVencimento: string
  pago: boolean
  pagamentos: Pagamento[]
}

export interface Despesa {
  id: string
  nome: string
  categoria: Categoria
  metodoPagamento: MetodoPagamento
  cartaoId?: string
  paraAmigoId?: string
  paraAmigoNome?: string
  paraAmigoEmail?: string
  statusCompartilhamento?: 'pendente' | 'aceito' | 'recusado'
  tipo?: 'padrao' | 'financiamento'
  parcelas: number
  valorTotal: number
  valorParcela: number
  saldoDevedor?: number
  dataCompra?: string
  data: string
  observacoes?: string
  pago: boolean
  listaParcelas: Parcela[]
  adiantamentos: Pagamento[]
  rateio: Rateio
  recorrente?: boolean
  recorrenciaId?: string
  userId: string
  criadoEm: string
  atualizadoEm: string
}

export interface DespesaForm {
  nome: string
  categoria: Categoria
  metodoPagamento: MetodoPagamento
  cartaoId?: string
  paraAmigoId?: string
  paraAmigoNome?: string
  paraAmigoEmail?: string
  tipo: 'padrao' | 'financiamento'
  parcelas: number
  valorTotal: number
  valorParcelaCustom?: number
  dataCompra: string
  data: string
  observacoes: string
  rateio: Rateio
  recorrente?: boolean
  recorrenciaMeses?: number
}

export type CaixinhaCategoria =
  | 'emergencia'
  | 'viagem'
  | 'educacao'
  | 'saude'
  | 'reforma'
  | 'eletronicos'
  | 'outros'

export interface MovimentoCaixinha {
  id: string
  tipo: 'entrada' | 'saida' | 'rendimento'
  valor: number
  data: string
  observacao?: string
}

export interface Caixinha {
  id: string
  nome: string
  categoria: CaixinhaCategoria
  valorMeta?: number
  valorAtual: number
  historico: MovimentoCaixinha[]
  userId: string
  criadoEm: string
  atualizadoEm: string
}

export interface CaixinhaForm {
  nome: string
  categoria: CaixinhaCategoria
  valorMeta?: number
}

export type StatusAmizade = 'pendente' | 'aceita' | 'recusada'

export interface Amizade {
  id: string
  solicitanteId: string
  solicitanteNome: string
  solicitanteEmail: string
  receptorId: string
  receptorNome?: string
  receptorEmail: string
  status: StatusAmizade
  criadoEm: string
}

export type StatusRateio = 'pendente' | 'aceito' | 'recusado'

export type TipoRateioCalculo = 'pessoa' | 'renda'

export interface ParticipanteRateio {
  userId: string
  nome: string
  email: string
  renda?: number
  percentual: number
  valorDevido: number
  valorDevidoParcela?: number
  valorPago: number
  pagamentos: Pagamento[]
  status: StatusRateio
}

export interface RateioAtivo {
  ativo: true
  tipo: TipoRateioCalculo
  participantes: ParticipanteRateio[]
  rendaCriador?: number
}

export interface RateioInativo {
  ativo: false
}

export type Rateio = RateioAtivo | RateioInativo

export type CategoriaReceita = 'salario' | 'freelance' | 'investimento' | 'outros'

export interface Receita {
  id: string
  nome: string
  valor: number
  data: string
  categoria: CategoriaReceita
  recorrente: boolean
  userId: string
  criadoEm: string
  atualizadoEm: string
}
