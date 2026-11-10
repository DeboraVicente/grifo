import type { Despesa, Receita, InfoFamilia } from '../types'
import { parcelasMes, receitasDoMes, valorDaParcela } from '../hooks/useRelatorios'

export interface DivisaoMembro {
  uid: string
  nome: string
  renda: number
  /** fração da renda familiar do mês (0–1) */
  proporcao: number
  /** quanto este membro deveria arcar das despesas familiares */
  cota: number
  /** quanto este membro efetivamente pagou */
  pagou: number
  /** pagou − cota: positivo = tem a receber, negativo = deve */
  saldo: number
}

export interface Transferencia { de: string; para: string; valor: number }

export interface DivisaoMes {
  totalDespesas: number
  totalRenda: number
  /** sem renda familiar no mês: a divisão cai para partes iguais */
  partesIguais: boolean
  membros: DivisaoMembro[]
  transferencias: Transferencia[]
}

const centavos = (v: number) => Math.round(v * 100) / 100

/** Valor da despesa que conta no mês (mesma regra do fluxo de caixa: respeita "minha parte"). */
function valorNoMes(d: Despesa, mes: number, ano: number): number {
  return parcelasMes(d, mes, ano).reduce((s, p) => s + valorDaParcela(d, p), 0)
}

/**
 * Divide as despesas familiares do mês entre os membros, proporcional à renda familiar
 * de cada um, e calcula quem deve transferir quanto para quem.
 * Itens sem "pago por"/"recebido por" (ou de quem saiu da família) contam para a dona.
 */
export function calcDivisao(
  despesasFamiliares: Despesa[],
  receitasFamiliares: Receita[],
  familia: InfoFamilia,
  mes: number,
  ano: number,
): DivisaoMes {
  const uids = new Set(familia.membros.map((m) => m.uid))
  const responsavel = (uid?: string) => (uid && uids.has(uid) ? uid : familia.ownerUid)

  const renda = new Map<string, number>()
  const pagou = new Map<string, number>()
  familia.membros.forEach((m) => { renda.set(m.uid, 0); pagou.set(m.uid, 0) })

  receitasDoMes(receitasFamiliares, mes, ano).forEach((r) => {
    const uid = responsavel(r.recebidoPor)
    renda.set(uid, (renda.get(uid) ?? 0) + r.valor)
  })

  let totalDespesas = 0
  despesasFamiliares.forEach((d) => {
    const valor = valorNoMes(d, mes, ano)
    if (valor <= 0) return
    totalDespesas += valor
    const uid = responsavel(d.pagoPor)
    pagou.set(uid, (pagou.get(uid) ?? 0) + valor)
  })

  const totalRenda = [...renda.values()].reduce((s, v) => s + v, 0)
  const partesIguais = totalRenda <= 0
  const n = familia.membros.length || 1

  const membros: DivisaoMembro[] = familia.membros.map((m) => {
    const r = renda.get(m.uid) ?? 0
    const proporcao = partesIguais ? 1 / n : r / totalRenda
    const cota = totalDespesas * proporcao
    const p = pagou.get(m.uid) ?? 0
    return { uid: m.uid, nome: m.nome || 'Membro', renda: r, proporcao, cota, pagou: p, saldo: p - cota }
  })

  // Acerto: quem deve paga quem tem a receber, do maior para o menor
  const devedores = membros.filter((m) => m.saldo < -0.005).map((m) => ({ uid: m.uid, v: -m.saldo })).sort((a, b) => b.v - a.v)
  const credores = membros.filter((m) => m.saldo > 0.005).map((m) => ({ uid: m.uid, v: m.saldo })).sort((a, b) => b.v - a.v)
  const transferencias: Transferencia[] = []
  let i = 0, j = 0
  while (i < devedores.length && j < credores.length) {
    const valor = Math.min(devedores[i].v, credores[j].v)
    if (valor >= 0.01) transferencias.push({ de: devedores[i].uid, para: credores[j].uid, valor: centavos(valor) })
    devedores[i].v -= valor
    credores[j].v -= valor
    if (devedores[i].v < 0.005) i++
    if (credores[j].v < 0.005) j++
  }

  return { totalDespesas, totalRenda, partesIguais, membros, transferencias }
}

/** Fração da renda familiar do mês que é de `uid` (partes iguais se ninguém lançou renda). */
export function proporcaoNoMes(
  uid: string,
  receitasFamiliares: Receita[],
  familia: InfoFamilia,
  mes: number,
  ano: number,
): number {
  const uids = new Set(familia.membros.map((m) => m.uid))
  if (!uids.has(uid)) return 1
  const responsavel = (u?: string) => (u && uids.has(u) ? u : familia.ownerUid)
  let total = 0
  let minha = 0
  receitasDoMes(receitasFamiliares, mes, ano).forEach((r) => {
    total += r.valor
    if (responsavel(r.recebidoPor) === uid) minha += r.valor
  })
  return total > 0 ? minha / total : 1 / (familia.membros.length || 1)
}

/**
 * Cópia das despesas familiares com cada parcela reduzida à cota de `uid`
 * (proporção da renda no mês de vencimento da parcela). Usada nas visões Tudo/Pessoal
 * do Início: "quanto desta despesa compromete a minha renda".
 */
export function aplicarCota(
  despesasFamiliares: Despesa[],
  proporcao: (mes: number, ano: number) => number,
): Despesa[] {
  return despesasFamiliares.map((d) => {
    const temParte = d.minhaParte !== undefined && d.minhaParte !== null
    const listaParcelas = d.listaParcelas.map((p) => {
      const dv = new Date(p.dataVencimento + 'T12:00:00')
      const base = temParte ? d.minhaParte! / d.parcelas : p.valor
      return { ...p, valor: centavos(base * proporcao(dv.getMonth(), dv.getFullYear())) }
    })
    const valorTotal = centavos(listaParcelas.reduce((s, p) => s + p.valor, 0))
    return {
      ...d,
      listaParcelas,
      valorTotal,
      valorParcela: listaParcelas[0]?.valor ?? 0,
      // A cota já considera "minha parte"; não aplicar de novo
      minhaParte: undefined,
    }
  })
}
