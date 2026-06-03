import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react'
import type { Despesa, CartaoCredito, Conta } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'

interface Props {
  despesas: Despesa[]
  cartoes: CartaoCredito[]
  contas: Conta[]
  onPagarParcela: (despesa: Despesa, numeroParcela: number) => void
}

type TabTipo = 'tudo' | 'recorrentes' | 'parcelados' | 'compartilhados'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAnterior(ano: number, mes: number) {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}
function mesProximo(ano: number, mes: number) {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

interface Linha {
  despesa: Despesa
  numeroParcela: number
  dataVencimento: string
  valorParcela: number
  pago: boolean
  contaLabel?: string
  metodoLabel: string
}

const ITENS_POR_PAGINA = 10

const METODO_LABEL: Record<string, string> = {
  credito: 'Crédito', debito: 'Débito', pix: 'Pix', boleto: 'Boleto', dinheiro: 'Dinheiro',
}

export default function TabelaDespesas({ despesas, cartoes, contas, onPagarParcela }: Props) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [tab, setTab] = useState<TabTipo>('tudo')
  const [pagina, setPagina] = useState(0)

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1

  const irAnterior = () => {
    const prev = mesAnterior(ano, mes)
    setAno(prev.ano); setMes(prev.mes); setPagina(0)
  }
  const irProximo = () => {
    const next = mesProximo(ano, mes)
    setAno(next.ano); setMes(next.mes); setPagina(0)
  }

  const chavesMes = [`${ano}-${String(mes).padStart(2, '0')}`]

  // Monta linhas: uma por parcela com vencimento no mês
  const todasLinhas: Linha[] = []
  for (const d of despesas) {
    const cartao = cartoes.find(c => c.id === d.cartaoId)
    const contaDoCartao = cartao?.contaId ? contas.find(c => c.id === cartao.contaId) : undefined
    const contaDireta = contas.find(c => c.id === d.contaId)
    // Prioridade: conta vinculada ao cartão > conta direta da despesa > nome do cartão
    const contaLabel = contaDoCartao?.nome ?? contaDireta?.nome ?? cartao?.nome
    const metodoLabel = METODO_LABEL[d.metodoPagamento] ?? d.metodoPagamento
    for (const p of d.listaParcelas ?? []) {
      if (chavesMes.some(k => p.dataVencimento.startsWith(k))) {
        const minhaParte = d.minhaParte
        const valorExibido = minhaParte
          ? parseFloat((minhaParte / d.parcelas).toFixed(2))
          : p.valor
        todasLinhas.push({
          despesa: d,
          numeroParcela: p.numero,
          dataVencimento: p.dataVencimento,
          valorParcela: valorExibido,
          pago: p.pago,
          contaLabel,
          metodoLabel,
        })
      }
    }
  }

  // Ordenação: não pagas primeiro, depois por vencimento
  todasLinhas.sort((a, b) => {
    if (a.pago !== b.pago) return a.pago ? 1 : -1
    return a.dataVencimento.localeCompare(b.dataVencimento)
  })

  // Filtragem por tab
  const linhasFiltradas = todasLinhas.filter((l) => {
    if (tab === 'recorrentes') return l.despesa.recorrente
    if (tab === 'parcelados') return l.despesa.parcelas > 1
    if (tab === 'compartilhados') return !!l.despesa.minhaParte
    return true
  })

  const totalPaginas = Math.ceil(linhasFiltradas.length / ITENS_POR_PAGINA)
  const linhasPagina = linhasFiltradas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA)

  const subtotal = linhasFiltradas.reduce((s, l) => s + l.valorParcela, 0)
  const subtotalPago = linhasFiltradas.filter(l => l.pago).reduce((s, l) => s + l.valorParcela, 0)
  const subtotalPendente = subtotal - subtotalPago

  const fmtData = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="tabela-wrapper">
      {/* Navegação de mês */}
      <div className="tabela-header">
        <div className="mes-nav">
          <button className="nav-btn" onClick={irAnterior}><ChevronLeft size={18} /></button>
          <span className="nav-label">{MESES_PT[mes - 1]} {ano}</span>
          <button className="nav-btn" onClick={irProximo} disabled={ehMesAtual}><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-row">
        {([
          { id: 'tudo', label: 'Tudo' },
          { id: 'recorrentes', label: 'Recorrentes' },
          { id: 'parcelados', label: 'Parcelados' },
          { id: 'compartilhados', label: 'Compartilhados' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'ativo' : ''}`}
            onClick={() => { setTab(id); setPagina(0) }}
          >
            {label}
          </button>
        ))}
      </div>

      {linhasFiltradas.length === 0 ? (
        <div className="tabela-vazio">
          Nenhum lançamento em {MESES_PT[mes - 1]} {ano}
          {tab !== 'tudo' ? ` para o filtro "${tab}"` : ''}.
        </div>
      ) : (
        <>
          <div className="tabela-scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <th className="col-desc">Descrição</th>
                  <th className="col-conta">Conta</th>
                  <th className="col-metodo">Método</th>
                  <th className="col-tipo">Tipo</th>
                  <th className="col-parcela">Parcela</th>
                  <th className="col-venc">Vencimento</th>
                  <th className="col-status">Status</th>
                  <th className="col-valor">Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhasPagina.map((l) => {
                  const d = l.despesa

                  return (
                    <tr key={`${d.id}-${l.numeroParcela}`} className={l.pago ? 'linha-paga' : ''}>
                      <td className="col-desc">
                        <div className="desc-cell">
                          <div className="desc-icon">
                            <CategoryIcon categoria={d.categoria} size={16} color="#636e72" />
                          </div>
                          <div className="desc-info">
                            <span className="desc-nome">{d.nome}</span>
                            {d.minhaParte && (
                              <span className="desc-parte">sua parte: {fmt(l.valorParcela)}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="col-conta">
                        {l.contaLabel
                          ? <span className="chip-conta">{l.contaLabel}</span>
                          : <span className="sem-conta">—</span>
                        }
                      </td>
                      <td className="col-metodo">
                        <span className={`metodo-label metodo-${d.metodoPagamento}`}>{l.metodoLabel}</span>
                      </td>
                      <td className="col-tipo">
                        <span className={`tipo-label ${d.tipoGasto}`}>{d.tipoGasto === 'fixo' ? 'Fixo' : 'Variável'}</span>
                      </td>
                      <td className="col-parcela">
                        {d.parcelas > 1
                          ? <span className="parcela-chip">{String(l.numeroParcela).padStart(2, '0')}/{String(d.parcelas).padStart(2, '0')}</span>
                          : <span className="sem-parcela">—</span>
                        }
                      </td>
                      <td className="col-venc">
                        <span className="data-venc">{fmtData(l.dataVencimento)}</span>
                      </td>
                      <td className="col-status">
                        {l.pago
                          ? <span className="badge-pago"><CheckCircle2 size={11} /> PAGO</span>
                          : <span className="badge-pendente"><Clock size={11} /> PENDENTE</span>
                        }
                      </td>
                      <td className="col-valor">
                        <div className="valor-cell">
                          <span className={`valor-principal ${l.pago ? 'pago' : ''}`}>
                            {fmt(d.minhaParte ? d.valorParcela : l.valorParcela)}
                          </span>
                          {d.minhaParte && (
                            <span className="valor-parte">Sua parte: {fmt(l.valorParcela)}</span>
                          )}
                          {!l.pago && (
                            <button className="btn-pagar-linha"
                              onClick={() => onPagarParcela(d, l.numeroParcela)}>
                              Pagar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé: subtotal + paginação */}
          <div className="tabela-footer">
            <div className="footer-contagem">
              Mostrando {pagina * ITENS_POR_PAGINA + 1}–{Math.min((pagina + 1) * ITENS_POR_PAGINA, linhasFiltradas.length)} de {linhasFiltradas.length} lançamentos
            </div>

            <div className="subtotais">
              <div className="subtotal-item">
                <span className="subtotal-label">Pago</span>
                <span className="subtotal-pago">{fmt(subtotalPago)}</span>
              </div>
              <div className="subtotal-item">
                <span className="subtotal-label">Pendente</span>
                <span className="subtotal-pendente">{fmt(subtotalPendente)}</span>
              </div>
              <div className="subtotal-item destaque">
                <span className="subtotal-label">Subtotal do Período</span>
                <span className="subtotal-total">{fmt(subtotal)}</span>
              </div>
            </div>
          </div>

          {totalPaginas > 1 && (
            <div className="paginacao">
              <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => (
                <button
                  key={i}
                  className={`pag-num ${pagina === i ? 'ativo' : ''}`}
                  onClick={() => setPagina(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="pag-btn" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      <style>{`
        .tabela-wrapper { display: flex; flex-direction: column; gap: 1rem; }

        .tabela-header { display: flex; align-items: center; justify-content: space-between; }
        .mes-nav { display: flex; align-items: center; gap: 0.75rem; }
        .nav-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 8px; cursor: pointer; color: #636E72; transition: all 0.15s;
        }
        .nav-btn:hover:not(:disabled) { background: #EDEEF0; border-color: #D5D8DC; }
        .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .nav-label { font-size: 0.95rem; font-weight: 700; color: #2D3436; min-width: 160px; text-align: center; }

        .tabs-row {
          display: flex; gap: 0; background: #F1F2F6; padding: 0.3rem;
          border-radius: 12px; align-self: flex-start;
        }
        .tab-btn {
          padding: 0.5rem 1rem; border: none; border-radius: 9px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          background: transparent; color: #7F8C8D; transition: all 0.2s; font-family: inherit;
          white-space: nowrap;
        }
        .tab-btn.ativo { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .tabela-vazio {
          text-align: center; color: #95A5A6; font-size: 0.88rem;
          padding: 3rem 1rem;
        }

        .tabela-scroll { overflow-x: auto; border-radius: 16px; border: 1px solid #F1F2F6; }

        .tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .tabela thead tr { background: #F8F9FA; border-bottom: 1px solid #F1F2F6; }
        .tabela th {
          padding: 0.85rem 1rem; color: #95A5A6;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; text-align: left; white-space: nowrap;
        }
        .tabela th.col-valor { text-align: right; }

        .tabela tbody tr { border-bottom: 1px solid #F8F9FA; transition: background 0.1s; }
        .tabela tbody tr:last-child { border-bottom: none; }
        .tabela tbody tr:hover { background: #FAFBFC; }
        .tabela tbody tr.linha-paga { opacity: 0.6; }

        .tabela td { padding: 0.9rem 1rem; vertical-align: middle; }
        .tabela td.col-valor { text-align: right; }

        .desc-cell { display: flex; align-items: center; gap: 0.75rem; }
        .desc-icon {
          width: 32px; height: 32px; background: #F8F9FA; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .desc-info { display: flex; flex-direction: column; }
        .desc-nome { font-weight: 600; color: #2D3436; font-size: 0.88rem; }
        .desc-parte { font-size: 0.7rem; color: #3498DB; font-weight: 600; }

        .chip-conta {
          display: inline-block; background: #F1F2F6; color: #636E72;
          border-radius: 6px; padding: 2px 8px; font-size: 0.72rem; font-weight: 600;
          white-space: nowrap;
        }
        .sem-conta { color: #BDC3C7; }

        .metodo-label { font-size: 0.72rem; font-weight: 600; color: #95A5A6; }
        .metodo-credito { color: #8E44AD; }
        .metodo-debito { color: #2980B9; }
        .metodo-pix { color: #27AE60; }
        .metodo-boleto { color: #E67E22; }
        .metodo-dinheiro { color: #27AE60; }

        .tipo-label { font-size: 0.75rem; font-weight: 600; }
        .tipo-label.fixo { color: #8E44AD; }
        .tipo-label.variavel { color: #636E72; }

        .parcela-chip {
          font-size: 0.72rem; font-weight: 700; color: #C8A45A;
          background: rgba(200,164,90,0.1); border-radius: 4px; padding: 2px 6px;
        }
        .sem-parcela { color: #BDC3C7; }

        .data-venc { font-size: 0.8rem; color: #636E72; font-variant-numeric: tabular-nums; }

        .badge-pago {
          display: inline-flex; align-items: center; gap: 3px;
          background: #E8F5E9; color: #27AE60;
          border-radius: 20px; padding: 3px 8px;
          font-size: 0.68rem; font-weight: 700; white-space: nowrap;
        }
        .badge-pendente {
          display: inline-flex; align-items: center; gap: 3px;
          background: #FFF5F5; color: #E74C3C;
          border-radius: 20px; padding: 3px 8px;
          font-size: 0.68rem; font-weight: 700; white-space: nowrap;
        }

        .valor-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .valor-principal { font-weight: 700; color: #2D3436; font-variant-numeric: tabular-nums; }
        .valor-principal.pago { text-decoration: line-through; color: #95A5A6; }
        .valor-parte { font-size: 0.7rem; color: #3498DB; font-weight: 600; }

        .btn-pagar-linha {
          background: rgba(200,164,90,0.1); color: #C8A45A; border: none;
          border-radius: 6px; padding: 2px 8px; font-size: 0.7rem; font-weight: 700;
          cursor: pointer; font-family: inherit; white-space: nowrap; transition: background 0.15s;
        }
        .btn-pagar-linha:hover { background: rgba(200,164,90,0.2); }

        .tabela-footer {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem; padding: 0.5rem 0;
        }
        .footer-contagem { font-size: 0.78rem; color: #95A5A6; }

        .subtotais { display: flex; align-items: center; gap: 1.5rem; }
        .subtotal-item { display: flex; flex-direction: column; align-items: flex-end; }
        .subtotal-item.destaque { border-left: 1px solid #F1F2F6; padding-left: 1.5rem; }
        .subtotal-label { font-size: 0.65rem; color: #95A5A6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .subtotal-pago { font-size: 0.9rem; font-weight: 700; color: #27AE60; font-variant-numeric: tabular-nums; }
        .subtotal-pendente { font-size: 0.9rem; font-weight: 700; color: #E74C3C; font-variant-numeric: tabular-nums; }
        .subtotal-total { font-size: 1.1rem; font-weight: 900; color: #2D3436; font-variant-numeric: tabular-nums; }

        .paginacao { display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
        .pag-btn {
          background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px;
          width: 34px; height: 34px; font-size: 1.1rem; cursor: pointer;
          color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center;
        }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-num {
          background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px;
          width: 34px; height: 34px; font-size: 0.82rem; cursor: pointer;
          color: #636e72; font-weight: 600; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .pag-num.ativo { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-num:hover:not(.ativo) { background: #F1F2F6; }

        @media (max-width: 700px) {
          .tabela th.col-tipo, .tabela td.col-tipo,
          .tabela th.col-metodo, .tabela td.col-metodo,
          .tabela th.col-conta, .tabela td.col-conta { display: none; }
          .tabs-row { overflow-x: auto; width: 100%; }
          .subtotais { gap: 0.75rem; }
          .subtotal-item.destaque { padding-left: 0.75rem; }
        }
      `}</style>
    </div>
  )
}
