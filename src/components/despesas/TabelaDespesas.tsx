import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import type { Despesa, CartaoCredito, Conta } from '../../types'
import CategoryIcon from '../ui/CategoryIcon'

interface Props {
  despesas: Despesa[]
  cartoes: CartaoCredito[]
  contas: Conta[]
  onPagarParcela: (despesa: Despesa, numeroParcela: number) => void
}

type TabTipo = 'tudo' | 'recorrentes' | 'parcelados' | 'compartilhados'
type ColOrdem = 'descricao' | 'conta' | 'metodo' | 'tipo' | 'vencimento' | 'status' | 'valor'
type DirOrdem = 'asc' | 'desc'

interface Filtros {
  status: 'todos' | 'pago' | 'pendente'
  tipo: 'todos' | 'fixo' | 'variavel'
  metodo: 'todos' | string
  conta: 'todos' | string
}

const FILTROS_VAZIOS: Filtros = { status: 'todos', tipo: 'todos', metodo: 'todos', conta: 'todos' }

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

function IconeOrdem({ col, ordemCol, ordemDir }: { col: ColOrdem; ordemCol: ColOrdem; ordemDir: DirOrdem }) {
  if (ordemCol !== col) return <ChevronsUpDown size={13} style={{ opacity: 0.3 }} />
  return ordemDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
}

export default function TabelaDespesas({ despesas, cartoes, contas, onPagarParcela }: Props) {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [tab, setTab] = useState<TabTipo>('tudo')
  const [pagina, setPagina] = useState(0)
  const [ordemCol, setOrdemCol] = useState<ColOrdem>('status')
  const [ordemDir, setOrdemDir] = useState<DirOrdem>('asc')
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)

  const maxVencimento = useMemo(() => {
    let maxAno = hoje.getFullYear()
    let maxMes = hoje.getMonth() + 1
    for (const d of despesas) {
      for (const p of d.listaParcelas ?? []) {
        const [a, m] = p.dataVencimento.split('-').map(Number)
        if (a > maxAno || (a === maxAno && m > maxMes)) { maxAno = a; maxMes = m }
      }
    }
    return { ano: maxAno, mes: maxMes }
  }, [despesas])

  const ehUltimoMes = ano === maxVencimento.ano && mes === maxVencimento.mes

  const irAnterior = () => { const p = mesAnterior(ano, mes); setAno(p.ano); setMes(p.mes); setPagina(0) }
  const irProximo = () => { const p = mesProximo(ano, mes); setAno(p.ano); setMes(p.mes); setPagina(0) }

  const toggleOrdem = (col: ColOrdem) => {
    if (ordemCol === col) setOrdemDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setOrdemCol(col); setOrdemDir('asc') }
    setPagina(0)
  }

  const setFiltro = <K extends keyof Filtros>(k: K, v: Filtros[K]) => {
    setFiltros(f => ({ ...f, [k]: v }))
    setPagina(0)
  }

  const temFiltroAtivo = Object.values(filtros).some(v => v !== 'todos')

  const chave = `${ano}-${String(mes).padStart(2, '0')}`

  // Monta linhas do mês
  const todasLinhas = useMemo<Linha[]>(() => {
    const linhas: Linha[] = []
    for (const d of despesas) {
      const cartao = cartoes.find(c => c.id === d.cartaoId)
      const contaDoCartao = cartao?.contaId ? contas.find(c => c.id === cartao.contaId) : undefined
      const contaDireta = contas.find(c => c.id === d.contaId)
      const contaLabel = contaDoCartao?.nome ?? contaDireta?.nome ?? cartao?.nome
      const metodoLabel = METODO_LABEL[d.metodoPagamento] ?? d.metodoPagamento
      for (const p of d.listaParcelas ?? []) {
        if (p.dataVencimento.startsWith(chave)) {
          const temMinhaParte = d.minhaParte !== undefined && d.minhaParte !== null
          const valorExibido = temMinhaParte
            ? parseFloat((d.minhaParte! / d.parcelas).toFixed(2))
            : p.valor
          linhas.push({ despesa: d, numeroParcela: p.numero, dataVencimento: p.dataVencimento, valorParcela: valorExibido, pago: p.pago, contaLabel, metodoLabel })
        }
      }
    }
    return linhas
  }, [despesas, cartoes, contas, chave])

  // Opções dinâmicas de filtro (com base nas linhas do mês)
  const metodosDisponiveis = useMemo(() =>
    [...new Set(todasLinhas.map(l => l.despesa.metodoPagamento))], [todasLinhas])
  const contasDisponiveis = useMemo(() =>
    [...new Set(todasLinhas.map(l => l.contaLabel).filter(Boolean) as string[])], [todasLinhas])

  // Filtragem por tab + filtros
  const linhasFiltradas = useMemo(() => {
    return todasLinhas.filter(l => {
      if (tab === 'recorrentes' && !l.despesa.recorrente) return false
      if (tab === 'parcelados' && l.despesa.parcelas <= 1) return false
      if (tab === 'compartilhados' && l.despesa.minhaParte === undefined || l.despesa.minhaParte === null) return false
      if (filtros.status === 'pago' && !l.pago) return false
      if (filtros.status === 'pendente' && l.pago) return false
      if (filtros.tipo !== 'todos' && l.despesa.tipoGasto !== filtros.tipo) return false
      if (filtros.metodo !== 'todos' && l.despesa.metodoPagamento !== filtros.metodo) return false
      if (filtros.conta !== 'todos' && l.contaLabel !== filtros.conta) return false
      return true
    })
  }, [todasLinhas, tab, filtros])

  // Ordenação
  const linhasOrdenadas = useMemo(() => {
    return [...linhasFiltradas].sort((a, b) => {
      let cmp = 0
      switch (ordemCol) {
        case 'descricao': cmp = a.despesa.nome.localeCompare(b.despesa.nome, 'pt-BR'); break
        case 'conta': cmp = (a.contaLabel ?? '').localeCompare(b.contaLabel ?? '', 'pt-BR'); break
        case 'metodo': cmp = a.metodoLabel.localeCompare(b.metodoLabel, 'pt-BR'); break
        case 'tipo': cmp = (a.despesa.tipoGasto ?? '').localeCompare(b.despesa.tipoGasto ?? '', 'pt-BR'); break
        case 'vencimento': cmp = a.dataVencimento.localeCompare(b.dataVencimento); break
        case 'status':
          cmp = Number(a.pago) - Number(b.pago)
          // Desempate por vencimento dentro do mesmo status
          if (cmp === 0) cmp = a.dataVencimento.localeCompare(b.dataVencimento)
          break
        case 'valor': cmp = a.valorParcela - b.valorParcela; break
      }
      return ordemDir === 'asc' ? cmp : -cmp
    })
  }, [linhasFiltradas, ordemCol, ordemDir])

  const totalPaginas = Math.ceil(linhasOrdenadas.length / ITENS_POR_PAGINA)
  const linhasPagina = linhasOrdenadas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA)

  const subtotal = linhasFiltradas.reduce((s, l) => s + l.valorParcela, 0)
  const subtotalPago = linhasFiltradas.filter(l => l.pago).reduce((s, l) => s + l.valorParcela, 0)
  const subtotalPendente = subtotal - subtotalPago

  const fmtData = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const Th = ({ col, label, className }: { col: ColOrdem; label: string; className?: string }) => (
    <th className={`sortable ${className ?? ''}`} onClick={() => toggleOrdem(col)}>
      <span className="th-inner">
        {label}
        <IconeOrdem col={col} ordemCol={ordemCol} ordemDir={ordemDir} />
      </span>
    </th>
  )

  return (
    <div className="tabela-wrapper">
      {/* Cabeçalho: nav mês + tabs */}
      <div className="tabela-topo">
        <div className="mes-nav">
          <button className="nav-btn" onClick={irAnterior}><ChevronLeft size={18} /></button>
          <span className="nav-label">{MESES_PT[mes - 1]} {ano}</span>
          <button className="nav-btn" onClick={irProximo} disabled={ehUltimoMes}><ChevronRight size={18} /></button>
        </div>
        <div className="tabs-row">
          {([
            { id: 'tudo', label: 'Tudo' },
            { id: 'recorrentes', label: 'Recorrentes' },
            { id: 'parcelados', label: 'Parcelados' },
            { id: 'compartilhados', label: 'Compartilhados' },
          ] as const).map(({ id, label }) => (
            <button key={id} className={`tab-btn ${tab === id ? 'ativo' : ''}`}
              onClick={() => { setTab(id); setPagina(0) }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-row">
        <select className="filtro-select" value={filtros.status} onChange={e => setFiltro('status', e.target.value as Filtros['status'])}>
          <option value="todos">Status: Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>

        <select className="filtro-select" value={filtros.tipo} onChange={e => setFiltro('tipo', e.target.value as Filtros['tipo'])}>
          <option value="todos">Tipo: Todos</option>
          <option value="fixo">Fixo</option>
          <option value="variavel">Variável</option>
        </select>

        {metodosDisponiveis.length > 1 && (
          <select className="filtro-select" value={filtros.metodo} onChange={e => setFiltro('metodo', e.target.value)}>
            <option value="todos">Método: Todos</option>
            {metodosDisponiveis.map(m => (
              <option key={m} value={m}>{METODO_LABEL[m] ?? m}</option>
            ))}
          </select>
        )}

        {contasDisponiveis.length > 1 && (
          <select className="filtro-select" value={filtros.conta} onChange={e => setFiltro('conta', e.target.value)}>
            <option value="todos">Conta: Todas</option>
            {contasDisponiveis.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {temFiltroAtivo && (
          <button className="btn-limpar" onClick={() => { setFiltros(FILTROS_VAZIOS); setPagina(0) }}>
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {linhasOrdenadas.length === 0 ? (
        <div className="tabela-vazio">
          {todasLinhas.length === 0
            ? `Nenhum lançamento em ${MESES_PT[mes - 1]} ${ano}.`
            : 'Nenhum resultado para os filtros selecionados.'}
        </div>
      ) : (
        <>
          <div className="tabela-scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <Th col="descricao" label="Descrição" className="col-desc" />
                  <Th col="conta" label="Conta" className="col-conta" />
                  <Th col="metodo" label="Método" className="col-metodo" />
                  <Th col="tipo" label="Tipo" className="col-tipo" />
                  <th className="col-parcela">Parcela</th>
                  <Th col="vencimento" label="Vencimento" className="col-venc" />
                  <Th col="status" label="Status" className="col-status" />
                  <Th col="valor" label="Valor" className="col-valor" />
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
                            {d.minhaParte !== undefined && d.minhaParte !== null && <span className="desc-parte">sua parte: {fmt(l.valorParcela)}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="col-conta">
                        {l.contaLabel ? <span className="chip-conta">{l.contaLabel}</span> : <span className="sem-valor">—</span>}
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
                          : <span className="sem-valor">—</span>}
                      </td>
                      <td className="col-venc">
                        <span className="data-venc">{fmtData(l.dataVencimento)}</span>
                      </td>
                      <td className="col-status">
                        {l.pago
                          ? <span className="badge-pago"><CheckCircle2 size={11} /> PAGO</span>
                          : <span className="badge-pendente"><Clock size={11} /> PENDENTE</span>}
                      </td>
                      <td className="col-valor">
                        <div className="valor-cell">
                          <span className={`valor-principal ${l.pago ? 'pago' : ''}`}>
                            {fmt(d.minhaParte !== undefined && d.minhaParte !== null ? d.valorParcela : l.valorParcela)}
                          </span>
                          {d.minhaParte !== undefined && d.minhaParte !== null && <span className="valor-parte">Sua parte: {fmt(l.valorParcela)}</span>}
                          {!l.pago && (
                            <button className="btn-pagar-linha" onClick={() => onPagarParcela(d, l.numeroParcela)}>
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

          <div className="tabela-footer">
            <div className="footer-esq">
              <span className="footer-contagem">
                Mostrando {pagina * ITENS_POR_PAGINA + 1}–{Math.min((pagina + 1) * ITENS_POR_PAGINA, linhasOrdenadas.length)} de {linhasOrdenadas.length} lançamentos
              </span>
              {totalPaginas > 1 && (
                <div className="paginacao">
                  <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>‹</button>
                  {Array.from({ length: totalPaginas }, (_, i) => (
                    <button key={i} className={`pag-num ${pagina === i ? 'ativo' : ''}`} onClick={() => setPagina(i)}>{i + 1}</button>
                  ))}
                  <button className="pag-btn" disabled={pagina + 1 >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
                </div>
              )}
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
        </>
      )}

      <style>{`
        .tabela-wrapper { display: flex; flex-direction: column; gap: 1rem; }

        .tabela-topo { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }

        .mes-nav { display: flex; align-items: center; gap: 0.75rem; }
        .nav-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 8px; cursor: pointer; color: #636E72; transition: all 0.15s;
        }
        .nav-btn:hover:not(:disabled) { background: #EDEEF0; border-color: #D5D8DC; }
        .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .nav-label { font-size: 0.95rem; font-weight: 700; color: #2D3436; min-width: 160px; text-align: center; }

        .tabs-row { display: flex; gap: 0; background: #F1F2F6; padding: 0.3rem; border-radius: 12px; }
        .tab-btn {
          padding: 0.5rem 1rem; border: none; border-radius: 9px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          background: transparent; color: #7F8C8D; transition: all 0.2s; font-family: inherit; white-space: nowrap;
        }
        .tab-btn.ativo { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        /* Filtros */
        .filtros-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .filtro-select {
          background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 8px;
          color: #2D3436; padding: 0.45rem 0.75rem; font-size: 0.78rem; font-weight: 600;
          outline: none; cursor: pointer; font-family: inherit; transition: all 0.15s;
          appearance: none; -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2395A5A6' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center; padding-right: 28px;
        }
        .filtro-select:focus, .filtro-select:hover { border-color: #C8A45A; background-color: #fff; }

        .btn-limpar {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(231,76,60,0.08); color: #E74C3C;
          border: 1px solid rgba(231,76,60,0.2); border-radius: 8px;
          padding: 0.45rem 0.75rem; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .btn-limpar:hover { background: rgba(231,76,60,0.15); }

        .tabela-vazio { text-align: center; color: #95A5A6; font-size: 0.88rem; padding: 3rem 1rem; }

        .tabela-scroll { overflow-x: auto; border-radius: 16px; border: 1px solid #F1F2F6; }

        .tabela { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .tabela thead tr { background: #F8F9FA; border-bottom: 1px solid #F1F2F6; }
        .tabela th {
          padding: 0.85rem 1rem; color: #95A5A6;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; text-align: left; white-space: nowrap;
        }
        .tabela th.col-valor { text-align: right; }
        .tabela th.sortable { cursor: pointer; user-select: none; }
        .tabela th.sortable:hover { color: #636E72; background: #F1F2F6; }
        .th-inner { display: inline-flex; align-items: center; gap: 4px; }

        .tabela tbody tr { border-bottom: 1px solid #F8F9FA; transition: background 0.1s; }
        .tabela tbody tr:last-child { border-bottom: none; }
        .tabela tbody tr:hover { background: #FAFBFC; }
        .tabela tbody tr.linha-paga { opacity: 0.6; }

        .tabela td { padding: 0.9rem 1rem; vertical-align: middle; }
        .tabela td.col-valor { text-align: right; }

        .desc-cell { display: flex; align-items: center; gap: 0.75rem; }
        .desc-icon { width: 32px; height: 32px; background: #F8F9FA; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .desc-info { display: flex; flex-direction: column; }
        .desc-nome { font-weight: 600; color: #2D3436; font-size: 0.88rem; }
        .desc-parte { font-size: 0.7rem; color: #3498DB; font-weight: 600; }

        .chip-conta { display: inline-block; background: #F1F2F6; color: #636E72; border-radius: 6px; padding: 2px 8px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
        .sem-valor { color: #BDC3C7; }

        .metodo-label { font-size: 0.72rem; font-weight: 600; }
        .metodo-credito { color: #8E44AD; }
        .metodo-debito { color: #2980B9; }
        .metodo-pix { color: #27AE60; }
        .metodo-boleto { color: #E67E22; }
        .metodo-dinheiro { color: #27AE60; }

        .tipo-label { font-size: 0.75rem; font-weight: 600; }
        .tipo-label.fixo { color: #8E44AD; }
        .tipo-label.variavel { color: #636E72; }

        .parcela-chip { font-size: 0.72rem; font-weight: 700; color: #C8A45A; background: rgba(200,164,90,0.1); border-radius: 4px; padding: 2px 6px; }

        .data-venc { font-size: 0.8rem; color: #636E72; font-variant-numeric: tabular-nums; }

        .badge-pago { display: inline-flex; align-items: center; gap: 3px; background: #E8F5E9; color: #27AE60; border-radius: 20px; padding: 3px 8px; font-size: 0.68rem; font-weight: 700; white-space: nowrap; }
        .badge-pendente { display: inline-flex; align-items: center; gap: 3px; background: #FFF5F5; color: #E74C3C; border-radius: 20px; padding: 3px 8px; font-size: 0.68rem; font-weight: 700; white-space: nowrap; }

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

        /* Rodapé */
        .tabela-footer { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 0.5rem 0; }
        .footer-esq { display: flex; flex-direction: column; gap: 0.5rem; }
        .footer-contagem { font-size: 0.78rem; color: #95A5A6; }

        .subtotais { display: flex; align-items: center; gap: 1.5rem; }
        .subtotal-item { display: flex; flex-direction: column; align-items: flex-end; }
        .subtotal-item.destaque { border-left: 1px solid #F1F2F6; padding-left: 1.5rem; }
        .subtotal-label { font-size: 0.65rem; color: #95A5A6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .subtotal-pago { font-size: 0.9rem; font-weight: 700; color: #27AE60; font-variant-numeric: tabular-nums; }
        .subtotal-pendente { font-size: 0.9rem; font-weight: 700; color: #E74C3C; font-variant-numeric: tabular-nums; }
        .subtotal-total { font-size: 1.1rem; font-weight: 900; color: #2D3436; font-variant-numeric: tabular-nums; }

        .paginacao { display: flex; align-items: center; gap: 0.4rem; }
        .pag-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 32px; height: 32px; font-size: 1.1rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-num { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 32px; height: 32px; font-size: 0.82rem; cursor: pointer; color: #636e72; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .pag-num.ativo { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-num:hover:not(.ativo) { background: #F1F2F6; }

        @media (max-width: 700px) {
          .tabela th.col-tipo, .tabela td.col-tipo,
          .tabela th.col-metodo, .tabela td.col-metodo,
          .tabela th.col-conta, .tabela td.col-conta { display: none; }
          .tabs-row { overflow-x: auto; }
          .filtros-row { overflow-x: auto; flex-wrap: nowrap; }
          .subtotais { gap: 0.75rem; }
          .subtotal-item.destaque { padding-left: 0.75rem; }
          .tabela-topo { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  )
}
