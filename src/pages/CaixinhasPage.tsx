import { useState } from 'react'
import { PiggyBank, LayoutGrid, TableProperties, ChevronLeft, ChevronRight } from 'lucide-react'
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

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function CaixinhasPage() {
  const { user } = useAuthContext()
  const { caixinhas, loading, criar, editar, remover, adicionarMovimento } = useCaixinhas(user?.uid)

  const hoje = new Date()
  const [modal, setModal] = useState<ModalTipo>(null)
  const [selecionada, setSelecionada] = useState<Caixinha | null>(null)
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('metas')
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1

  const irAnterior = () => {
    if (mes === 1) { setAno(a => a - 1); setMes(12) } else setMes(m => m - 1)
  }
  const irProximo = () => {
    if (mes === 12) { setAno(a => a + 1); setMes(1) } else setMes(m => m + 1)
  }

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

      {/* Linha 1: Título + nav mês (metas) + toggle */}
      <div className="ph-row1">
        <h1 className="page-titulo">Caixinhas</h1>

        {visualizacao === 'metas' && (
          <div className="mes-nav">
            <button className="nav-btn" onClick={irAnterior}><ChevronLeft size={16} /></button>
            <span className="nav-label">{MESES_PT[mes - 1]} {ano}</span>
            <button className="nav-btn" onClick={irProximo} disabled={ehMesAtual}><ChevronRight size={16} /></button>
          </div>
        )}

        <div className="toggle-view">
          <button className={`toggle-btn ${visualizacao === 'cards' ? 'ativo' : ''}`}
            onClick={() => setVisualizacao('cards')} title="Ver cards">
            <LayoutGrid size={16} />
          </button>
          <button className={`toggle-btn ${visualizacao === 'metas' ? 'ativo' : ''}`}
            onClick={() => setVisualizacao('metas')} title="Metas de investimento">
            <TableProperties size={16} />
          </button>
        </div>
      </div>

      {/* Linha 2: Nova */}
      <div className="ph-row2">
        <button className="btn-criar" onClick={() => setModal('criar')}>+ Nova</button>
      </div>

      {/* Conteúdo */}
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
          ano={ano}
          mes={mes}
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
        .caixinhas-page { display: flex; flex-direction: column; gap: 1rem; }

        /* Linha 1 */
        .ph-row1 { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
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
        .ph-row2 { display: flex; justify-content: flex-end; }

        .btn-criar {
          background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
          padding: 0.6rem 1.1rem; font-size: 0.85rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(200,164,90,0.25); transition: all 0.2s ease;
          white-space: nowrap; font-family: inherit;
        }
        .btn-criar:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200,164,90,0.35); }

        .caixinhas-list { display: flex; flex-direction: column; gap: 1rem; }

        .estado-vazio {
          display: flex; flex-direction: column; align-items: center;
          gap: 1rem; padding: 4rem 1rem; color: #BDC3C7; text-align: center;
        }

        .btn-criar-vazio {
          background: #FFFFFF; border: 1px dashed #D1D8E0; color: #95A5A6;
          border-radius: 12px; padding: 0.8rem 1.5rem; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .btn-criar-vazio:hover { border-color: #C8A45A; color: #C8A45A; background: #FFFDF7; }

        @media (max-width: 600px) {
          .ph-row1 { gap: 0.5rem; }
          .nav-label { min-width: 100px; font-size: 0.82rem; }
        }
      `}</style>
    </div>
  )
}
