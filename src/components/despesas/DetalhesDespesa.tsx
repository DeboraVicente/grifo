import { useState } from 'react'
import { CheckCircle2, Clock, Pencil, Trash2, RefreshCw, X, ChevronLeft, ChevronRight, FastForward } from 'lucide-react'
import type { Despesa, InfoFamilia } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'
import { criadorDaDespesa, etiquetaDespesa } from '../../lib/escopo'

interface Props {
  despesa: Despesa
  /** Nome do cartão (crédito) ou da conta */
  contaLabel?: string
  familia?: InfoFamilia
  /** Parcela que o usuário tocou (fica destacada) */
  parcelaFoco?: number
  onPagar: (numeroParcela: number) => void
  onRemoverPagamento: (numeroParcela: number, pagamentoId: string) => void
  onEditar: () => void
  onRemover: () => void
  /** Adiantar (parcelado) ou amortizar (financiamento) */
  onAdiantar?: () => void
}

const CATEGORIA_LABEL: Record<string, string> = {
  casa: 'Casa', pessoal: 'Pessoal', saude: 'Saúde', locomocao: 'Locomoção', beleza: 'Beleza',
  alimentacao: 'Alimentação', educacao: 'Educação', lazer: 'Lazer', presente: 'Presente', outros: 'Outros',
}
const METODO_LABEL: Record<string, string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', boleto: 'Boleto', dinheiro: 'Dinheiro',
}
/** Parcelas por página (paginação só aparece quando passa disso) */
const POR_PAGINA = 5
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

/** Conteúdo do diálogo que abre ao tocar numa despesa. */
export default function DetalhesDespesa({
  despesa: d, contaLabel, familia, parcelaFoco, onPagar, onRemoverPagamento, onEditar, onRemover, onAdiantar,
}: Props) {
  const parcelas = [...(d.listaParcelas ?? [])].sort((a, b) => a.numero - b.numero)
  const pagas = parcelas.filter((p) => p.pago).length
  const totalPago = parcelas.reduce((s, p) => s + (p.pagamentos ?? []).reduce((x, pg) => x + pg.valor, 0), 0)
  const temParte = d.minhaParte !== undefined && d.minhaParte !== null
  const etiqueta = etiquetaDespesa(d, familia)
  const nomeMembro = (uid: string) => familia?.membros.find((m) => m.uid === uid)?.nome ?? 'Membro'
  const foco = parcelas.find((p) => p.numero === parcelaFoco) ?? parcelas.find((p) => !p.pago)
  // Abre na página da parcela tocada (ou da próxima em aberto)
  const indiceFoco = foco ? parcelas.findIndex((p) => p.numero === foco.numero) : 0
  const [pagina, setPagina] = useState(Math.max(0, Math.floor(indiceFoco / POR_PAGINA)))
  const totalPaginas = Math.max(1, Math.ceil(parcelas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const parcelasPagina = parcelas.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA)
  const valorDestaque = d.parcelas > 1 ? (foco?.valor ?? d.valorParcela) : d.valorTotal

  const info: { label: string; valor: string }[] = [
    { label: 'Categoria', valor: CATEGORIA_LABEL[d.categoria] ?? d.categoria },
    { label: 'Pagamento', valor: `${METODO_LABEL[d.metodoPagamento] ?? d.metodoPagamento}${contaLabel ? ` · ${contaLabel}` : ''}` },
    { label: 'Tipo', valor: `${d.tipoGasto === 'fixo' ? 'Fixo' : 'Variável'}${d.tipo === 'financiamento' ? ' · Financiamento' : ''}` },
    ...(etiqueta ? [{ label: 'Escopo', valor: etiqueta.tipo === 'pessoal' ? 'Pessoal' : 'Família' }] : []),
    ...(etiqueta?.tipo === 'familiar' && familia ? [
      { label: 'Criado por', valor: nomeMembro(criadorDaDespesa(d, familia)) },
      { label: 'Pago por', valor: nomeMembro(d.pagoPor && familia.membros.some((m) => m.uid === d.pagoPor) ? d.pagoPor : familia.ownerUid) },
    ] : []),
    ...(d.dataCompra ? [{ label: 'Compra', valor: fmtData(d.dataCompra) }] : []),
    ...(d.parcelas > 1 ? [{ label: 'Valor total', valor: fmt(d.valorTotal) }] : []),
    ...(temParte ? [{ label: 'Sua parte', valor: fmt(d.minhaParte!) }] : []),
    ...(d.tipo === 'financiamento' && d.saldoDevedor != null ? [{ label: 'Saldo devedor', valor: fmt(d.saldoDevedor) }] : []),
    ...(totalPago > 0 ? [{ label: 'Já pago', valor: fmt(totalPago) }] : []),
  ]

  return (
    <div className="dd">
      <div className="dd-topo">
        <span className="dd-icone"><CategoryIcon categoria={d.categoria} size={22} color="#636e72" /></span>
        <div className="dd-valor">
          <span className="dd-valor-label">{d.parcelas > 1 ? `Parcela ${foco?.numero ?? 1} de ${d.parcelas}` : 'Valor'}</span>
          <strong>{fmt(valorDestaque)}</strong>
        </div>
        {d.pago
          ? <span className="dd-status pago"><CheckCircle2 size={12} /> Pago</span>
          : <span className="dd-status pendente"><Clock size={12} /> {pagas > 0 ? `${pagas}/${d.parcelas} pagas` : 'Pendente'}</span>}
      </div>

      {d.recorrente && (
        <div className="dd-aviso"><RefreshCw size={14} /> Despesa recorrente: cada mês é um lançamento.</div>
      )}

      <dl className="dd-info">
        {info.map((i) => <div key={i.label}><dt>{i.label}</dt><dd>{i.valor}</dd></div>)}
      </dl>

      {d.observacoes && <p className="dd-obs">{d.observacoes}</p>}

      <section className="dd-secao">
        <h3>{parcelas.length > 1 ? `Parcelas (${pagas}/${parcelas.length} pagas)` : 'Vencimento'}</h3>
        <ul className="dd-parcelas">
          {parcelasPagina.map((p) => {
            const pago = (p.pagamentos ?? []).reduce((s, pg) => s + pg.valor, 0)
            return (
              <li key={p.numero} className={`${p.pago ? 'paga' : ''} ${foco?.numero === p.numero ? 'foco' : ''}`}>
                <div className="dd-parc-linha">
                  <span className="dd-parc-info">
                    <span className="dd-parc-tit">{parcelas.length > 1 ? `${String(p.numero).padStart(2, '0')}/${String(d.parcelas).padStart(2, '0')} · ` : ''}{fmtData(p.dataVencimento)}</span>
                    <span className="dd-parc-sub">
                      {p.pago ? 'Paga' : pago > 0 ? `Pago ${fmt(pago)} · falta ${fmt(Math.max(0, p.valor - pago))}` : 'Em aberto'}
                    </span>
                  </span>
                  <span className="dd-parc-valor">{fmt(p.valor)}</span>
                  {!p.pago && (
                    <button type="button" className="dd-pagar" onClick={() => onPagar(p.numero)}>Pagar</button>
                  )}
                </div>
                {(p.pagamentos ?? []).length > 0 && (
                  <ul className="dd-pagamentos">
                    {p.pagamentos.map((pg) => (
                      <li key={pg.id}>
                        <span>{fmtData(pg.data)}{pg.observacao ? ` · ${pg.observacao}` : ''}</span>
                        <strong>{fmt(pg.valor)}</strong>
                        <button type="button" aria-label={`Desfazer pagamento de ${fmt(pg.valor)}`}
                          onClick={() => { if (confirm(`Desfazer o pagamento de ${fmt(pg.valor)}?`)) onRemoverPagamento(p.numero, pg.id) }}>
                          <X size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
        {totalPaginas > 1 && (
          <div className="dd-pag">
            <button type="button" onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual === 0} aria-label="Parcelas anteriores">
              <ChevronLeft size={16} />
            </button>
            <span>{paginaAtual * POR_PAGINA + 1}–{Math.min((paginaAtual + 1) * POR_PAGINA, parcelas.length)} de {parcelas.length}</span>
            <button type="button" onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual + 1 >= totalPaginas} aria-label="Próximas parcelas">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {onAdiantar && !d.pago && d.parcelas > 1 && (
        <button type="button" className="dd-btn adiantar" onClick={onAdiantar}>
          <FastForward size={15} /> {d.tipo === 'financiamento' ? 'Amortizar' : 'Adiantar parcelas'}
        </button>
      )}

      <div className="dd-rodape">
        <button type="button" className="dd-btn" onClick={onEditar}><Pencil size={15} /> Editar despesa</button>
        <button type="button" className="dd-btn perigo" onClick={onRemover} aria-label="Excluir despesa"><Trash2 size={15} /></button>
      </div>

      <style>{`
        .dd { display: flex; flex-direction: column; gap: 1.1rem; }
        .dd-topo { display: flex; align-items: center; gap: 0.85rem; }
        .dd-icone { width: 46px; height: 46px; border-radius: 14px; background: #F4F5F8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dd-valor { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .dd-valor-label { font-size: 0.7rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .dd-valor strong { font-size: 1.6rem; font-weight: 800; color: #2D3436; font-variant-numeric: tabular-nums; }
        .dd-status { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; padding: 3px 9px; font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
        .dd-status.pago { background: #E8F5E9; color: #27AE60; }
        .dd-status.pendente { background: #FFF5F5; color: #E74C3C; }
        .dd-aviso { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #8E44AD; background: rgba(142,68,173,0.06); border-radius: 10px; padding: 0.55rem 0.75rem; }
        .dd-info { margin: 0; display: flex; flex-direction: column; border: 1px solid #F1F2F6; border-radius: 14px; padding: 0 0.9rem; }
        .dd-info > div { display: flex; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid #F4F5F8; }
        .dd-info > div:last-child { border-bottom: none; }
        .dd-info dt { color: #95A5A6; font-size: 0.82rem; }
        .dd-info dd { margin: 0; color: #2D3436; font-size: 0.85rem; font-weight: 600; text-align: right; }
        .dd-obs { margin: 0; font-size: 0.85rem; color: #636E72; background: #F8F9FA; border-radius: 10px; padding: 0.65rem 0.8rem; white-space: pre-wrap; }
        .dd-secao { display: flex; flex-direction: column; gap: 0.5rem; }
        .dd-secao h3 { margin: 0; font-size: 0.72rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .dd-parcelas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
        .dd-pag { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding-top: 0.25rem; }
        .dd-pag span { font-size: 0.78rem; color: #95A5A6; font-variant-numeric: tabular-nums; }
        .dd-pag button { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #E6E9EE; background: #fff; color: #636E72; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .dd-pag button:disabled { opacity: 0.35; cursor: not-allowed; }
        .dd-parcelas > li { border: 1px solid #F1F2F6; border-radius: 12px; padding: 0.6rem 0.75rem; }
        .dd-parcelas > li.foco { border-color: #C8A45A; box-shadow: 0 0 0 3px rgba(200,164,90,0.08); }
        .dd-parcelas > li.paga { opacity: 0.6; }
        .dd-parc-linha { display: flex; align-items: center; gap: 0.6rem; }
        .dd-parc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .dd-parc-tit { font-size: 0.85rem; font-weight: 600; color: #2D3436; }
        .dd-parc-sub { font-size: 0.74rem; color: #95A5A6; }
        .dd-parc-valor { font-weight: 700; font-size: 0.88rem; color: #2D3436; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .dd-pagar { min-height: 36px; padding: 0 0.8rem; border: none; border-radius: 10px; background: rgba(200,164,90,0.14); color: #A8853F; font-family: inherit; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
        .dd-pagamentos { list-style: none; margin: 0.4rem 0 0; padding: 0.4rem 0 0; border-top: 1px dashed #EEF0F3; display: flex; flex-direction: column; gap: 0.2rem; }
        .dd-pagamentos li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: #636E72; }
        .dd-pagamentos li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dd-pagamentos li strong { color: #27AE60; font-variant-numeric: tabular-nums; }
        .dd-pagamentos li button { background: none; border: none; color: #BDC3C7; cursor: pointer; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .dd-pagamentos li button:hover { color: #E74C3C; background: #FFF5F5; }
        .dd-rodape { display: flex; gap: 0.5rem; padding-top: 0.25rem; }
        .dd-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px;
          border-radius: 12px; border: none; background: #F1F2F6; color: #2D3436;
          font-family: inherit; font-size: 0.88rem; font-weight: 700; cursor: pointer;
        }
        .dd-btn.adiantar { flex: none; background: rgba(200,164,90,0.1); color: #A8853F; }
        .dd-btn.perigo { flex: 0 0 52px; background: rgba(231,76,60,0.08); color: #C0392B; }
      `}</style>
    </div>
  )
}
