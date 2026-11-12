export type Categoria =
  | 'casa'
  | 'pessoal'
  | 'saude'
  | 'locomocao'
  | 'beleza'
  | 'alimentacao'
  | 'educacao'
  | 'lazer'
  | 'presente'
  | 'outros'

export type MetodoPagamento = 'debito' | 'credito' | 'pix' | 'boleto' | 'dinheiro'

export type BandeiraCartao = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outros'

export type TipoConta = 'corrente' | 'poupanca' | 'digital' | 'carteira'

export interface Conta {
  id: string
  nome: string
  tipo: TipoConta
  escopo?: Escopo
  userId: string
  criadoEm: string
}

export interface ContaForm {
  nome: string
  tipo: TipoConta
  escopo?: Escopo
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
export type Escopo = 'familiar' | 'pessoal'

/** Membros da família, para escolher quem pagou/recebeu e calcular a divisão */
export interface InfoFamilia {
  ownerUid: string
  membros: { uid: string; nome: string }[]
}

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
  escopo?: Escopo
  /** uid de quem pagou (despesas familiares; usado na divisão) */
  pagoPor?: string
  /** uid de quem lançou a despesa (despesas antigas não têm) */
  criadoPor?: string
  /** Só em relatórios: despesa projetada a partir de um gasto previsto (id do previsto) */
  origemPrevisto?: string
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
  escopo?: Escopo
  pagoPor?: string
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
  /** uid de quem fez o movimento */
  userId?: string
}

export interface Caixinha {
  id: string
  nome: string
  categoria: CaixinhaCategoria
  valorMeta?: number
  metaMensal?: number
  dataObjetivo?: string
  valorAtual: number
  historico: MovimentoCaixinha[]
  escopo?: Escopo
  /** uid de quem criou (caixinhas antigas não têm) */
  criadoPor?: string
  userId: string
  criadoEm: string
  atualizadoEm: string
}

export interface CaixinhaForm {
  nome: string
  categoria: CaixinhaCategoria
  valorMeta?: number
  metaMensal?: number
  dataObjetivo?: string
  valorInicial?: number
  escopo?: Escopo
}


export type CategoriaReceita = 'salario' | 'freelance' | 'investimento' | 'outros'

export interface Receita {
  id: string
  nome: string
  valor: number
  data: string
  categoria: CategoriaReceita
  recorrente: boolean
  escopo?: Escopo
  /** uid de quem recebeu (receitas familiares; usado na divisão) */
  recebidoPor?: string
  userId: string
  criadoEm: string
  atualizadoEm: string
}

// ─── Gastos previstos ────────────────────────────────────────────────────────
// Gastos que sabemos que vão acontecer de tempos em tempos (troca de óleo,
// revisão, IPVA, dentista...). O app calcula quanto reservar por mês e avisa
// quando está chegando a hora de fazer.

export interface MovimentoPrevisto {
  id: string
  tipo: 'reserva' | 'uso' | 'ajuste'
  valor: number
  data: string
  observacao?: string
}

export interface GastoPrevisto {
  id: string
  nome: string
  categoria: Categoria
  valorEstimado: number
  intervaloMeses: number
  proximaData: string
  avisarDiasAntes: number
  valorReservado: number
  historico: MovimentoPrevisto[]
  observacoes?: string
  userId: string
  criadoEm: string
  atualizadoEm: string
}

export interface GastoPrevistoForm {
  nome: string
  categoria: Categoria
  valorEstimado: number
  intervaloMeses: number
  proximaData: string
  avisarDiasAntes: number
  valorJaReservado?: number
  observacoes?: string
}
