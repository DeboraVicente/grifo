import type { Despesa, GastoPrevisto } from '../types'
import { hojeISO, somarMeses } from './previstos'

/**
 * Gastos previstos entram nos relatórios como despesas pelo VALOR CHEIO no mês em que
 * vão acontecer (próxima data e as repetições seguintes, conforme o intervalo).
 *
 * Não há contagem dupla: ao concluir um previsto, ele vira uma despesa de verdade e a
 * próxima data avança, então a ocorrência concluída sai daqui.
 * Não entram no acerto da família (ninguém pagou ainda) — ver `origemPrevisto`.
 */
export function previstosComoDespesas(previstos: GastoPrevisto[], horizonteMeses = 24): Despesa[] {
  const limite = somarMeses(hojeISO(), horizonteMeses)
  return previstos
    .filter((g) => g.valorEstimado > 0 && g.proximaData && g.intervaloMeses >= 1)
    .map((g) => {
      const datas: string[] = []
      let data = g.proximaData
      while (data <= limite && datas.length < 240) {
        datas.push(data)
        data = somarMeses(data, g.intervaloMeses)
      }
      // Previsto com data além do horizonte ainda aparece na próxima ocorrência
      if (datas.length === 0) datas.push(g.proximaData)

      return {
        id: `previsto:${g.id}`,
        origemPrevisto: g.id,
        nome: g.nome,
        categoria: g.categoria,
        metodoPagamento: 'dinheiro',
        tipoGasto: 'fixo',
        tipo: 'padrao',
        parcelas: datas.length,
        valorTotal: g.valorEstimado * datas.length,
        valorParcela: g.valorEstimado,
        data: datas[0],
        escopo: 'familiar',
        pago: false,
        listaParcelas: datas.map((d, i) => ({
          numero: i + 1, valor: g.valorEstimado, dataVencimento: d, pago: false, pagamentos: [],
        })),
        adiantamentos: [],
        userId: g.userId,
        criadoEm: g.criadoEm,
        atualizadoEm: g.atualizadoEm,
      } satisfies Despesa
    })
}
