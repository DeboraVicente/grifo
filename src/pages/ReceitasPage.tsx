import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, TableProperties } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useReceitas } from '../hooks/useReceitas'
import ReceitaForm from '../components/relatorios/ReceitaForm'
import TabelaReceitas from '../components/receitas/TabelaReceitas'
import ReceitaCard from '../components/receitas/ReceitaCard'
import Modal from '../components/ui/Modal'
import { useEhMobile } from '../components/ui/ListaMobile'
import { filtrarReceitas, fmtBRL, linhasDoMes, resumoReceitas, type FiltroReceita } from '../lib/receitas'
import type { Receita, InfoFamilia } from '../types'
import type { ReceitaForm as ReceitaFormType } from '../hooks/useReceitas'

const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const ABAS: { id: FiltroReceita; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'recorrentes', label: 'Recorrentes' },
  { id: 'avulsas', label: 'Avulsas' },
]

interface Props {
  familiaId?: string
  meuUid?: string
  temFamilia?: boolean
  familia?: InfoFamilia
}

/**
 * Receitas: sempre de quem lançou e só ela vê aqui.
 * Mesmo layout de Despesas: mês, cards/tabela, abas e resumo.
 */
export default function ReceitasPage({ familiaId, meuUid, temFamilia = false, familia }: Props) {
  const { user } = useAuthContext()
  const myUid = meuUid ?? user?.uid
  const membros = familia?.membros.map((m) => m.uid) ?? []
  const { receitas, loading, criar, editar, remover } = useReceitas(familiaId ?? myUid, myUid, membros, familia?.ownerUid)

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [aba, setAba] = useState<FiltroReceita>('todas')
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela')
  // No celular só existe a lista nova (que já traz os totais)
  const ehMobile = useEhMobile()
  const modoVisual = ehMobile ? 'tabela' : visualizacao
  const [modal, setModal] = useState<{ item?: Receita } | null>(null)

  const navegar = (dir: -1 | 1) => {
    const d = new Date(ano, mes + dir, 1)
    setMes(d.getMonth()); setAno(d.getFullYear())
  }

  const linhasMes = useMemo(() => linhasDoMes(receitas, mes, ano), [receitas, mes, ano])
  const linhas = useMemo(() => filtrarReceitas(linhasMes, aba), [linhasMes, aba])
  const resumo = resumoReceitas(linhasMes)

  const handleSalvar = async (form: ReceitaFormType) => {
    if (modal?.item) await editar(modal.item.id, form)
    else await criar(form)
    setModal(null)
  }
  const handleRemover = async (r: Receita) => {
    if (!confirm(`Remover a receita "${r.nome}"?`)) return
    await remover(r.id)
  }

  return (
    <div className="receitas-page">
      {/* Linha 1: título + mês + cards/tabela */}
      <div className="ph-row1">
        <h1 className="page-titulo">Receitas</h1>
        <div className="mes-nav">
          <button className="nav-btn" onClick={() => navegar(-1)} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
          <span className="nav-label">{MESES_PT[mes]} {ano}</span>
          <button className="nav-btn" onClick={() => navegar(1)} aria-label="Próximo mês"><ChevronRight size={16} /></button>
        </div>
        {!ehMobile && (
        <div className="toggle-view">
          <button className={`toggle-btn ${visualizacao === 'cards' ? 'ativo' : ''}`} onClick={() => setVisualizacao('cards')} title="Cards">
            <LayoutGrid size={16} />
          </button>
          <button className={`toggle-btn ${visualizacao === 'tabela' ? 'ativo' : ''}`} onClick={() => setVisualizacao('tabela')} title="Tabela">
            <TableProperties size={16} />
          </button>
        </div>
        )}
      </div>

      {/* Linha 2: abas + nova */}
      <div className="ph-row2">
        <div className="tabs-nav">
          {ABAS.map(({ id, label }) => (
            <button key={id} className={`tab-btn ${aba === id ? 'ativo' : ''}`} onClick={() => setAba(id)}>{label}</button>
          ))}
        </div>
        <button className="btn-criar" onClick={() => setModal({})}>+ Nova</button>
      </div>

      {/* Resumo do mês */}
      {!ehMobile && (
      <div className="rp-resumo">
        <div className="rp-metrica destaque">
          <span>Recebido no mês</span>
          <strong>{fmtBRL(resumo.total)}</strong>
        </div>
        <div className="rp-metrica">
          <span>Recorrente</span>
          <strong>{fmtBRL(resumo.recorrente)}</strong>
        </div>
        <div className="rp-metrica">
          <span>Avulso</span>
          <strong>{fmtBRL(resumo.avulso)}</strong>
        </div>
      </div>
      )}

      {loading ? null : linhas.length === 0 ? (
        <div className="rp-vazio">
          <p>{linhasMes.length === 0 ? `Nenhuma receita em ${MESES_PT[mes].toLowerCase()}.` : 'Nenhuma receita nesta aba.'}</p>
          <button className="btn-criar-vazio" onClick={() => setModal({})}>Adicionar receita</button>
        </div>
      ) : modoVisual === 'tabela' ? (
        <TabelaReceitas linhas={linhas} onEditar={(r) => setModal({ item: r })} onRemover={handleRemover} />
      ) : (
        <div className="rp-cards">
          {linhas.map(({ receita, dataNoMes }) => (
            <ReceitaCard key={receita.id} receita={receita} dataNoMes={dataNoMes}
              onEditar={() => setModal({ item: receita })} onRemover={() => handleRemover(receita)} />
          ))}
        </div>
      )}

      {modal && (
        <Modal titulo={modal.item ? 'Editar receita' : 'Nova receita'} onFechar={() => setModal(null)}>
          <ReceitaForm inicial={modal.item} onSalvar={handleSalvar} onCancelar={() => setModal(null)} emFamilia={temFamilia} />
        </Modal>
      )}

      <style>{`
        .receitas-page { display: flex; flex-direction: column; gap: 1rem; }
        .rp-resumo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
        .rp-metrica {
          background: #fff; border: 1px solid #F1F2F6; border-radius: 14px;
          padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .rp-metrica span { font-size: 0.68rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .rp-metrica strong { font-size: 1.15rem; font-weight: 800; color: #2D3436; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rp-metrica.destaque strong { color: #27AE60; }
        .rp-cards { display: flex; flex-direction: column; gap: 0.75rem; }
        .rp-vazio { text-align: center; padding: 3rem 1rem; color: #95A5A6; font-size: 0.9rem; }
        @media (max-width: 480px) {
          .rp-resumo { grid-template-columns: 1fr 1fr; }
          .rp-metrica.destaque { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  )
}
