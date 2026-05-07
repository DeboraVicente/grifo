import { useState } from 'react'
import { PiggyBank } from 'lucide-react'
import { useCaixinhas } from '../hooks/useCaixinhas'
import { useAuthContext } from '../lib/AuthContext'
import CaixinhaCard from '../components/caixinhas/CaixinhaCard'
import CaixinhaForm from '../components/caixinhas/CaixinhaForm'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Caixinha, CaixinhaForm as CaixinhaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'depositar' | 'retirar' | 'rendimento' | null

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CaixinhasPage() {
  const { user } = useAuthContext()
  const { caixinhas, loading, criar, editar, remover, adicionarMovimento } = useCaixinhas(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Caixinha | null>(null)

  const fecharModal = () => { setModal(null); setSelecionada(null) }

  const handleCriar = async (form: CaixinhaFormType) => { await criar(form); fecharModal() }
  const handleEditar = async (form: CaixinhaFormType) => {
    if (!selecionada) return
    await editar(selecionada.id, form)
    fecharModal()
  }
  const handleRemover = async (c: Caixinha) => {
    if (!confirm(`Remover "${c.nome}"? O saldo será perdido.`)) return
    await remover(c.id)
  }
  const handleMovimento = async (dados: { valor: number; data: string; observacao: string }) => {
    if (!selecionada || !modal) return
    const tipo = modal === 'depositar' ? 'entrada' : modal === 'rendimento' ? 'rendimento' : 'saida'
    await adicionarMovimento(selecionada.id, tipo, dados)
    fecharModal()
  }

  const totalGuardado = caixinhas.reduce((s, c) => s + c.valorAtual, 0)

  return (
    <div className="caixinhas-page">
      {/* Resumo */}
      <div className="resumo-card">
        <span className="resumo-label">Total guardado</span>
        <span className="resumo-valor">{fmt(totalGuardado)}</span>
        <span className="resumo-sub">{caixinhas.length} caixinha{caixinhas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <span className="page-titulo">Caixinhas</span>
        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : caixinhas.length === 0 ? (
        <div className="estado-vazio">
          <PiggyBank size={48} color="#B2BEC3" />
          <p>Nenhuma caixinha criada</p>
          <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira caixinha</button>
        </div>
      ) : (
        <div className="caixinhas-list">
          {caixinhas.map((c) => (
            <CaixinhaCard
              key={c.id}
              caixinha={c}
              onEditar={() => { setSelecionada(c); setModal('editar') }}
              onRemover={() => handleRemover(c)}
              onDepositar={() => { setSelecionada(c); setModal('depositar') }}
              onRetirar={() => { setSelecionada(c); setModal('retirar') }}
              onRendimento={() => { setSelecionada(c); setModal('rendimento') }}
            />
          ))}
        </div>
      )}

      {modal === 'criar' && (
        <Modal titulo="Nova caixinha" onFechar={fecharModal}>
          <CaixinhaForm onSalvar={handleCriar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar caixinha" onFechar={fecharModal}>
          <CaixinhaForm inicial={selecionada} onSalvar={handleEditar} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'depositar' && selecionada && (
        <Modal titulo={`Depositar em "${selecionada.nome}"`} onFechar={fecharModal}>
          <PagamentoForm tipo="pagamento" valorRestante={selecionada.valorMeta ? selecionada.valorMeta - selecionada.valorAtual : 0}
            onSalvar={handleMovimento} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'retirar' && selecionada && (
        <Modal titulo={`Retirar de "${selecionada.nome}"`} onFechar={fecharModal}>
          <PagamentoForm tipo="adiantamento" valorRestante={selecionada.valorAtual}
            max={selecionada.valorAtual}
            onSalvar={handleMovimento} onCancelar={fecharModal} />
        </Modal>
      )}
      {modal === 'rendimento' && selecionada && (
        <Modal titulo={`Rendimento em "${selecionada.nome}"`} onFechar={fecharModal}>
          <PagamentoForm tipo="adiantamento" valorRestante={0}
            onSalvar={handleMovimento} onCancelar={fecharModal} />
        </Modal>
      )}

    <style>{`
      .caixinhas-page { 
        display: flex; 
        flex-direction: column; 
        gap: 1.5rem; 
      }

      /* Card de Resumo Principal */
      .resumo-card {
        background: #FFFFFF; 
        border: 1px solid #F1F2F6;
        border-left: 5px solid #C8A45A; /* Destaque lateral da marca */
        border-radius: 16px; 
        padding: 1.5rem;
        display: flex; 
        flex-direction: column; 
        gap: 0.25rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04);
      }
      
      .resumo-label { 
        color: #95A5A6; 
        font-size: 0.7rem; 
        font-weight: 700;
        letter-spacing: 0.08em; 
        text-transform: uppercase; 
      }
      
      .resumo-valor { 
        color: #C8A45A; 
        font-size: 1.8rem; 
        font-weight: 800;
        font-variant-numeric: tabular-nums; 
        letter-spacing: -0.02em;
      }
      
      .resumo-sub { 
        color: #BDC3C7; 
        font-size: 0.8rem; 
        font-weight: 500;
      }

      .page-header { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        margin-top: 0.5rem;
      }
      
      .page-titulo { 
        color: #2D3436; 
        font-size: 0.9rem; 
        font-weight: 700;
        letter-spacing: 0.02em; 
        text-transform: uppercase; 
      }

      .btn-criar { 
        background: #C8A45A; 
        color: #FFFFFF; 
        border: none; 
        border-radius: 12px; 
        padding: 0.7rem 1.2rem; 
        font-size: 0.85rem; 
        font-weight: 700; 
        cursor: pointer; 
        box-shadow: 0 4px 12px rgba(200,164,90,0.25);
        transition: all 0.2s ease; 
      }
      
      .btn-criar:hover { 
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(200,164,90,0.35);
      }

      .caixinhas-list { 
        display: flex; 
        flex-direction: column; 
        gap: 1rem; 
      }

      .estado-vazio { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        gap: 1rem; 
        padding: 4rem 1rem; 
        color: #BDC3C7; 
        text-align: center;
      }
      
      .estado-vazio span { font-size: 3rem; opacity: 0.5; }
      
      .btn-criar-vazio { 
        background: #FFFFFF; 
        border: 1px dashed #D1D8E0; 
        color: #95A5A6; 
        border-radius: 12px; 
        padding: 0.8rem 1.5rem; 
        font-size: 0.85rem; 
        font-weight: 600;
        cursor: pointer; 
        margin-top: 0.5rem; 
        transition: all 0.2s; 
      }
      
      .btn-criar-vazio:hover { 
        border-color: #C8A45A; 
        color: #C8A45A; 
        background: #FFFDF7;
      }
    `}</style>
    </div>
  )
}
