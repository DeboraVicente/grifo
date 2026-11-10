import { useState } from 'react'
import { PiggyBank, LayoutGrid, TableProperties, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCaixinhas } from '../hooks/useCaixinhas'
import { useAuthContext } from '../lib/AuthContext'
import CaixinhaCard from '../components/caixinhas/CaixinhaCard'
import CaixinhaForm from '../components/caixinhas/CaixinhaForm'
import MetasInvestimento from '../components/caixinhas/MetasInvestimento'
import MovimentoForm from '../components/caixinhas/MovimentoForm'
import Modal from '../components/ui/Modal'
import type { Caixinha, CaixinhaForm as CaixinhaFormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'depositar' | 'retirar' | 'rendimento' | null
type Visualizacao = 'cards' | 'metas'

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function CaixinhasPage({ familiaId, meuUid, temFamilia = false }: { familiaId?: string; meuUid?: string; temFamilia?: boolean }) {
  const { user } = useAuthContext()
  const { caixinhas, loading, criar, editar, remover, adicionarMovimento, removerMovimento } = useCaixinhas(familiaId ?? user?.uid, meuUid ?? user?.uid)

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
              onRemoverMovimento={(m) => removerMovimento(c.id, m.id)}
            />
          ))}
        </div>
      )}

      {modal === 'criar' && (
        <Modal titulo="Nova caixinha" onFechar={fecharModal}>
          <CaixinhaForm onSalvar={handleCriar} onCancelar={fecharModal} emFamilia={temFamilia} />
        </Modal>
      )}
      {modal === 'editar' && selecionada && (
        <Modal titulo="Editar caixinha" onFechar={fecharModal}>
          <CaixinhaForm inicial={selecionada} onSalvar={handleEditar} onCancelar={fecharModal} emFamilia={temFamilia} />
        </Modal>
      )}
      {(modal === 'depositar' || modal === 'retirar' || modal === 'rendimento') && selecionada && (
        <Modal
          titulo={modal === 'depositar' ? `Depositar em "${selecionada.nome}"` : modal === 'retirar' ? `Retirar de "${selecionada.nome}"` : `Rendimento em "${selecionada.nome}"`}
          onFechar={fecharModal}
        >
          <MovimentoForm
            tipo={modal === 'depositar' ? 'entrada' : modal === 'retirar' ? 'saida' : 'rendimento'}
            caixinha={selecionada}
            onSalvar={handleMovimento}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      <style>{`
        .caixinhas-page { display: flex; flex-direction: column; gap: 1rem; }

        /* Linha 2 */
        .ph-row2 { justify-content: flex-end; }
        .caixinhas-list { display: flex; flex-direction: column; gap: 1rem; }
      `}</style>
    </div>
  )
}
