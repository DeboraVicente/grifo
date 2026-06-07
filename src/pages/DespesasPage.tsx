import { useState, useMemo } from 'react'
import { LayoutGrid, TableProperties, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useCartoes } from '../hooks/useCartoes'
import { useContas } from '../hooks/useContas'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import TabelaDespesas, { type TabTipo } from '../components/despesas/TabelaDespesas'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Despesa, DespesaForm as DespesaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | null
type FiltroTipo = 'pendentes' | 'parcialmente-pagas' | 'pagas' | 'todas'
type Visualizacao = 'cards' | 'tabela'

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAnterior(ano: number, mes: number) {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 }
}
function mesProximo(ano: number, mes: number) {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

export default function DespesasPage() {
  const { user } = useAuthContext()
  const { despesas, loading, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento } = useDespesas(user?.uid)
  const { cartoes } = useCartoes(user?.uid)
  const { contas } = useContas(user?.uid)

  const hoje = new Date()
  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('pendentes')
  const [pagina, setPagina] = useState(0)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('tabela')

  // Estado do mês e tab (tabela)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [tab, setTab] = useState<TabTipo>('tudo')

  const ITENS_POR_PAGINA = 8

  // Mês máximo navegável
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

  const irAnterior = () => { const p = mesAnterior(ano, mes); setAno(p.ano); setMes(p.mes) }
  const irProximo = () => { const p = mesProximo(ano, mes); setAno(p.ano); setMes(p.mes) }

  const fecharModal = () => { setModal(null); setSelecionada(null) }

  const handleCriar = async (form: DespesaFormType) => { await criar(form); fecharModal() }
  const handleEditar = async (form: DespesaFormType) => {
    if (!selecionada) return
    await editar(selecionada.id, form)
    fecharModal()
  }
  const handleRemover = async (d: Despesa) => {
    if (!confirm(`Remover "${d.nome}"?`)) return
    await remover(d.id)
  }
  const handlePagarParcela = async (dados: { valor: number; data: string; observacao: string }) => {
    if (!selecionada) return
    await pagarParcela(selecionada.id, parcelaSelecionada, dados)
    fecharModal()
  }
  const handleAdiantar = async (dados: { valor: number; data: string; observacao: string; parcelasQuitadas?: number }) => {
    if (!selecionada) return
    await adicionarAdiantamento(selecionada.id, dados, dados.parcelasQuitadas)
    fecharModal()
  }
  const abrirPagarParcela = (d: Despesa, numeroParcela: number) => {
    setSelecionada(d); setParcelaSelecionada(numeroParcela); setModal('pagar')
  }

  const parcelaObj = selecionada?.listaParcelas?.find((p) => p.numero === parcelaSelecionada)
  const totalPagoParcela = parcelaObj?.pagamentos?.reduce((s, p) => s + p.valor, 0) ?? 0
  const valorRestanteParcela = (parcelaObj?.valor ?? 0) - totalPagoParcela

  // Agrupa recorrentes para visão cards
  const despesasAgrupadas = useMemo(() => {
    const vistas = new Map<string, Despesa>()
    const resultado: Despesa[] = []
    for (const d of despesas) {
      if (!d.recorrenciaId) { resultado.push(d); continue }
      const atual = vistas.get(d.recorrenciaId)
      if (!atual) { vistas.set(d.recorrenciaId, d); continue }
      const prefereD = !d.pago && (atual.pago || d.data < atual.data)
      if (prefereD) vistas.set(d.recorrenciaId, d)
    }
    vistas.forEach((d) => resultado.push(d))
    return resultado.sort((a, b) => b.data.localeCompare(a.data))
  }, [despesas])

  const despesasExibidas = despesasAgrupadas.filter((d) => {
    if (filtro === 'pendentes') return !d.pago
    if (filtro === 'parcialmente-pagas') return !d.pago && (d.listaParcelas?.some(p => p.pago) ?? false)
    if (filtro === 'pagas') return d.pago
    return true
  })

  return (
    <div className="despesas-page">

      {/* ── Linha 1: Título + nav mês (tabela) + toggle ── */}
      <div className="ph-row1">
        <h1 className="page-titulo">Despesas</h1>

        {visualizacao === 'tabela' && (
          <div className="mes-nav">
            <button className="nav-btn" onClick={irAnterior}><ChevronLeft size={16} /></button>
            <span className="nav-label">{MESES_PT[mes - 1]} {ano}</span>
            <button className="nav-btn" onClick={irProximo} disabled={ehUltimoMes}><ChevronRight size={16} /></button>
          </div>
        )}

        <div className="toggle-view">
          <button className={`toggle-btn ${visualizacao === 'cards' ? 'ativo' : ''}`} onClick={() => setVisualizacao('cards')} title="Cards">
            <LayoutGrid size={16} />
          </button>
          <button className={`toggle-btn ${visualizacao === 'tabela' ? 'ativo' : ''}`} onClick={() => setVisualizacao('tabela')} title="Tabela">
            <TableProperties size={16} />
          </button>
        </div>
      </div>

      {/* ── Linha 2: Tabs/Filtros + Nova ── */}
      <div className="ph-row2">
        {visualizacao === 'tabela' ? (
          <div className="tabs-nav">
            {([
              { id: 'tudo', label: 'Tudo' },
              { id: 'recorrentes', label: 'Recorrentes' },
              { id: 'parcelados', label: 'Parcelados' },
              { id: 'compartilhados', label: 'Compart.' },
            ] as const).map(({ id, label }) => (
              <button key={id} className={`tab-btn ${tab === id ? 'ativo' : ''}`}
                onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="filtros">
            {([
              { id: 'pendentes', label: 'Pendentes' },
              { id: 'parcialmente-pagas', label: 'Parc. pagas' },
              { id: 'pagas', label: 'Pagas' },
              { id: 'todas', label: 'Todas' },
            ] as const).map(({ id, label }) => (
              <button key={id} className={`filtro-btn ${filtro === id ? 'active' : ''}`}
                onClick={() => { setFiltro(id); setPagina(0) }}>
                {label}
              </button>
            ))}
          </div>
        )}

        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : visualizacao === 'tabela' ? (
        <TabelaDespesas
          despesas={despesas}
          cartoes={cartoes}
          contas={contas}
          ano={ano}
          mes={mes}
          tab={tab}
          onPagarParcela={abrirPagarParcela}
        />
      ) : despesasExibidas.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhuma despesa {filtro === 'todas' ? 'registrada' : filtro === 'parcialmente-pagas' ? 'parcialmente paga' : filtro}</p>
          {filtro === 'todas' && (
            <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira despesa</button>
          )}
        </div>
      ) : (
        <>
          <div className="despesas-list">
            {despesasExibidas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA).map((d) => {
              const cartao = cartoes.find(c => c.id === d.cartaoId)
              const conta = contas.find(c => c.id === d.contaId)
              // Crédito → nome do cartão; demais → nome da conta
              const cartaoLabel = cartao?.nome ?? conta?.nome
              return (
                <DespesaCard
                  key={d.id}
                  despesa={d}
                  cartaoLabel={cartaoLabel}
                  onEditar={() => { setSelecionada(d); setModal('editar') }}
                  onRemover={() => handleRemover(d)}
                  onPagarParcela={(num) => abrirPagarParcela(d, num)}
                  onRemoverPagamento={(num, pgId) => removerPagamento(d.id, num, pgId)}
                  onAdiantar={() => { setSelecionada(d); setModal('adiantar') }}
                />
              )
            })}
          </div>

          {despesasExibidas.length > ITENS_POR_PAGINA && (
            <div className="paginacao">
              <button className="pag-btn" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>‹</button>
              <span className="pag-info">
                {pagina + 1} / {Math.ceil(despesasExibidas.length / ITENS_POR_PAGINA)}
                <span className="pag-total"> · {despesasExibidas.length} despesas</span>
              </span>
              <button className="pag-btn" disabled={(pagina + 1) * ITENS_POR_PAGINA >= despesasExibidas.length} onClick={() => setPagina(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── Modais ── */}
      {modal === 'criar' && (
        <Modal titulo="Nova despesa" onFechar={fecharModal}>
          <DespesaForm cartoes={cartoes} contas={contas} onSalvar={handleCriar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar despesa" onFechar={fecharModal}>
          <DespesaForm cartoes={cartoes} contas={contas} inicial={selecionada} onSalvar={handleEditar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'pagar' && selecionada && parcelaObj && (
        <Modal titulo={`Parcela ${parcelaSelecionada}/${selecionada.parcelas}`} onFechar={fecharModal}>
          <PagamentoForm tipo="pagamento" valorRestante={valorRestanteParcela}
            onSalvar={handlePagarParcela} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'adiantar' && selecionada && (
        <Modal titulo={selecionada.tipo === 'financiamento' ? 'Registrar amortização' : 'Registrar adiantamento'} onFechar={fecharModal}>
          <PagamentoForm
            tipo="adiantamento"
            valorRestante={selecionada.tipo === 'financiamento' ? (selecionada.saldoDevedor ?? selecionada.valorTotal) : selecionada.valorTotal}
            isAmortizacao={selecionada.tipo === 'financiamento'}
            onSalvar={handleAdiantar}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      <style>{`
        .despesas-page { display: flex; flex-direction: column; gap: 1rem; }

        /* Linha 1 */
        .ph-row1 {
          display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
        }
        .page-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; flex: 1; }

        .mes-nav {
          display: flex; align-items: center; gap: 0.5rem;
          background: #FFFFFF; border: 1px solid #F1F2F6;
          border-radius: 12px; padding: 0.35rem 0.75rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .nav-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 8px;
          border: none; background: #F8F9FA;
          color: #C8A45A; cursor: pointer; font-size: 1.1rem;
          transition: background 0.15s;
        }
        .nav-btn:hover:not(:disabled) { background: #F1F2F6; }
        .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .nav-label { font-size: 0.85rem; font-weight: 600; color: #2D3436; min-width: 110px; text-align: center; }

        .toggle-view {
          display: flex; align-items: center;
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 10px; padding: 3px; gap: 2px;
        }
        .toggle-btn {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 7px;
          border: none; background: transparent; color: #95A5A6;
          cursor: pointer; transition: all 0.15s;
        }
        .toggle-btn:hover { color: #636E72; }
        .toggle-btn.ativo { background: #FFFFFF; color: #2D3436; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* Linha 2 */
        .ph-row2 { display: flex; align-items: center; gap: 0.75rem; }

        .tabs-nav {
          flex: 1; display: flex; gap: 0;
          background: #F1F2F6; padding: 0.3rem; border-radius: 12px;
          overflow-x: auto; scrollbar-width: none;
        }
        .tabs-nav::-webkit-scrollbar { display: none; }
        .tab-btn {
          padding: 0.45rem 0.9rem; border: none; border-radius: 9px;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          background: transparent; color: #7F8C8D; transition: all 0.2s;
          font-family: inherit; white-space: nowrap;
        }
        .tab-btn.ativo { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .filtros {
          flex: 1; display: flex; gap: 0;
          background: #F1F2F6; padding: 0.3rem; border-radius: 12px;
          overflow-x: auto; scrollbar-width: none;
        }
        .filtros::-webkit-scrollbar { display: none; }
        .filtro-btn {
          background: transparent; border: none; color: #7f8c8d;
          border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit;
        }
        .filtro-btn.active { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .btn-criar {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; box-shadow: 0 4px 12px rgba(200,164,90,0.25);
          white-space: nowrap; font-family: inherit; flex-shrink: 0;
        }

        .despesas-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.5rem 0; }
        .pag-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-info { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .pag-total { font-weight: 400; color: #95A5A6; }

        .estado-vazio { text-align: center; padding: 4rem 1rem; color: #A4B0BE; }
        .btn-criar-vazio { background: white; border: 1px solid #E0E0E0; color: #777; border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; cursor: pointer; margin-top: 1rem; font-family: inherit; }

        @media (max-width: 600px) {
          .ph-row1 { gap: 0.5rem; }
          .nav-label { min-width: 110px; font-size: 0.82rem; }
        }
      `}</style>
    </div>
  )
}
