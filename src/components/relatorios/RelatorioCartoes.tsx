import { CreditCard, Clock } from 'lucide-react'
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
    const proprias = despesasCartao.filter(
      (d) => !d.paraAmigoId || d.statusCompartilhamento === 'aceito'
    )
    const pendentesAmigo = despesasCartao.filter(
      (d) => d.paraAmigoId && d.statusCompartilhamento === 'pendente'
    )

    const comprometidoProprio = proprias.reduce((s, d) => s + calcularComprometido(d), 0)
    const comprometidoPendente = pendentesAmigo.reduce((s, d) => s + calcularComprometido(d), 0)
    const comprometidoTotal = comprometidoProprio + comprometidoPendente

    const limite = cartao.limite ?? 0
    const disponivel = limite > 0 ? Math.max(0, limite - comprometidoTotal) : null
    const pctUsado = limite > 0 ? Math.min(100, (comprometidoTotal / limite) * 100) : null

    return { cartao, pendentesAmigo, comprometidoPendente, comprometidoTotal, disponivel, pctUsado }
  })

  return (
    <div className="rc-container">
      {cartoesDados.map(({ cartao, pendentesAmigo, comprometidoPendente, comprometidoTotal, disponivel, pctUsado }) => (
        <div key={cartao.id} className="rc-cartao">
          <div className="rc-cartao-header">
            <div className="rc-cartao-info">
              <span className="rc-cartao-nome">{cartao.nome}</span>
              <span className="rc-cartao-banco">{cartao.banco}{cartao.bandeira ? ` · ${cartao.bandeira.toUpperCase()}` : ''}</span>
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

          {comprometidoPendente > 0 && (
            <div className="rc-pendente-aviso">
              <Clock size={18} className="rc-pendente-icon" />
              <div>
                <span className="rc-pendente-titulo">
                  {fmt(comprometidoPendente)} aguardando aprovação
                </span>
                <span className="rc-pendente-sub">
                  {pendentesAmigo.length} despesa{pendentesAmigo.length > 1 ? 's' : ''} para amigo{pendentesAmigo.length > 1 ? 's' : ''} · já incluso no comprometido
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      <style>{`
        .rc-container { display: flex; flex-direction: column; gap: 1.25rem; }

        .rc-cartao {
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 16px; padding: 1.25rem;
          display: flex; flex-direction: column; gap: 1rem;
        }
        .rc-cartao-header { display: flex; align-items: flex-start; justify-content: space-between; }
        .rc-cartao-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .rc-cartao-nome { color: #2D3436; font-size: 1rem; font-weight: 800; }
        .rc-cartao-banco { color: #95A5A6; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-emoji { color: #BDC3C7; flex-shrink: 0; }

        .rc-valores { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; }
        .rc-val-item { display: flex; flex-direction: column; gap: 0.2rem; }
        .rc-val-label { color: #95A5A6; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-val-num { color: #2D3436; font-size: 0.9rem; font-weight: 800; }
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
          border-radius: 10px; padding: 0.75rem 1rem;
        }
        .rc-dia-item { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
        .rc-dia-sep { width: 1px; background: #F1F2F6; align-self: stretch; margin: 0 1rem; }
        .rc-dia-label { color: #95A5A6; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .rc-dia-val { color: #2D3436; font-size: 0.88rem; font-weight: 700; }

        .rc-pendente-aviso {
          display: flex; align-items: flex-start; gap: 0.75rem;
          background: rgba(243,156,18,0.08); border: 1px solid rgba(243,156,18,0.2);
          border-radius: 10px; padding: 0.85rem;
        }
        .rc-pendente-icon { color: #E67E22; flex-shrink: 0; display: flex; align-items: center; }
        .rc-pendente-titulo { display: block; color: #E67E22; font-size: 0.82rem; font-weight: 700; }
        .rc-pendente-sub { display: block; color: #95A5A6; font-size: 0.72rem; margin-top: 0.1rem; }
      `}</style>
    </div>
  )
}
