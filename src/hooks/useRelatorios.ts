import type { Despesa, Receita, Categoria } from '../types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export { fmt }

function mesLabel(mes: number, ano: number): string {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

/**
 * Receitas que entram no mês: avulsas pela data; recorrentes a partir do mês em que
 * começaram (não contam em meses anteriores ao início).
 */
export function receitasDoMes(receitas: Receita[], mes: number, ano: number): Receita[] {
  const alvo = ano * 12 + mes
  return receitas.filter((r) => {
    const d = new Date(r.data + 'T12:00:00')
    const inicio = d.getFullYear() * 12 + d.getMonth()
    if (r.recorrente) return alvo >= inicio
    return alvo === inicio
  })
}

/**
 * Valor de uma parcela que conta nos relatórios: se a despesa tem "parte desta compra
 * não é minha", vale só a minha parte proporcional por parcela; senão, o valor da parcela.
 */
export function valorDaParcela(d: Despesa, p: { valor: number }): number {
  // Arredonda por parcela, igual à tabela da página de Despesas (para os totais baterem)
  return d.minhaParte !== undefined && d.minhaParte !== null
    ? parseFloat((d.minhaParte / (d.parcelas || 1)).toFixed(2))
    : p.valor
}

export function parcelasMes(despesa: Despesa, mes: number, ano: number) {
  return despesa.listaParcelas.filter((p) => {
    const dv = new Date(p.dataVencimento + 'T12:00:00')
    return dv.getMonth() === mes && dv.getFullYear() === ano
  })
}

// ─── Relatório 1: Fluxo de Caixa Mensal ─────────────────────────────────────

export interface TimelineDia {
  data: string
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
  receitas: Receita[],
  _userId: string,
  mes: number,
  ano: number,
): FluxoCaixaData {
  const receitasMes = receitasDoMes(receitas, mes, ano)
  const totalReceitas = receitasMes.reduce((s, r) => s + r.valor, 0)

  const totalDespesas = despesas.reduce((s, d) => {
    return s + parcelasMes(d, mes, ano).reduce((ps, p) => ps + valorDaParcela(d, p), 0)
  }, 0)

  const mapaTimeline: Record<string, TimelineDia> = {}
  const addTimeline = (data: string, rec: number, desp: number) => {
    if (!mapaTimeline[data]) mapaTimeline[data] = { data, receitas: 0, despesas: 0 }
    mapaTimeline[data].receitas += rec
    mapaTimeline[data].despesas += desp
  }

  receitasMes.forEach((r) => {
    const dataEfetiva = r.recorrente
      ? `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      : r.data
    addTimeline(dataEfetiva, r.valor, 0)
  })

  despesas.forEach((d) => {
    parcelasMes(d, mes, ano).forEach((p) => addTimeline(p.dataVencimento, 0, valorDaParcela(d, p)))
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
  _userId: string,
  mes?: number,
  ano?: number,
): CategoriaDado[] {
  const totais: Record<string, number> = {}

  const filtraData = (data: string): boolean => {
    if (mes === undefined || ano === undefined) return true
    const d = new Date(data + 'T12:00:00')
    return d.getMonth() === mes && d.getFullYear() === ano
  }

  despesas.forEach((d) => {
    if (d.listaParcelas.length === 0) {
      if (filtraData(d.data)) totais[d.categoria] = (totais[d.categoria] ?? 0) + (d.minhaParte ?? d.valorTotal)
      return
    }
    d.listaParcelas.forEach((p) => {
      if (filtraData(p.dataVencimento))
        totais[d.categoria] = (totais[d.categoria] ?? 0) + valorDaParcela(d, p)
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
    // Previstos projetados não são parcelamentos
    .filter((d) => d.parcelas > 1 && !d.pago && !d.origemPrevisto)
    .map((d) => {
      const naopagas = d.listaParcelas?.filter((p) => !p.pago) || []
      const ordenadas = [...naopagas].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
      const valorExibicao = d.tipo === 'financiamento'
        ? (d.valorParcela || (ordenadas[0]?.valor ?? 0))
        : naopagas.reduce((s, p) => s + valorDaParcela(d, p), 0)
      return {
        id: d.id,
        nome: d.nome,
        categoria: d.categoria,
        parcelasTotal: d.parcelas,
        parcelasPagas: d.listaParcelas?.filter((p) => p.pago).length ?? 0,
        parcelasRestantes: naopagas.length,
        valorParcela: d.valorParcela || (ordenadas[0]?.valor ?? 0),
        totalRestante: valorExibicao,
        proxVencimento: ordenadas[0]?.dataVencimento ?? null,
        ultimaParcela: ordenadas[ordenadas.length - 1]?.dataVencimento ?? null,
      }
    })
    .sort((a, b) => (a.proxVencimento ?? '').localeCompare(b.proxVencimento ?? ''))
}

// ─── Relatório 4: Forecast de Gastos ────────────────────────────────────────

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
  receitas: Receita[],
  _userId: string,
  mesesAFrente: number = 6,
): ForecastMes[] {
  const hoje = new Date()
  const resultado: ForecastMes[] = []

  for (let i = 0; i < mesesAFrente; i++) {
    const mes = (hoje.getMonth() + i) % 12
    const ano = hoje.getFullYear() + Math.floor((hoje.getMonth() + i) / 12)

    const gastos = despesas.reduce((s, d) => {
      return s + parcelasMes(d, mes, ano).reduce((ps, p) => ps + valorDaParcela(d, p), 0)
    }, 0)

    const receitasMes = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)
    resultado.push({ mes, ano, label: mesLabel(mes, ano), gastos, receitas: receitasMes, saldo: receitasMes - gastos })
  }

  return resultado
}

// ─── Relatório 5: Quanto Posso Gastar ───────────────────────────────────────

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
  receitas: Receita[],
  _userId: string,
  mes: number,
  ano: number,
): QuantoDisponivel {
  const receitasMes = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)

  let despesasRealizadas = 0
  let despesasFuturas = 0

  despesas.forEach((d) => {
    parcelasMes(d, mes, ano).forEach((p) => {
      if (p.pago) despesasRealizadas += valorDaParcela(d, p)
      else despesasFuturas += valorDaParcela(d, p)
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
    receitasMes, despesasRealizadas, despesasFuturas, disponivel,
    mediaDiaria: diasRestantes > 0 ? disponivel / diasRestantes : 0,
    diasRestantes, percentualGasto,
  }
}

// ─── Relatório 6: Evolução Financeira ───────────────────────────────────────

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
  receitas: Receita[],
  _userId: string,
  quantosMeses: number = 6,
): EvolucaoMes[] {
  const hoje = new Date()
  const resultado: EvolucaoMes[] = []

  for (let i = quantosMeses - 1; i >= 0; i--) {
    const totalMeses = hoje.getMonth() - i
    const mes = ((totalMeses % 12) + 12) % 12
    const ano = hoje.getFullYear() + Math.floor(totalMeses / 12)

    const totalReceitas = receitasDoMes(receitas, mes, ano).reduce((s, r) => s + r.valor, 0)
    const totalDespesas = despesas.reduce((s, d) => {
      return s + parcelasMes(d, mes, ano).reduce((ps, p) => ps + valorDaParcela(d, p), 0)
    }, 0)

    resultado.push({ mes, ano, label: mesLabel(mes, ano), receitas: totalReceitas, despesas: totalDespesas, saldo: totalReceitas - totalDespesas })
  }

  return resultado
}
