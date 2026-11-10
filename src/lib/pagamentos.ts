import type { Despesa, Pagamento } from '../types'

/**
 * Aplica um pagamento a uma parcela (função pura, testável).
 * - Pagou a mais que o valor da parcela: a conta veio mais alta, então a parcela passa
 *   a valer o total pago (os relatórios mostram o valor pago de fato).
 * - Com `ajustarValor` (pagou a menos e "o valor da conta foi esse"): a parcela passa a
 *   valer o total pago e fica paga.
 * - Senão (pagamento parcial): soma; fica paga só quando atingir o valor da parcela.
 */
export function calcularPagamento(despesa: Despesa, numeroParcela: number, pagamento: Pagamento, ajustarValor?: boolean) {
  let novoValor: number | null = null
  const listaParcelas = despesa.listaParcelas.map((p) => {
    if (p.numero !== numeroParcela) return p
    const pagamentos = [...p.pagamentos, pagamento]
    const totalPago = parseFloat(pagamentos.reduce((s, pg) => s + pg.valor, 0).toFixed(2))
    const pagouAMais = totalPago > p.valor + 0.004
    if (ajustarValor || pagouAMais) {
      novoValor = totalPago
      return { ...p, valor: totalPago, pagamentos, pago: true }
    }
    return { ...p, pagamentos, pago: totalPago >= p.valor }
  })
  const ajuste = novoValor !== null ? {
    valorTotal: parseFloat(listaParcelas.reduce((s, p) => s + p.valor, 0).toFixed(2)),
    ...(despesa.parcelas === 1 ? { valorParcela: novoValor as number } : {}),
  } : {}
  return { listaParcelas, novoValor: novoValor as number | null, ajuste }
}
