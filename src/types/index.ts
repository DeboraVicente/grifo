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

export type MetodoPagamento = 'debito' | 'credito' | 'pix' | 'boleto' | 'dinheiro'

export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outros'

export type TipoConta = 'corrente' | 'poupanca' | 'digital' | 'carteira'

export interface Conta {
  id: string
  nome: string
  tipo: TipoConta
  userId: string
  criadoEm: string
}

export interface ContaForm {
  nome: string
  tipo: TipoConta
}

export interface CartaoCredito {
  id: string
  nome: string
  bandeira?: BandeiraCartao
  limite?: number
  diaVencimento?: number
  melhorDiaCompra?: number
  contaId?: string
  userId: string
  criadoEm: string
}

export interface CartaoCreditoForm {
  nome: string
  bandeira?: BandeiraCartao
  limite?: number
  diaVencimento?: number
  melhorDiaCompra?: number
  contaId?: string
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

export type TipoGasto = 'fixo' | 'variavel'

export interface Despesa {
  id: string
  nome: string
  categoria: Categoria
  metodoPagamento: MetodoPagamento
  tipoGasto: TipoGasto
  cartaoId?: string
  contaId?: string
  tipo?: 'padrao' | 'financiamento'
  parcelas: number
  valorTotal: number
  valorParcela: number
  minhaParte?: number
  saldoDevedor?: number
  dataCompra?: string
  data: string
  observacoes?: string
  pago: boolean
  listaParcelas: Parcela[]
  adiantamentos: Pagamento[]
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
  tipoGasto: TipoGasto
  cartaoId?: string
  contaId?: string
  tipo: 'padrao' | 'financiamento'
  parcelas: number
  valorTotal: number
  valorParcelaCustom?: number
  minhaParte?: number
  dataCompra: string
  data: string
  observacoes: string
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
  metaMensal?: number
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
  metaMensal?: number
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
