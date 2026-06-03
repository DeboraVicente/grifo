import { useState } from 'react'
import { PiggyBank, LayoutGrid, TableProperties } from 'lucide-react'
import { useCaixinhas } from '../hooks/useCaixinhas'
import { useAuthContext } from '../lib/AuthContext'
import CaixinhaCard from '../components/caixinhas/CaixinhaCard'
import CaixinhaForm from '../components/caixinhas/CaixinhaForm'
import MetasInvestimento from '../components/caixinhas/MetasInvestimento'
import PagamentoForm from '../components/despesas/PagamentoForm'
import Modal from '../components/ui/Modal'
import type { Caixinha, CaixinhaForm as CaixinhaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'depositar' | 'retirar' | 'rendimento' | null
type Visualizacao = 'cards' | 'metas'

export default function CaixinhasPage() {
  const { user } = useAuthContext()
  const { caixinhas, loading, criar, editar, remover, adicionarMovimento } = useCaixinhas(user?.uid)

  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Caixinha | null>(null)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('metas')

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

  return (
    <div className="caixinhas-page">
      <div className="page-header">
        <div>
          <h1 className="page-titulo">Caixinhas</h1>
          <p className="page-subtitulo">Organize seus objetivos de poupança</p>
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
              className={`toggle-btn ${visualizacao === 'metas' ? 'ativo' : ''}`}
              onClick={() => setVisualizacao('metas')}
              title="Metas de investimento"
            >
              <TableProperties size={16} />
            </button>
          </div>
          <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
        </div>
      </div>

      {loading ? (
        <div className="estado-vazio">Carregando...</div>
      ) : caixinhas.length === 0 ? (
        <div className="estado-vazio">
          <PiggyBank size={48} color="#B2BEC3" />
          <p>Nenhuma caixinha criada</p>
          <button className="btn-criar-vazio" onClick={() => setModal('criar')}>Criar primeira caixinha</button>
        </div>
      ) : visualizacao === 'metas' ? (
        <MetasInvestimento
          caixinhas={caixinhas}
          onDepositar={(c) => { setSelecionada(c); setModal('depositar') }}
        />
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
      .caixinhas-page { display: flex; flex-direction: column; gap: 1.5rem; }

      .page-header { display: flex; align-items: flex-start; justify-content: space-between; }
      .page-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; }
      .page-subtitulo { font-size: 0.8rem; color: #95A5A6; margin-top: 2px; }

      .header-acoes { display: flex; align-items: center; gap: 0.75rem; }

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
        padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;
        box-shadow: 0 4px 12px rgba(200,164,90,0.25); transition: all 0.2s ease;
        white-space: nowrap; font-family: inherit;
      }
      .btn-criar:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200,164,90,0.35); }

      .caixinhas-list { display: flex; flex-direction: column; gap: 1rem; }

      .estado-vazio {
        display: flex; flex-direction: column; align-items: center;
        gap: 1rem; padding: 4rem 1rem; color: #BDC3C7; text-align: center;
      }
      .estado-vazio span { font-size: 3rem; opacity: 0.5; }

      .btn-criar-vazio {
        background: #FFFFFF; border: 1px dashed #D1D8E0; color: #95A5A6;
        border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; font-weight: 600;
        cursor: pointer; margin-top: 0.5rem; transition: all 0.2s; font-family: inherit;
      }
      .btn-criar-vazio:hover { border-color: #C8A45A; color: #C8A45A; background: #FFFDF7; }

      @media (max-width: 600px) {
        .caixinhas-page { gap: 1rem; }
        .page-header { flex-direction: column; gap: 0.75rem; }
        .btn-criar { width: 100%; text-align: center; }
      }
    `}</style>
    </div>
  )
}
