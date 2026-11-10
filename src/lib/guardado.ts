import type { Caixinha, GastoPrevisto } from '../types'

/*
 * Dinheiro guardado = saldo das caixinhas + o que está reservado nos gastos previstos.
 *
 * O saldo de cada mês é reconstruído repetindo os movimentos em ordem, com as mesmas
 * regras usadas ao salvar:
 *  - caixinha: entrada/rendimento somam; saída subtrai sem deixar negativo
 *  - previsto: reserva/ajuste somam (ajuste pode ser negativo), sem deixar negativo;
 *              uso consome o que estava reservado (até o valor gasto)
 * Se o saldo atual não bater com a soma dos movimentos (dados antigos), a diferença
 * entra como saldo inicial.
 */

export interface ItemGuardado {
  id: string
  nome: string
  tipo: 'caixinha' | 'previsto'
  saldoAtual: number
  /** Saldo no fim do mês selecionado */
  saldoNoMes: number
  /** Quanto entrou (guardou) no mês selecionado */
  entrouNoMes: number
  /** Quanto saiu (retirou/usou) no mês selecionado */
  saiuNoMes: number
  /** Rendimentos no mês (só caixinhas) */
  rendeuNoMes: number
}

export interface PontoGuardado {
  label: string
  mes: number
  ano: number
  caixinhas: number
  previstos: number
  total: number
}

export interface RelatorioGuardado {
  totalAtual: number
  totalCaixinhas: number
  totalPrevistos: number
  guardadoNoMes: number
  retiradoNoMes: number
  rendimentosNoMes: number
  itens: ItemGuardado[]
  evolucao: PontoGuardado[]
}

interface Mov { data: string; delta: (saldo: number) => number; entrou: number; saiu: number; rendeu: number }

const fimDoMes = (mes: number, ano: number) => {
  const ultimo = new Date(ano, mes + 1, 0).getDate()
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
}
const chaveMes = (mes: number, ano: number) => `${ano}-${String(mes + 1).padStart(2, '0')}`
const mesLabel = (mes: number, ano: number) =>
  new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

function movimentosCaixinha(c: Caixinha): Mov[] {
  return (c.historico ?? []).map((m) => ({
    data: m.data,
    delta: (s: number) => (m.tipo === 'saida' ? Math.max(0, s - m.valor) : s + m.valor),
    entrou: m.tipo === 'entrada' ? m.valor : 0,
    saiu: m.tipo === 'saida' ? m.valor : 0,
    rendeu: m.tipo === 'rendimento' ? m.valor : 0,
  }))
}

function movimentosPrevisto(g: GastoPrevisto): Mov[] {
  return (g.historico ?? []).map((m) => {
    if (m.tipo === 'uso') {
      return { data: m.data, delta: (s: number) => s - Math.min(s, m.valor), entrou: 0, saiu: m.valor, rendeu: 0 }
    }
    return {
      data: m.data,
      delta: (s: number) => Math.max(0, s + m.valor),
      entrou: m.valor > 0 ? m.valor : 0,
      saiu: m.valor < 0 ? -m.valor : 0,
      rendeu: 0,
    }
  })
}

/** Saldo ao fim de cada data de corte, repetindo os movimentos em ordem. */
function saldosEm(movs: Mov[], saldoAtual: number, cortes: string[]): number[] {
  const ordenados = [...movs].sort((a, b) => a.data.localeCompare(b.data))
  const finalSemBase = ordenados.reduce((s, m) => m.delta(s), 0)
  const base = Math.max(0, saldoAtual - finalSemBase) // diferença de dados antigos
  return cortes.map((corte) => {
    let s = base
    for (const m of ordenados) {
      if (m.data > corte) break
      s = m.delta(s)
    }
    return s
  })
}

/**
 * Quanto entrou, saiu e rendeu no mês, medido pela variação real do saldo em cada
 * movimento (ex.: um uso de R$ 900 com R$ 500 reservados tira só R$ 500).
 */
function movimentosDoMes(movs: Mov[], saldoAtual: number, chave: string) {
  const ordenados = [...movs].sort((a, b) => a.data.localeCompare(b.data))
  const finalSemBase = ordenados.reduce((s, m) => m.delta(s), 0)
  let s = Math.max(0, saldoAtual - finalSemBase)
  const r = { entrou: 0, saiu: 0, rendeu: 0 }
  for (const m of ordenados) {
    const depois = m.delta(s)
    if (m.data.startsWith(chave)) {
      const diff = depois - s
      if (m.rendeu > 0) r.rendeu += diff
      else if (diff > 0) r.entrou += diff
      else r.saiu += -diff
    }
    s = depois
  }
  return r
}

export function calcGuardado(
  caixinhas: Caixinha[],
  previstos: GastoPrevisto[],
  mes: number,
  ano: number,
  mesesEvolucao = 12,
): RelatorioGuardado {
  const meses: { mes: number; ano: number }[] = []
  for (let i = mesesEvolucao - 1; i >= 0; i--) {
    const d = new Date(ano, mes - i, 1)
    meses.push({ mes: d.getMonth(), ano: d.getFullYear() })
  }
  const cortes = meses.map((m) => fimDoMes(m.mes, m.ano))
  const corteSelecionado = fimDoMes(mes, ano)
  const chave = chaveMes(mes, ano)

  const fontes = [
    ...caixinhas.map((c) => ({ id: c.id, nome: c.nome, tipo: 'caixinha' as const, atual: c.valorAtual ?? 0, movs: movimentosCaixinha(c) })),
    ...previstos.map((g) => ({ id: g.id, nome: g.nome, tipo: 'previsto' as const, atual: g.valorReservado ?? 0, movs: movimentosPrevisto(g) })),
  ]

  const evolucao: PontoGuardado[] = meses.map((m) => ({ label: mesLabel(m.mes, m.ano), mes: m.mes, ano: m.ano, caixinhas: 0, previstos: 0, total: 0 }))
  const itens: ItemGuardado[] = fontes.map((f) => {
    const serie = saldosEm(f.movs, f.atual, [...cortes, corteSelecionado])
    serie.slice(0, cortes.length).forEach((v, i) => {
      if (f.tipo === 'caixinha') evolucao[i].caixinhas += v
      else evolucao[i].previstos += v
    })
    const mesSel = movimentosDoMes(f.movs, f.atual, chave)
    return {
      id: f.id, nome: f.nome, tipo: f.tipo, saldoAtual: f.atual,
      saldoNoMes: serie[serie.length - 1],
      entrouNoMes: mesSel.entrou,
      saiuNoMes: mesSel.saiu,
      rendeuNoMes: mesSel.rendeu,
    }
  })
  evolucao.forEach((p) => { p.total = p.caixinhas + p.previstos })

  const totalCaixinhas = itens.filter((i) => i.tipo === 'caixinha').reduce((s, i) => s + i.saldoAtual, 0)
  const totalPrevistos = itens.filter((i) => i.tipo === 'previsto').reduce((s, i) => s + i.saldoAtual, 0)
  return {
    totalAtual: totalCaixinhas + totalPrevistos,
    totalCaixinhas,
    totalPrevistos,
    guardadoNoMes: itens.reduce((s, i) => s + i.entrouNoMes, 0),
    retiradoNoMes: itens.reduce((s, i) => s + i.saiuNoMes, 0),
    rendimentosNoMes: itens.reduce((s, i) => s + i.rendeuNoMes, 0),
    itens: itens.sort((a, b) => b.saldoAtual - a.saldoAtual),
    evolucao,
  }
}

// ─── Projeção do guardado ────────────────────────────────────────────────────

const chaveIso = (iso: string) => iso.slice(0, 7)
const mesesEntre = (de: { mes: number; ano: number }, iso: string) => {
  const [a, m] = iso.split('-').map(Number)
  return (a - de.ano) * 12 + (m - 1 - de.mes)
}

/**
 * Guardado projetado no fim de cada um dos próximos meses (a partir do mês atual):
 *  - caixinha: soma a meta mensal (no mês atual, só o que falta depositar da meta),
 *    sem passar do valor da meta, se houver;
 *  - previsto: reserva por mês o que falta dividido pelos meses até a data; no mês da
 *    data o valor estimado é usado e a reserva recomeça para a próxima ocorrência.
 */
export function calcGuardadoProjetado(
  caixinhas: Caixinha[],
  previstos: GastoPrevisto[],
  meses = 6,
  hoje = new Date(),
): number[] {
  const lista: { mes: number; ano: number }[] = []
  for (let i = 0; i < meses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    lista.push({ mes: d.getMonth(), ano: d.getFullYear() })
  }
  const totais = lista.map(() => 0)
  const chaveAtual = chaveMes(hoje.getMonth(), hoje.getFullYear())

  caixinhas.forEach((c) => {
    let saldo = c.valorAtual ?? 0
    const meta = c.metaMensal ?? 0
    const depositadoAgora = (c.historico ?? [])
      .filter((m) => m.tipo === 'entrada' && m.data.startsWith(chaveAtual))
      .reduce((s, m) => s + m.valor, 0)
    lista.forEach((_, i) => {
      let dep = i === 0 ? Math.max(0, meta - depositadoAgora) : meta
      if (c.valorMeta) dep = Math.min(dep, Math.max(0, c.valorMeta - saldo))
      saldo += dep
      totais[i] += saldo
    })
  })

  previstos.forEach((g) => {
    if (!g.proximaData || g.intervaloMeses < 1) return
    let reservado = g.valorReservado ?? 0
    let proxima = g.proximaData
    lista.forEach((m, i) => {
      const chave = chaveMes(m.mes, m.ano)
      if (chave < chaveIso(proxima)) {
        const falta = Math.max(0, g.valorEstimado - reservado)
        const mesesAte = Math.max(1, mesesEntre(m, proxima))
        reservado += Math.min(falta, falta / mesesAte)
      } else {
        // Mês da data (ou atrasado): o valor é usado e a próxima ocorrência é agendada
        reservado = Math.max(0, reservado - g.valorEstimado)
        while (chaveIso(proxima) <= chave) {
          const [a, mm, d] = proxima.split('-').map(Number)
          const alvo = new Date(a, mm - 1 + g.intervaloMeses, 1)
          const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
          proxima = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
        }
      }
      totais[i] += reservado
    })
  })

  return totais.map((v) => Math.round(v * 100) / 100)
}
