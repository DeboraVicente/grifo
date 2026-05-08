import type { Despesa, Receita, Categoria, ParticipanteRateio, RateioAtivo } from '../types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export { fmt }

// ─── helpers ────────────────────────────────────────────────────────────────

function getMeuParticipante(despesa: Despesa, userId: string): ParticipanteRateio | undefined {
  if (!despesa.rateio?.ativo) return undefined
  return (despesa.rateio as RateioAtivo).participantes.find((p) => p.userId === userId)
}

function mesLabel(mes: number, ano: number): string {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

// Retorna as receitas efetivas para um mês: gravadas nesse mês + recorrentes (qualquer mês)
function receitasDoMes(receitas: Receita[], mes: number, ano: number): Receita[] {
  return receitas.filter((r) => {
    if (r.recorrente) return true
    const d = new Date(r.data + 'T12:00:00')
    return d.getMonth() === mes && d.getFullYear() === ano
  })
}

// Valor das parcelas da despesa com vencimento num mês
function parcelasMes(despesa: Despesa, mes: number, ano: number) {
  return despesa.listaParcelas.filter((p) => {
    const dv = new Date(p.dataVencimento + 'T12:00:00')
    return dv.getMonth() === mes && dv.getFullYear() === ano
  })
}

// ─── Relatório 1: Fluxo de Caixa Mensal ─────────────────────────────────────

export interface TimelineDia {
  data: string    // YYYY-MM-DD
  receitas: number
  despesas: number
}

export interface FluxoCaixaData {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  timeline: TimelineDia[]
}

export function calcFluxoCaixaMensal(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  receitas: Receita[],
  userId: string,
  mes: number,
  ano: number,
): FluxoCaixaData {
  const receitasMes = receitasDoMes(receitas, mes, ano)

  // Para recorrentes sem data no mês, usar o dia 1 do mês
  const totalReceitas = receitasMes.reduce((s, r) => s + r.valor, 0)

  // Parcelas próprias do mês
  let totalDespesas = despesas.reduce((s, d) => {
    return s + parcelasMes(d, mes, ano).reduce((ps, p) => ps + p.valor, 0)
  }, 0)

  // Rateios aceitos do mês (minha parte)
  rateiosRecebidos.forEach((d) => {
    const p = getMeuParticipante(d, userId)
    if (!p || p.status !== 'aceito') return
    parcelasMes(d, mes, ano).forEach(() => {
      totalDespesas += p.valorDevidoParcela ?? p.valorDevido
    })
  })

  // Timeline por dia
  const mapaTimeline: Record<string, TimelineDia> = {}

  const addTimeline = (data: string, receitas: number, despesas: number) => {
    if (!mapaTimeline[data]) mapaTimeline[data] = { data, receitas: 0, despesas: 0 }
    mapaTimeline[data].receitas += receitas
    mapaTimeline[data].despesas += despesas
  }

  receitasMes.forEach((r) => {
    const dataEfetiva = r.recorrente
      ? `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      : r.data
    addTimeline(dataEfetiva, r.valor, 0)
  })

  despesas.forEach((d) => {
    parcelasMes(d, mes, ano).forEach((p) => addTimeline(p.dataVencimento, 0, p.valor))
  })

  rateiosRecebidos.forEach((d) => {
    const part = getMeuParticipante(d, userId)
    if (!part || part.status !== 'aceito') return
    parcelasMes(d, mes, ano).forEach((p) => {
      addTimeline(p.dataVencimento, 0, part.valorDevidoParcela ?? part.valorDevido)
    })
  })

  const timeline = Object.values(mapaTimeline).sort((a, b) => a.data.localeCompare(b.data))

  return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas, timeline }
}

// ─── Relatório 2: Por Categoria ──────────────────────────────────────────────

export interface CategoriaDado {
  categoria: string
  total: number
  percentual: number
}

export function calcRelatorioPorCategoria(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  userId: string,
  mes?: number,
  ano?: number,
): CategoriaDado[] {
  const totais: Record<string, number> = {}

  const addCategoria = (cat: string, valor: number) => {
    totais[cat] = (totais[cat] ?? 0) + valor
  }

  const filtraData = (data: string): boolean => {
    if (mes === undefined || ano === undefined) return true
    const d = new Date(data + 'T12:00:00')
    return d.getMonth() === mes && d.getFullYear() === ano
  }

  despesas.forEach((d) => {
    if (d.listaParcelas.length === 0) {
      if (filtraData(d.data)) addCategoria(d.categoria, d.valorTotal)
      return
    }
    d.listaParcelas.forEach((p) => {
      if (filtraData(p.dataVencimento)) addCategoria(d.categoria, p.valor)
    })
  })

  rateiosRecebidos.forEach((d) => {
    const part = getMeuParticipante(d, userId)
    if (!part || part.status !== 'aceito') return
    if (d.listaParcelas.length === 0) {
      if (filtraData(d.data)) addCategoria(d.categoria, part.valorDevido)
      return
    }
    d.listaParcelas.forEach((p) => {
      if (filtraData(p.dataVencimento))
        addCategoria(d.categoria, part.valorDevidoParcela ?? part.valorDevido)
    })
  })

  const grandTotal = Object.values(totais).reduce((s, v) => s + v, 0)
  if (grandTotal === 0) return []

  return Object.entries(totais)
    .map(([categoria, total]) => ({
      categoria,
      total,
      percentual: Math.round((total / grandTotal) * 100),
    }))
    .sort((a, b) => b.total - a.total)
}

// ─── Relatório 3: Controle de Parcelamentos ──────────────────────────────────

export interface ParcelamentoDado {
  id: string
  nome: string
  categoria: Categoria
  parcelasTotal: number
  parcelasPagas: number
  parcelasRestantes: number
  valorParcela: number
  totalRestante: number
  proxVencimento: string | null
  ultimaParcela: string | null
}

export function calcControleParcelamentos(despesas: Despesa[]): ParcelamentoDado[] {
  return despesas
    .filter((d) => d.parcelas > 1 && !d.pago)
    .map((d) => {
      const pagas = d.listaParcelas.filter((p) => p.pago).length
      const naopagas = d.listaParcelas.filter((p) => !p.pago)
      const totalRestante = d.tipo === 'financiamento'
        ? (d.saldoDevedor ?? naopagas.reduce((s, p) => s + p.valor, 0))
        : naopagas.reduce((s, p) => s + p.valor, 0)
      const ordenadas = [...naopagas].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      return {
        id: d.id,
        nome: d.nome,
        categoria: d.categoria,
        parcelasTotal: d.parcelas,
        parcelasPagas: pagas,
        parcelasRestantes: naopagas.length,
        valorParcela: d.valorParcela,
        totalRestante,
        proxVencimento: ordenadas[0]?.dataVencimento ?? null,
        ultimaParcela: ordenadas[ordenadas.length - 1]?.dataVencimento ?? null,
      }
    })
    .sort((a, b) => (a.proxVencimento ?? '').localeCompare(b.proxVencimento ?? ''))
}

// ─── Relatório 4: Resumo de Rateios ─────────────────────────────────────────

export interface RateioCriado {
  id: string
  nome: string
  totalDevido: number
  totalPago: number
  pendente: number
  participantes: ParticipanteRateio[]
}

export interface RateioParticipando {
  id: string
  nome: string
  criadorId: string
  meuValorDevido: number
  meuValorPago: number
  meuPendente: number
  status: string
}

export interface RateioResumoDado {
  aReceber: number
  aPagar: number
  despesasCriadas: RateioCriado[]
  despesasParticipando: RateioParticipando[]
}

export function calcResumoRateios(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  userId: string,
): RateioResumoDado {
  const despesasCriadas: RateioCriado[] = despesas
    .filter((d) => d.rateio?.ativo)
    .map((d) => {
      const rateio = d.rateio as RateioAtivo
      const outros = rateio.participantes.filter((p) => p.userId !== userId)
      const totalDevido = outros.reduce((s, p) => s + (p.status === 'aceito' ? p.valorDevido : 0), 0)
      const totalPago = outros.reduce((s, p) => s + (p.valorPago ?? 0), 0)
      return {
        id: d.id,
        nome: d.nome,
        totalDevido,
        totalPago,
        pendente: Math.max(0, totalDevido - totalPago),
        participantes: rateio.participantes,
      }
    })

  const despesasParticipando: RateioParticipando[] = rateiosRecebidos.map((d) => {
    const part = getMeuParticipante(d, userId)!
    return {
      id: d.id,
      nome: d.nome,
      criadorId: d.userId,
      meuValorDevido: part?.valorDevido ?? 0,
      meuValorPago: part?.valorPago ?? 0,
      meuPendente: Math.max(0, (part?.valorDevido ?? 0) - (part?.valorPago ?? 0)),
      status: part?.status ?? 'pendente',
    }
  })

  const aReceber = despesasCriadas.reduce((s, d) => s + d.pendente, 0)
  const aPagar = despesasParticipando
    .filter((d) => d.status === 'aceito')
    .reduce((s, d) => s + d.meuPendente, 0)

  return { aReceber, aPagar, despesasCriadas, despesasParticipando }
}

// ─── Relatório 5: Forecast de Gastos ────────────────────────────────────────

export interface ForecastMes {
  mes: number
  ano: number
  label: string
  gastos: number
  receitas: number
  saldo: number
}

export function calcForecastGastos(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  receitas: Receita[],
  userId: string,
  mesesAFrente: number = 6,
): ForecastMes[] {
  const hoje = new Date()
  const resultado: ForecastMes[] = []

  for (let i = 0; i < mesesAFrente; i++) {
    const mes = (hoje.getMonth() + i) % 12
    const ano = hoje.getFullYear() + Math.floor((hoje.getMonth() + i) / 12)

    let gastos = despesas.reduce((s, d) => {
      return s + parcelasMes(d, mes, ano).filter((p) => !p.pago).reduce((ps, p) => ps + p.valor, 0)
    }, 0)

    rateiosRecebidos.forEach((d) => {
      const part = getMeuParticipante(d, userId)
      if (!part || part.status !== 'aceito') return
      parcelasMes(d, mes, ano).forEach(() => {
        gastos += part.valorDevidoParcela ?? part.valorDevido
      })
    })

    const receitasMes = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)

    resultado.push({ mes, ano, label: mesLabel(mes, ano), gastos, receitas: receitasMes, saldo: receitasMes - gastos })
  }

  return resultado
}

// ─── Relatório 6: Quanto Posso Gastar ───────────────────────────────────────

export interface QuantoDisponivel {
  receitasMes: number
  despesasRealizadas: number
  despesasFuturas: number
  disponivel: number
  mediaDiaria: number
  diasRestantes: number
  percentualGasto: number
}

export function calcQuantoPossoGastar(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  receitas: Receita[],
  userId: string,
  mes: number,
  ano: number,
): QuantoDisponivel {
  const receitasMes = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)

  let despesasRealizadas = 0
  let despesasFuturas = 0

  despesas.forEach((d) => {
    parcelasMes(d, mes, ano).forEach((p) => {
      if (p.pago) despesasRealizadas += p.valor
      else despesasFuturas += p.valor
    })
  })

  rateiosRecebidos.forEach((d) => {
    const part = getMeuParticipante(d, userId)
    if (!part || part.status !== 'aceito') return
    parcelasMes(d, mes, ano).forEach((p) => {
      const val = part.valorDevidoParcela ?? part.valorDevido
      if (p.pago) despesasRealizadas += val
      else despesasFuturas += val
    })
  })

  const disponivel = receitasMes - despesasRealizadas - despesasFuturas

  const hoje = new Date()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const diasRestantes =
    hoje.getMonth() === mes && hoje.getFullYear() === ano
      ? ultimoDia - hoje.getDate() + 1
      : ultimoDia

  const totalCompromissos = despesasRealizadas + despesasFuturas
  const percentualGasto = receitasMes > 0 ? Math.min(100, Math.round((totalCompromissos / receitasMes) * 100)) : 0

  return {
    receitasMes,
    despesasRealizadas,
    despesasFuturas,
    disponivel,
    mediaDiaria: diasRestantes > 0 ? disponivel / diasRestantes : 0,
    diasRestantes,
    percentualGasto,
  }
}

// ─── Relatório 7: Evolução Financeira ───────────────────────────────────────

export interface EvolucaoMes {
  mes: number
  ano: number
  label: string
  receitas: number
  despesas: number
  saldo: number
}

export function calcEvolucaoFinanceira(
  despesas: Despesa[],
  rateiosRecebidos: Despesa[],
  receitas: Receita[],
  userId: string,
  quantosMeses: number = 6,
): EvolucaoMes[] {
  const hoje = new Date()
  const resultado: EvolucaoMes[] = []

  for (let i = quantosMeses - 1; i >= 0; i--) {
    const totalMeses = hoje.getMonth() - i
    const mes = ((totalMeses % 12) + 12) % 12
    const ano = hoje.getFullYear() + Math.floor(totalMeses / 12)

    const totalReceitas = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)

    let totalDespesas = despesas.reduce((s, d) => {
      return s + parcelasMes(d, mes, ano).reduce((ps, p) => ps + p.valor, 0)
    }, 0)

    rateiosRecebidos.forEach((d) => {
      const part = getMeuParticipante(d, userId)
      if (!part || part.status !== 'aceito') return
      parcelasMes(d, mes, ano).forEach(() => {
        totalDespesas += part.valorDevidoParcela ?? part.valorDevido
      })
    })

    resultado.push({
      mes,
      ano,
      label: mesLabel(mes, ano),
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
    })
  }

  return resultado
}
