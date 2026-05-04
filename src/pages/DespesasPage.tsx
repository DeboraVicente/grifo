import { useState } from 'react'
import { useDespesas } from '../hooks/useDespesas'
import { useAmizades } from '../hooks/useAmizades'
import { useRateioRecebido } from '../hooks/useRateio'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Despesa, DespesaForm as DespesaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | null
type FiltroTipo = 'todas' | 'rateados' | 'pendentes' | 'pagas' | 'rateados-pendente' 

export default function DespesasPage() {
  const { user } = useAuthContext()
  const { despesas, loading, criar, editar, remover, pagarParcela, adicionarAdiantamento } = useDespesas(user?.uid)
  const { amigos } = useAmizades(user?.uid, user?.email ?? '', user?.displayName ?? '')
  const { despesasRateadas, responderRateio } = useRateioRecebido(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('todas')

  const fecharModal = () => { setModal(null); setSelecionada(null) }

  const rateiosPendentes = despesasRateadas.filter((d) => {
    if (!d.rateio?.ativo) return false
    const participante = (d.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    return participante?.status === 'pendente'
  })

  const despesasExibidas = (() => {
    if (filtro === 'rateados-pendente') return rateiosPendentes
    return despesas.filter((d) => {
      if (filtro === 'todas') return true
      if (filtro === 'rateados') return d.rateio?.ativo && (d.rateio as any).participantes.some((p: any) => p.userId === user?.uid)
      if (filtro === 'pendentes') return !d.pago
      if (filtro === 'pagas') return d.pago
      return true
    })
  })()

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
  const handleAdiantar = async (dados: { valor: number; data: string; observacao: string }) => {
    if (!selecionada) return
    await adicionarAdiantamento(selecionada.id, dados)
    fecharModal()
  }
  const abrirPagarParcela = (d: Despesa, numeroParcela: number) => {
    setSelecionada(d); setParcelaSelecionada(numeroParcela); setModal('pagar')
  }

  const agora = new Date()
  const mesAtual = agora.getMonth()
  const anoAtual = agora.getFullYear()

  const totalMesAtual = despesas.reduce((acc, d) => {
    if (!d.listaParcelas || d.listaParcelas.length === 0)
      return acc + (!d.pago ? (d.valorTotal ?? 0) : 0)
    return acc + d.listaParcelas
      .filter(p => {
        const dv = new Date(p.dataVencimento + 'T12:00:00')
        return !p.pago && dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual
      })
      .reduce((s, p) => s + p.valor, 0)
  }, 0)

  const totalRestanteFuturo = despesas.reduce((acc, d) => {
    if (d.pago) return acc
    if (!d.listaParcelas || d.listaParcelas.length === 0) return acc + (d.valorTotal ?? 0)
    return acc + d.listaParcelas.filter(p => !p.pago).reduce((s, p) => s + p.valor, 0)
  }, 0)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const parcelaObj = selecionada?.listaParcelas?.find((p) => p.numero === parcelaSelecionada)
  const totalPagoParcela = parcelaObj?.pagamentos?.reduce((s, p) => s + p.valor, 0) ?? 0
  const valorRestanteParcela = (parcelaObj?.valor ?? 0) - totalPagoParcela

  return (
    <div className="despesas-page">
      <div className="resumo-cards">
        <div className="resumo-card principal">
          <span className="resumo-label">Para pagar no mês</span>
          <span className="resumo-valor">{fmt(totalMesAtual)}</span>
          <div className="resumo-indicador">Vence em breve</div>
        </div>
        <div className="resumo-card secundario">
          <span className="resumo-label">Saldo devedor total</span>
          <span className="resumo-valor">{fmt(totalRestanteFuturo)}</span>
          <div className="resumo-status">Compromissos futuros</div>
        </div>
      </div>

      {/* Header com Filtros e Notificação */}
      <div className="page-header">
        <div className="filtros">
          {(['todas', 'rateados', 'pendentes', 'pagas', 'rateados-pendente'] as const).map((f) => (
            <button
              key={f}
              className={`filtro-btn ${filtro === f ? 'active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === 'rateados-pendente' ? 'Rateados pendentes' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'rateados-pendente' && rateiosPendentes.length > 0 && (
                <span className="notification-badge">{rateiosPendentes.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* Listagem de Despesas */}
      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : despesasExibidas.length === 0 ? (
        <div className="estado-vazio">
          <p>Nenhuma despesa {filtro !== 'todas' ? (filtro === 'rateados-pendente' ? 'pendente de aprovação' : filtro) : 'registrada'}</p>
          {filtro === 'todas' && (
            <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira despesa</button>
          )}
        </div>
      ) : (
        <div className="despesas-list">
          {despesasExibidas.map((d) => (
            <DespesaCard
              key={d.id}
              despesa={d}
              isRateadosPendente={filtro === 'rateados-pendente'}
              onEditar={() => { setSelecionada(d); setModal('editar') }}
              onRemover={() => handleRemover(d)}
              onPagarParcela={(num) => abrirPagarParcela(d, num)}
              onAdiantar={() => { setSelecionada(d); setModal('adiantar') }}
              onAceitarRateio={() => responderRateio(d.id, d, user!.uid, 'aceito')}
              onRecusarRateio={() => responderRateio(d.id, d, user!.uid, 'recusado')}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {modal === 'criar' && (
        <Modal titulo="Nova despesa" onFechar={fecharModal}>
          <DespesaForm amigos={amigos} onSalvar={handleCriar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar despesa" onFechar={fecharModal}>
          <DespesaForm amigos={amigos} inicial={selecionada} onSalvar={handleEditar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'pagar' && selecionada && parcelaObj && (
        <Modal titulo={`Parcela ${parcelaSelecionada}/${selecionada.parcelas}`} onFechar={fecharModal}>
          <PagamentoForm tipo="pagamento" valorRestante={valorRestanteParcela}
            onSalvar={handlePagarParcela} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'adiantar' && selecionada && (
        <Modal titulo="Registrar adiantamento" onFechar={fecharModal}>
          <PagamentoForm tipo="adiantamento" valorRestante={selecionada.valorTotal}
            onSalvar={handleAdiantar} onCancelar={fecharModal} />
        </Modal>
      )}

      <style>{`
        .despesas-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .resumo-cards { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 1rem; }
        .resumo-card {
          background: #FFFFFF; border: 1px solid #F1F2F6; border-radius: 16px;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }
        .resumo-card.principal { border-left: 4px solid #C8A45A; }
        .resumo-card.secundario { background: #F8F9FA; border: 1px dashed #E0E0E0; }
        .resumo-label { color: #88929b; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
        .resumo-valor { color: #2d3436; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; }
        .resumo-card.secundario .resumo-valor { font-size: 1.1rem; color: #636e72; }
        .resumo-indicador { margin-top: 0.8rem; font-size: 0.6rem; font-weight: 600; padding: 4px 8px; border-radius: 6px; width: fit-content; background: rgba(200,164,90,0.1); color: #C8A45A; }
        .resumo-status { margin-top: 0.8rem; font-size: 0.6rem; font-weight: 600; padding: 4px 8px; border-radius: 6px; width: fit-content; background: #DFE6ED; color: #718093; }

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

        .despesas-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .estado-vazio { text-align: center; padding: 4rem 1rem; color: #A4B0BE; }
        .estado-vazio span { font-size: 3rem; display: block; margin-bottom: 1rem; }
        .btn-criar-vazio { background: white; border: 1px solid #E0E0E0; color: #777; border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; cursor: pointer; margin-top: 1rem; }
      `}</style>
    </div>
  )
}