import { useState, useEffect } from 'react'
import { useDespesas } from '../hooks/useDespesas'
import { useAmizades } from '../hooks/useAmizades'
import { useRateioRecebido } from '../hooks/useRateio'
import { useAuthContext } from '../lib/AuthContext'
import DespesaCard from '../components/despesas/DespesaCard'
import DespesaForm from '../components/despesas/DespesaForm'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Despesa, DespesaForm as DespesaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'pagar' | 'adiantar' | 'pagar-rateio' | null
type FiltroTipo = 'todas' | 'rateados' | 'pendentes' | 'pagas' | 'rateados-pendente' 

export default function DespesasPage() {
  const { user } = useAuthContext()
  const { despesas, loading, criar, editar, remover, pagarParcela, adicionarAdiantamento } = useDespesas(user?.uid)
  const { amigos } = useAmizades(user?.uid, user?.email ?? '', user?.displayName ?? '')
  const { despesasRateadas, responderRateio, pagarParteRateio } = useRateioRecebido(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Despesa | null>(null)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<number>(1)
  const [filtro, setFiltro] = useState<FiltroTipo>('todas')
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
  
  // Helper: extrai o valor devido pelo usuário numa despesa rateada
  const meuValorRateio = (d: Despesa): number => {
    const p = (d.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    return p?.valorDevido ?? 0
  }
  const meuValorRateioMes = (d: Despesa): number => {
    const p = (d.rateio as any).participantes?.find((p: any) => p.userId === user?.uid)
    return p?.valorDevidoParcela ?? p?.valorDevido ?? 0
  }

  // 2. Lógica de Filtragem da Lista
  const despesasExibidas = (() => {
    if (filtro === 'rateados-pendente') return rateiosPendentes
    const proprias = despesas.filter((d) => {
      if (filtro === 'rateados') return d.rateio?.ativo && (d.rateio as any).participantes.some((p: any) => p.userId === user?.uid)
      if (filtro === 'pendentes') return !d.pago
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

  // 4. Cálculos de Resumo (Cards de cima)
  const agora = new Date()
  const mesAtual = agora.getMonth()
  const anoAtual = agora.getFullYear()

  // Soma das próprias despesas no mês
  const totalMesProprio = despesas.reduce((acc, d) => {
    if (!d.listaParcelas || d.listaParcelas.length === 0)
      return acc + (!d.pago ? (d.valorTotal ?? 0) : 0)
    return acc + d.listaParcelas
      .filter(p => {
        const dv = new Date(p.dataVencimento + 'T12:00:00')
        return !p.pago && dv.getMonth() === mesAtual && dv.getFullYear() === anoAtual
      })
      .reduce((s, p) => s + p.valor, 0)
  }, 0)

  // Soma da parte do usuário nas despesas rateadas aceitas no mês
  const totalMesRateio = rateiosAceitos
  .filter(d => !d.pago)
  .reduce((acc, d) => {
    // Se parcelado, usa valorDevidoParcela; se à vista, valorDevido
    return acc + meuValorRateioMes(d)
  }, 0)

 const totalMesAtual = totalMesProprio + totalMesRateio

 const totalRestanteProprio = despesas.reduce((acc, d) => {
  if (d.pago) return acc
  if (!d.listaParcelas || d.listaParcelas.length === 0) return acc + (d.valorTotal ?? 0)
  return acc + d.listaParcelas.filter(p => !p.pago).reduce((s, p) => s + p.valor, 0)
}, 0)

  const totalRestanteRateio = rateiosAceitos
    .filter(d => !d.pago)
    .reduce((acc, d) => acc + meuValorRateio(d), 0)

  const totalRestanteFuturo = totalRestanteProprio + totalRestanteRateio

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
      <div className="resumo-cards">
        <div className="resumo-card principal">
          <span className="resumo-label">Total para pagar no mês</span>
          <span className="resumo-valor">{fmt(totalMesAtual)}</span>
          <div className="resumo-indicador">Vence em breve</div>
        </div>


        <div className="resumo-card secundario">
          <span className="resumo-label">Despesas próprias</span>
          <span className="resumo-valor">{fmt(totalMesProprio)}</span>
          <div className="resumo-status">Próprias</div>
        </div>

        <div className="resumo-card secundario">
          <span className="resumo-label">Saldo devedor total</span>
          <span className="resumo-valor">{fmt(totalRestanteFuturo)}</span>
          <div className="resumo-status">Compromissos futuros</div>
        </div>


        <div className="resumo-card secundario">
          <span className="resumo-label">Despesas rateadas</span>
          <span className="resumo-valor">{fmt(totalMesRateio)}</span>
          <div className="resumo-status">Rateados</div>
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
        <>
          <div className="despesas-list">
            {despesasExibidas.slice(pagina * ITENS_POR_PAGINA, (pagina + 1) * ITENS_POR_PAGINA).map((d) => {
              const ehRateioPendente = rateiosPendentes.some((r) => r.id === d.id)
              const ehRateioAceito = rateiosAceitos.some((r) => r.id === d.id)
              return (
                <DespesaCard
                  key={d.id}
                  despesa={d}
                  isRateadosPendente={ehRateioPendente}
                  isRateioAceito={ehRateioAceito}
                  meuUserId={user?.uid}
                  onEditar={() => { setSelecionada(d); setModal('editar') }}
                  onRemover={() => handleRemover(d)}
                  onPagarParcela={(num) => abrirPagarParcela(d, num)}
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