import { CreditCard } from 'lucide-react'
import type { Despesa, CartaoCredito } from '../../types'

interface Props {
  despesas: Despesa[]
  cartoes: CartaoCredito[]
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function calcularComprometido(despesa: Despesa): number {
  if (despesa.pago) return 0
  if (despesa.parcelas > 1) {
    return despesa.listaParcelas.filter(p => !p.pago).reduce((s, p) => s + p.valor, 0)
  }
  return despesa.valorTotal ?? 0
}

export default function RelatorioCartoes({ despesas, cartoes }: Props) {
  if (cartoes.length === 0) {
    return (
      <div className="estado-vazio-rel">
        Nenhum cartão cadastrado.<br />
        Adicione seus cartões na aba <strong>Conta</strong>.
      </div>
    )
  }

  const cartoesDados = cartoes.map((cartao) => {
    const despesasCartao = despesas.filter(
      (d) => d.cartaoId === cartao.id && d.metodoPagamento === 'credito' && !d.pago
    )
    const comprometidoTotal = despesasCartao.reduce((s, d) => s + calcularComprometido(d), 0)

    const limite = cartao.limite ?? 0
    const disponivel = limite > 0 ? Math.max(0, limite - comprometidoTotal) : null
    const pctUsado = limite > 0 ? Math.min(100, (comprometidoTotal / limite) * 100) : null

    return { cartao, comprometidoTotal, disponivel, pctUsado }
  })

  return (
    <div className="rc-container">
      {cartoesDados.map(({ cartao, comprometidoTotal, disponivel, pctUsado }) => (
        <div key={cartao.id} className="rc-cartao">
          <div className="rc-cartao-header">
            <div className="rc-cartao-info">
              <span className="rc-cartao-nome">{cartao.nome}</span>
              <span className="rc-cartao-banco">{cartao.bandeira ? cartao.bandeira.toUpperCase() : 'Cartão de Crédito'}</span>
            </div>
            <CreditCard size={24} className="rc-emoji" />
          </div>

          {cartao.limite ? (
            <>
              <div className="rc-valores">
                <div className="rc-val-item">
                  <span className="rc-val-label">Limite</span>
                  <span className="rc-val-num">{fmt(cartao.limite)}</span>
                </div>
                <div className="rc-val-item">
                  <span className="rc-val-label">Comprometido</span>
                  <span className="rc-val-num rc-comprometido">{fmt(comprometidoTotal)}</span>
                </div>
                <div className="rc-val-item">
                  <span className="rc-val-label">Disponível</span>
                  <span className={`rc-val-num ${(disponivel ?? 0) > 0 ? 'rc-disponivel' : 'rc-esgotado'}`}>
                    {fmt(disponivel ?? 0)}
                  </span>
                </div>
              </div>

              <div className="rc-barra-wrap">
                <div
                  className={`rc-barra-fill ${(pctUsado ?? 0) > 80 ? 'rc-barra-alerta' : ''}`}
                  style={{ width: `${pctUsado ?? 0}%` }}
                />
              </div>
              <div className="rc-barra-labels">
                <span>{(pctUsado ?? 0).toFixed(0)}% usado</span>
                <span>{fmt(disponivel ?? 0)} livre</span>
              </div>
            </>
          ) : (
            <div className="rc-sem-limite">Sem limite cadastrado</div>
          )}

          <div className="rc-dias">
            <div className="rc-dia-item">
              <span className="rc-dia-label">Vencimento</span>
              <span className="rc-dia-val">
                {cartao.diaVencimento ? `dia ${cartao.diaVencimento}` : '—'}
              </span>
            </div>
            <div className="rc-dia-sep" />
            <div className="rc-dia-item">
              <span className="rc-dia-label">Melhor dia de compra</span>
              <span className="rc-dia-val">
                {cartao.melhorDiaCompra ? `dia ${cartao.melhorDiaCompra}` : '—'}
              </span>
            </div>
          </div>

        </div>
      ))}

      <style>{`
        /* Grade: dois (ou mais) cartões por linha conforme a largura; um por linha no celular */
        .rc-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 1rem; }

        .rc-cartao {
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 16px; padding: 1rem 1.1rem;
          display: flex; flex-direction: column; gap: 0.75rem; min-width: 0;
        }
        .rc-cartao-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .rc-cartao-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .rc-cartao-nome { color: #2D3436; font-size: 0.95rem; font-weight: 800; }
        .rc-cartao-banco { color: #95A5A6; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-emoji { color: #BDC3C7; flex-shrink: 0; }

        .rc-valores { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
        .rc-val-item { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .rc-val-label { color: #95A5A6; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-val-num { color: #2D3436; font-size: 0.85rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
        .rc-comprometido { color: #E67E22; }
        .rc-disponivel { color: #27AE60; }
        .rc-esgotado { color: #E74C3C; }

        .rc-barra-wrap { height: 8px; background: #E0E0E0; border-radius: 4px; overflow: hidden; }
        .rc-barra-fill { height: 100%; background: #C8A45A; border-radius: 4px; transition: width 0.4s; }
        .rc-barra-alerta { background: #E74C3C; }
        .rc-barra-labels { display: flex; justify-content: space-between; color: #95A5A6; font-size: 0.7rem; font-weight: 600; }

        .rc-sem-limite { color: #BDC3C7; font-size: 0.8rem; text-align: center; padding: 0.5rem; font-style: italic; }

        .rc-dias {
          display: flex; align-items: center; gap: 0;
          background: #fff; border: 1px solid #F1F2F6;
          border-radius: 10px; padding: 0.6rem 0.85rem;
        }
        .rc-dia-item { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
        .rc-dia-sep { width: 1px; background: #F1F2F6; align-self: stretch; margin: 0 0.75rem; }
        .rc-dia-label { color: #95A5A6; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-dia-val { color: #2D3436; font-size: 0.88rem; font-weight: 700; }

      `}</style>
    </div>
  )
}
