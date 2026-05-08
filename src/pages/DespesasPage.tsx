import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useAmizades } from '../hooks/useAmizades'
import { useCartoes } from '../hooks/useCartoes'
import { useRateioRecebido, useCompartilhadoRecebido } from '../hooks/useRateio'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Despesa, DespesaForm as DespesaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | 'pagar-rateio' | null
type FiltroTipo = 'todas' | 'rateados' | 'pendentes' | 'parcialmente-pagas' | 'pagas' | 'rateados-pendente'

export default function DespesasPage() {
  const { user } = useAuthContext()
  const { despesas, loading, criar, editar, remover, pagarParcela, removerPagamento, adicionarAdiantamento } = useDespesas(user?.uid)
  const { amigos } = useAmizades(user?.uid, user?.email ?? '', user?.displayName ?? '')
  const { cartoes } = useCartoes(user?.uid)
  const { despesasRateadas, responderRateio, pagarParteRateio } = useRateioRecebido(user?.uid)
  const { despesasCompartilhadas, responderCompartilhamento } = useCompartilhadoRecebido(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('pendentes')
  const [pagina, setPagina] = useState(0)
  const ITENS_POR_PAGINA = 8

  useEffect(() => { setPagina(0) }, [filtro])

  const fecharModal = () => { setModal(null); setSelecionada(null) }

  // 1. Separa rateios por status do usuário
  const rateiosPendentes = despesasRateadas.filter((d) => {
    if (!d.rateio?.ativo) return false
    const participante = (d.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    return participante?.status === 'pendente'
  })

  // Rateios aceitos = despesas de outros que o usuário aceitou participar
  const rateiosAceitos = despesasRateadas.filter((d) => {
    if (!d.rateio?.ativo) return false
    const p = (d.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    return p?.status === 'aceito'
  })
  
  // 2. Lógica de Filtragem da Lista
  const despesasExibidas = (() => {
    if (filtro === 'rateados-pendente') return rateiosPendentes
    const proprias = despesas.filter((d) => {
      if (filtro === 'rateados') return d.rateio?.ativo && (d.rateio as any).participantes.some((p: any) => p.userId === user?.uid)
      if (filtro === 'pendentes') return !d.pago
      if (filtro === 'parcialmente-pagas') return !d.pago && (d.listaParcelas?.some(p => p.pago) ?? false)
      if (filtro === 'pagas') return d.pago
      return true
    })
    const aceitas = filtro === 'pagas' ? [] : rateiosAceitos.filter(d => !d.pago)
    return [...proprias, ...aceitas]
  })()

  // 3. Handlers
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

  const abrirPagarRateio = (d: Despesa) => { setSelecionada(d); setModal('pagar-rateio') }

  const handlePagarParteRateio = async (dados: { valor: number; data: string; observacao: string }) => {
    if (!selecionada || !user) return
    await pagarParteRateio(selecionada.id, selecionada, user.uid, dados)
    fecharModal()
  }

  const parcelaObj = selecionada?.listaParcelas?.find((p) => p.numero === parcelaSelecionada)
  const totalPagoParcela = parcelaObj?.pagamentos?.reduce((s, p) => s + p.valor, 0) ?? 0
  const valorRestanteParcela = (parcelaObj?.valor ?? 0) - totalPagoParcela

  const meuParticipanteSelecionado = selecionada?.rateio?.ativo
    ? (selecionada.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    : null
  const totalPagoRateioSelecionado = (meuParticipanteSelecionado?.pagamentos ?? [])
    .reduce((s: number, p: any) => s + p.valor, 0)
  const valorRestanteRateioSelecionado = Math.max(
    0,
    (meuParticipanteSelecionado?.valorDevido ?? 0) - totalPagoRateioSelecionado
  )

  return (
    <div className="despesas-page">
      {/* Header com Filtros e Notificação */}
      <div className="page-header">
        <div className="filtros">
          {([
            { id: 'pendentes', label: 'Pendentes' },
            { id: 'parcialmente-pagas', label: 'Parc. pagas' },
            { id: 'rateados', label: 'Rateados' },
            { id: 'rateados-pendente', label: 'Rateados pend.' },
            { id: 'pagas', label: 'Pagas' },
            { id: 'todas', label: 'Todas' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              className={`filtro-btn ${filtro === id ? 'active' : ''}`}
              onClick={() => setFiltro(id)}
            >
              {label}
              {id === 'rateados-pendente' && rateiosPendentes.length > 0 && (
                <span className="notification-badge">{rateiosPendentes.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* Despesas pagas por amigo para mim — pendentes de aprovação */}
      {despesasCompartilhadas.filter(d => d.statusCompartilhamento === 'pendente').map((d) => (
        <div key={d.id} className="compartilhado-banner">
          <div className="comp-left">
            <span className="comp-icon"><CreditCard size={22} /></span>
            <div>
              <span className="comp-titulo">{d.nome}</span>
              <span className="comp-sub">
                Pago no cartão por {d.userId} · {d.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                {d.parcelas > 1 ? ` · ${d.parcelas}x` : ''}
              </span>
            </div>
          </div>
          <div className="comp-acoes">
            <button className="comp-aceitar" onClick={() => responderCompartilhamento(d.id, 'aceito')}>Aceitar</button>
            <button className="comp-recusar" onClick={() => responderCompartilhamento(d.id, 'recusado')}>Recusar</button>
          </div>
        </div>
      ))}

      {/* Listagem de Despesas */}
      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : despesasExibidas.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhuma despesa {filtro === 'todas' ? 'registrada' : filtro === 'rateados-pendente' ? 'pendente de aprovação' : filtro === 'parcialmente-pagas' ? 'parcialmente paga' : filtro}</p>
          {filtro === 'todas' && (
            <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira despesa</button>
          )}
        </div>
      ) : (
        <>
          <div className="despesas-list">
            {despesasExibidas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA).map((d) => {
              const ehRateioPendente = rateiosPendentes.some((r) => r.id === d.id)
              const ehRateioAceito = rateiosAceitos.some((r) => r.id === d.id)
              const cartao = cartoes.find(c => c.id === d.cartaoId)
              const cartaoLabel = cartao ? `${cartao.nome} · ${cartao.banco}` : undefined
              return (
                <DespesaCard
                  key={d.id}
                  despesa={d}
                  cartaoLabel={cartaoLabel}
                  isRateadosPendente={ehRateioPendente}
                  isRateioAceito={ehRateioAceito}
                  meuUserId={user?.uid}
                  onEditar={() => { setSelecionada(d); setModal('editar') }}
                  onRemover={() => handleRemover(d)}
                  onPagarParcela={(num) => abrirPagarParcela(d, num)}
                  onRemoverPagamento={(num, pgId) => removerPagamento(d.id, num, pgId)}
                  onAdiantar={() => { setSelecionada(d); setModal('adiantar') }}
                  onAceitarRateio={(renda) => responderRateio(d.id, d, user!.uid, 'aceito', renda)}
                  onRecusarRateio={() => responderRateio(d.id, d, user!.uid, 'recusado')}
                  onPagarParteRateio={() => abrirPagarRateio(d)}
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

      {/* Modais */}
      {modal === 'criar' && (
        <Modal titulo="Nova despesa" onFechar={fecharModal}>
          <DespesaForm amigos={amigos} cartoes={cartoes} onSalvar={handleCriar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar despesa" onFechar={fecharModal}>
          <DespesaForm amigos={amigos} cartoes={cartoes} inicial={selecionada} onSalvar={handleEditar} onCancelar={fecharModal} />
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
      {modal === 'pagar-rateio' && selecionada && meuParticipanteSelecionado && (
        <Modal titulo="Pagar minha parte" onFechar={fecharModal}>
          <PagamentoForm tipo="pagamento" valorRestante={valorRestanteRateioSelecionado}
            onSalvar={handlePagarParteRateio} onCancelar={fecharModal} />
        </Modal>
      )}

      <style>{`
        .despesas-page { display: flex; flex-direction: column; gap: 1.5rem; }
        @media (max-width: 600px) {
          .page-header { flex-wrap: wrap; }
          .filtros { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .filtros::-webkit-scrollbar { display: none; }
          .compartilhado-banner { flex-direction: column; align-items: flex-start; }
          .comp-acoes { width: 100%; }
          .comp-aceitar, .comp-recusar { flex: 1; text-align: center; }
        }

        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .filtros { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 12px; }
        
        .filtro-btn {
          position: relative; background: transparent; border: none; color: #7f8c8d;
          border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
        }
        .filtro-btn.active { background: #FFFFFF; color: #C8A45A; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        
        .notification-badge {
          background: #E74C3C; color: white; font-size: 0.6rem; font-weight: 800;
          padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;
        }

        .btn-criar {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; box-shadow: 0 4px 12px rgba(200,164,90,0.25);
        }

        .compartilhado-banner {
          display: flex; align-items: center; justify-content: space-between;
          background: #FFFDF7; border: 1.5px solid rgba(200,164,90,0.3);
          border-radius: 14px; padding: 1rem 1.1rem; gap: 1rem;
        }
        .comp-left { display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0; }
        .comp-icon { display: flex; align-items: center; color: #C8A45A; flex-shrink: 0; }
        .comp-titulo { display: block; color: #2D3436; font-size: 0.9rem; font-weight: 700; }
        .comp-sub { display: block; color: #95A5A6; font-size: 0.75rem; margin-top: 0.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .comp-acoes { display: flex; gap: 0.5rem; flex-shrink: 0; }
        .comp-aceitar {
          background: rgba(39,174,96,0.1); color: #27AE60; border: none;
          border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: background 0.15s; font-family: inherit;
        }
        .comp-aceitar:hover { background: rgba(39,174,96,0.2); }
        .comp-recusar {
          background: rgba(231,76,60,0.08); color: #E74C3C; border: none;
          border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: background 0.15s; font-family: inherit;
        }
        .comp-recusar:hover { background: rgba(231,76,60,0.15); }

        .despesas-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.5rem 0; }
        .pag-btn { background: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 8px; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; color: #636e72; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .pag-btn:hover:not(:disabled) { background: #C8A45A; color: white; border-color: #C8A45A; }
        .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pag-info { font-size: 0.82rem; font-weight: 700; color: #2D3436; }
        .pag-total { font-weight: 400; color: #95A5A6; }
        .estado-vazio { text-align: center; padding: 4rem 1rem; color: #A4B0BE; }
        .estado-vazio span { font-size: 3rem; display: block; margin-bottom: 1rem; }
        .btn-criar-vazio { background: white; border: 1px solid #E0E0E0; color: #777; border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; cursor: pointer; margin-top: 1rem; }
      `}</style>
    </div>
  )
}