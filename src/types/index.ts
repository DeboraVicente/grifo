export type Categoria =
  | 'casa'
  | 'pessoal'
  | 'saude'
  | 'locomocao'
  | 'alimentacao'
  | 'educacao'
  | 'lazer'

export type MetodoPagamento = 'debito' | 'credito' | 'pix' | 'dinheiro'

export type TipoRateio = 'renda' | 'pessoa'

export interface Rateio {
  ativo: boolean
  grupoId?: string
  tipo?: TipoRateio
}

export interface Pagamento {
  id: string
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
  parcelas: number
  valorTotal: number
  valorParcela: number
  data: string
  observacoes?: string
  pago: boolean
  listaParcelas: Parcela[]
  adiantamentos: Pagamento[]
  rateio: Rateio
  userId: string
  criadoEm: string
  atualizadoEm: string
}

export interface DespesaForm {
  nome: string
  categoria: Categoria
  metodoPagamento: MetodoPagamento
  parcelas: number
  valorTotal: number
  data: string
  observacoes: string
  rateio: Rateio
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
  tipo: 'entrada' | 'saida'
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
