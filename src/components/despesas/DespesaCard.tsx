import { Trash2, CheckCircle2, Pencil, SplitSquareHorizontal, ChevronRight } from 'lucide-react'
import type { Despesa, InfoFamilia } from '../../types'
import EtiquetaEscopo from '../familia/EtiquetaEscopo'
import CategoryIcon from '../ui/CategoryIcon'

const METODO_LABEL: Record<string, string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', dinheiro: 'Dinheiro',
}

interface Props {
  despesa: Despesa
  cartaoLabel?: string
  familia?: InfoFamilia
  /** Abre o diálogo com detalhes, parcelas e ações */
  onAbrir: () => void
  onEditar: () => void
  onRemover: () => void
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (data: string) =>
  new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export default function DespesaCard({
  despesa, cartaoLabel, familia, onAbrir, onEditar, onRemover,
}: Props) {
  const parcelasPagas = despesa.listaParcelas?.filter((p) => p.pago).length ?? 0
  const totalParcelas = despesa.parcelas
  const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0

  const proximaParcela = despesa.listaParcelas?.filter((p) => !p.pago)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0]
  const dataVencimento = proximaParcela?.dataVencimento ?? despesa.data
  const valorTotal = despesa.valorTotal ?? (despesa as any).valor ?? 0
  const valorParcela = despesa.valorParcela ?? valorTotal
  const isFinanciamento = despesa.tipo === 'financiamento'
  const saldoAtual = isFinanciamento ? (despesa.saldoDevedor ?? valorTotal) : valorTotal

  const restante = totalParcelas > 1 && !isFinanciamento && !despesa.pago
    ? (despesa.listaParcelas?.filter(p => !p.pago).reduce((s, p) => s + p.valor, 0) ?? 0)
    : 0

  const minhaParte = despesa.minhaParte
  const temMinhaParte = minhaParte !== undefined && minhaParte !== null
  const minhaPartePorParcela = temMinhaParte && totalParcelas > 1 ? minhaParte! / totalParcelas : minhaParte

  return (
    <div className={`despesa-card ${despesa.pago ? 'paga' : ''}`}>
      <div className="card-main" role="button" tabIndex={0} aria-label={`Abrir ${despesa.nome}`}
        onClick={onAbrir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } }}>
        <div className="card-icon">
          <CategoryIcon categoria={despesa.categoria} size={22} color="#636e72" />
        </div>

        <div className="card-info">
          <div className="card-nome">{despesa.nome}</div>
          <EtiquetaEscopo despesa={despesa} familia={familia} />
          <div className="card-meta">
            {despesa.dataCompra ? (
              <>
                <span className="meta-label-compra">compra</span>
                <span>{fmtData(despesa.dataCompra)}</span>
                <span className="dot">·</span>
                <span className="meta-label-vence">vence</span>
                <span>{fmtData(dataVencimento)}</span>
              </>
            ) : (
              <span>{fmtData(dataVencimento)}</span>
            )}
            <span className="dot">·</span>
            <span>{cartaoLabel ?? METODO_LABEL[despesa.metodoPagamento]}</span>
            {totalParcelas > 1 && (
              <><span className="dot">·</span>
                <span className="tag-parcela">{parcelasPagas}/{totalParcelas}</span></>
            )}
            {isFinanciamento && (
              <><span className="dot">·</span>
                <span className="tag-financiamento">financiamento</span></>
            )}
            {despesa.recorrente && (
              <><span className="dot">·</span>
                <span className="tag-recorrente">recorrente</span></>
            )}
            {temMinhaParte && (
              <><span className="dot">·</span>
                <span className="tag-minha-parte"><SplitSquareHorizontal size={10} /> parcial</span></>
            )}
          </div>
        </div>

        <div className="card-valor">
          <span className={despesa.pago ? 'riscado' : ''}>{fmt(saldoAtual)}</span>
          {temMinhaParte && !despesa.pago && (
            <span className="valor-minha-parte">
              sua parte: {fmt(minhaPartePorParcela ?? minhaParte!)}{totalParcelas > 1 ? '/mês' : ''}
            </span>
          )}
          {totalParcelas > 1 && !despesa.pago && !isFinanciamento && (
            <span className="valor-restante">{fmt(restante)} restante</span>
          )}
          {totalParcelas > 1 && !despesa.pago && (
            <span className="valor-parcela">{fmt(valorParcela)}/mês</span>
          )}
          {despesa.pago && <span className="badge-pago"><CheckCircle2 size={11} /> pago</span>}
        </div>

        <div className="card-btns-inline">
          <button className="card-btn-edit" title="Editar" onClick={(e) => { e.stopPropagation(); onEditar() }}>
            <Pencil size={13} />
          </button>
          <button className="card-btn-del" title="Remover" onClick={(e) => { e.stopPropagation(); onRemover() }}>
            <Trash2 size={13} />
          </button>
        </div>
        <ChevronRight size={16} className="card-seta" aria-hidden="true" />
      </div>

      {!despesa.pago && totalParcelas > 1 && (
        <div className="progresso-bar">
          <div className="progresso-fill" style={{ width: `${progresso}%` }} />
        </div>
      )}

      <style>{`
      .despesa-card {
        background: #FFFFFF; border: 1px solid #F1F2F6; border-radius: 16px;
        overflow: hidden; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }

      .card-main { display: flex; align-items: center; gap: 0.85rem; padding: 1.1rem 1rem; cursor: pointer; }
      .card-icon {
        width: 42px; height: 42px; background: #F8F9FA;
        border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }

      .card-info { flex: 1; min-width: 0; }
      .card-nome { font-size: 0.95rem; font-weight: 600; color: #2D3436; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .card-meta { display: flex; align-items: center; gap: 0.35rem; color: #95A5A6; font-size: 0.72rem; flex-wrap: wrap; }
      .dot { color: #D1D8E0; }
      .tag-parcela { font-size: 0.68rem; font-weight: 700; color: #C8A45A; background: rgba(200,164,90,0.1); border-radius: 4px; padding: 1px 5px; }
      .meta-label-compra { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #BDC3C7; }
      .meta-label-vence { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #C8A45A; }
      .tag-financiamento { color: #C8A45A; font-weight: 700; font-size: 0.68rem; background: rgba(200,164,90,0.1); border-radius: 4px; padding: 1px 5px; }
      .tag-recorrente { color: #8E44AD; font-weight: 700; font-size: 0.68rem; background: rgba(142,68,173,0.08); border-radius: 4px; padding: 1px 5px; }
      .tag-minha-parte { display: inline-flex; align-items: center; gap: 2px; color: #3498DB; font-weight: 700; font-size: 0.68rem; background: rgba(52,152,219,0.08); border-radius: 4px; padding: 1px 5px; }
      .badge-pago { display: inline-flex; align-items: center; gap: 3px; font-size: 0.68rem; font-weight: 700; color: #2ECC71; margin-top: 2px; }

      .card-valor { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
      .card-valor span:first-child { color: #2D3436; font-size: 1rem; font-weight: 800; }
      .valor-minha-parte { font-size: 0.7rem; color: #3498DB; font-weight: 700; }
      .valor-restante { font-size: 0.7rem; color: #C8A45A; font-weight: 700; }
      .valor-parcela { font-size: 0.7rem; color: #95A5A6; }
      .riscado { text-decoration: line-through; color: #95A5A6 !important; }

      .card-btns-inline { display: flex; gap: 0.3rem; flex-shrink: 0; }
      .card-btn-edit, .card-btn-del {
        background: #F8F9FA; border: none; border-radius: 7px;
        padding: 0.35rem 0.45rem; cursor: pointer; color: #95A5A6;
        display: flex; align-items: center; transition: all 0.15s; font-family: inherit;
      }
      .card-btn-edit:hover { background: #F1F2F6; color: #636E72; }
      .card-btn-del:hover { background: #FDECEA; color: #E74C3C; }

      .card-seta { color: #CED6E0; flex-shrink: 0; }
      .progresso-bar { height: 3px; background: #F1F2F6; }
      .progresso-fill { height: 100%; background: #C8A45A; transition: width 0.3s ease; }

      .card-detalhes { padding: 1rem 1.1rem; background: #FCFCFD; border-top: 1px solid #F1F2F6; display: flex; flex-direction: column; gap: 0.9rem; }
      .detalhe-obs { font-size: 0.82rem; color: #636E72; font-style: italic; background: #F8F9FA; border-radius: 8px; padding: 0.6rem 0.8rem; }
      .detalhe-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: #636E72; }
      .valor-gold { color: #C8A45A; font-weight: 700; }

      .minha-parte-box {
        background: rgba(52,152,219,0.05); border: 1px solid rgba(52,152,219,0.15);
        border-radius: 12px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem;
      }
      .mp-row { display: flex; justify-content: space-between; align-items: center; }
      .mp-label { font-size: 0.75rem; color: #95A5A6; }
      .mp-valor { font-size: 0.9rem; font-weight: 700; color: #3498DB; }
      .mp-valor-total { font-size: 0.82rem; color: #BDC3C7; }

      .acao-btn { flex: 1; background: #FFFFFF; border: 1px solid #E0E0E0; color: #636E72; border-radius: 10px; padding: 0.65rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; }
      .acao-adiantar { color: #C8A45A; border-color: rgba(200,164,90,0.3); background: rgba(200,164,90,0.05); }

      .saldo-devedor-box { background: #FFFDF7; border: 1px solid rgba(200,164,90,0.2); border-radius: 12px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .sd-row { display: flex; justify-content: space-between; align-items: center; }
      .sd-label { font-size: 0.75rem; color: #95A5A6; }
      .sd-valor { font-size: 1rem; font-weight: 800; color: #C8A45A; }
      .sd-valor-orig { font-size: 0.82rem; color: #BDC3C7; text-decoration: line-through; }
      .sd-valor-amortz { font-size: 0.82rem; font-weight: 700; color: #2ECC71; }

      .parcelas-lista { display: flex; flex-direction: column; gap: 0.4rem; }
      .parcelas-paginacao { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-top: 0.25rem; }
      .pp-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 6px; width: 28px; height: 28px; font-size: 1rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
      .pp-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
      .pp-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .pp-info { font-size: 0.7rem; color: #95A5A6; font-weight: 600; }

      .parcela-inline {
        display: flex; align-items: center; gap: 0.4rem;
        padding: 0.45rem 0.6rem; border-radius: 8px;
        background: #F8F9FA; font-size: 0.78rem; color: #2D3436;
      }
      .parcela-paga { opacity: 0.6; }
      .parcela-vencida { background: rgba(231,76,60,0.05); }
      .pi-icon { display: flex; align-items: center; flex-shrink: 0; }
      .pi-ok { color: #2ECC71; }
      .pi-pendente { color: #BDC3C7; }
      .pi-vencida { color: #E74C3C; }
      .pi-valor { font-weight: 700; flex-shrink: 0; }
      .pi-dot { color: #BDC3C7; flex-shrink: 0; }
      .pi-data { color: #636E72; flex-shrink: 0; }
      .pi-pg-data { color: #2ECC71; font-size: 0.72rem; flex-shrink: 0; }
      .pi-acao { margin-left: auto; flex-shrink: 0; }

      .btn-pagar-parcela {
        background: rgba(200,164,90,0.1); color: #C8A45A; border: none;
        border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.72rem; font-weight: 700;
        cursor: pointer; font-family: inherit; white-space: nowrap;
      }
      .btn-pagar-parcela:hover { background: rgba(200,164,90,0.2); }
      .btn-remover-pg {
        background: none; border: none; color: #BDC3C7;
        cursor: pointer; padding: 0.2rem; border-radius: 4px;
        display: flex; align-items: center; transition: color 0.15s; flex-shrink: 0;
      }
      .btn-remover-pg:hover { color: #E74C3C; }

      @media (max-width: 400px) {
        .card-main { gap: 0.5rem; padding: 0.9rem 0.75rem; }
        .card-icon { width: 36px; height: 36px; border-radius: 10px; }
        .card-nome { font-size: 0.88rem; }
        .card-btns-inline { gap: 0.2rem; }
      }
      `}</style>
    </div>
  )
}
