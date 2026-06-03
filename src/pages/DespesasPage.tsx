import { useState } from 'react'
import { LayoutGrid, TableProperties } from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useCartoes } from '../hooks/useCartoes'
import { useContas } from '../hooks/useContas'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import TabelaDespesas from '../components/despesas/TabelaDespesas'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Despesa, DespesaForm as DespesaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | null
type FiltroTipo = 'pendentes' | 'parcialmente-pagas' | 'pagas' | 'todas'
type Visualizacao = 'cards' | 'tabela'

export default function DespesasPage() {
  const { user } = useAuthContext()
  const { despesas, loading, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento } = useDespesas(user?.uid)
  const { cartoes } = useCartoes(user?.uid)
  const { contas } = useContas(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('pendentes')
  const [pagina, setPagina] = useState(0)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('tabela')
  const ITENS_POR_PAGINA = 8

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

  // Agrupa recorrentes: mantém apenas o próximo não pago de cada série,
  // ou o mais recente se toda a série estiver paga
  const despesasAgrupadas = (() => {
    const vistas = new Map<string, Despesa>()
    const resultado: Despesa[] = []
    for (const d of despesas) {
      if (!d.recorrenciaId) { resultado.push(d); continue }
      const atual = vistas.get(d.recorrenciaId)
      if (!atual) { vistas.set(d.recorrenciaId, d); continue }
      // Prefere não paga com data mais próxima; se ambas pagas, a mais recente
      const prefereD = !d.pago && (atual.pago || d.data < atual.data)
      if (prefereD) vistas.set(d.recorrenciaId, d)
    }
    vistas.forEach((d) => resultado.push(d))
    return resultado.sort((a, b) => b.data.localeCompare(a.data))
  })()

  // Filtragem para visão de cards
  const despesasExibidas = despesasAgrupadas.filter((d) => {
    if (filtro === 'pendentes') return !d.pago
    if (filtro === 'parcialmente-pagas') return !d.pago && (d.listaParcelas?.some(p => p.pago) ?? false)
    if (filtro === 'pagas') return d.pago
    return true
  })

  return (
    <div className="despesas-page">
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Despesas</h1>
        </div>

        <div className="filtros-wrap">
          {visualizacao === 'cards' && (
            <div className="filtros">
              {([
                { id: 'pendentes', label: 'Pendentes' },
                { id: 'parcialmente-pagas', label: 'Parc. pagas' },
                { id: 'pagas', label: 'Pagas' },
                { id: 'todas', label: 'Todas' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  className={`filtro-btn ${filtro === id ? 'active' : ''}`}
                  onClick={() => { setFiltro(id); setPagina(0) }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="header-acoes">
          <div className="toggle-view">
            <button
              className={`toggle-btn ${visualizacao === 'cards' ? 'ativo' : ''}`}
              onClick={() => setVisualizacao('cards')}
              title="Ver cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`toggle-btn ${visualizacao === 'tabela' ? 'ativo' : ''}`}
              onClick={() => setVisualizacao('tabela')}
              title="Ver tabela mensal"
            >
              <TableProperties size={16} />
            </button>
          </div>
          <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
        </div>
      </div>

      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : visualizacao === 'tabela' ? (
        <TabelaDespesas
          despesas={despesas}
          cartoes={cartoes}
          contas={contas}
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
              const cartaoLabel = cartao ? cartao.nome : undefined
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
        <Modal
          titulo={selecionada.tipo === 'financiamento' ? 'Registrar amortização' : 'Registrar adiantamento'}
          onFechar={fecharModal}
        >
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
        .despesas-page { display: flex; flex-direction: column; gap: 1.5rem; }

        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .page-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; }
        .filtros-wrap { flex: 1; min-width: 0; }
        .filtros { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 12px; width: fit-content; }
        .filtro-btn {
          position: relative; background: transparent; border: none; color: #7f8c8d;
          border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .filtro-btn.active { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .header-acoes { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

        .toggle-view {
          display: flex; align-items: center;
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 10px; padding: 3px; gap: 2px;
        }
        .toggle-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 7px;
          border: none; background: transparent; color: #95A5A6;
          cursor: pointer; transition: all 0.15s;
        }
        .toggle-btn:hover { color: #636E72; }
        .toggle-btn.ativo { background: #FFFFFF; color: #2D3436; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        .btn-criar {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; box-shadow: 0 4px 12px rgba(200,164,90,0.25);
          white-space: nowrap; font-family: inherit;
        }

        .despesas-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.5rem 0; }
        .pag-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-info { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .pag-total { font-weight: 400; color: #95A5A6; }

        .estado-vazio { text-align: center; padding: 4rem 1rem; color: #A4B0BE; }
        .btn-criar-vazio { background: white; border: 1px solid #E0E0E0; color: #777; border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; cursor: pointer; margin-top: 1rem; }

        @media (max-width: 600px) {
          .page-header { flex-wrap: wrap; }
          .filtros { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .filtros::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  )
}
