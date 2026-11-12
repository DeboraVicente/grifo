import { useState } from 'react'
import { CalendarClock, LayoutGrid, TableProperties } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useDespesas } from '../hooks/useDespesas'
import type { useGastosPrevistos } from '../hooks/useGastosPrevistos'
import GastoPrevistoCard from '../components/previstos/GastoPrevistoCard'
import TabelaPrevistos from '../components/previstos/TabelaPrevistos'
import GastoPrevistoForm from '../components/previstos/GastoPrevistoForm'
import ReservarForm from '../components/previstos/ReservarForm'
import ConcluirForm, { type DadosConclusao } from '../components/previstos/ConcluirForm'
import EstilosPrevistos from '../components/previstos/estilos'
import Modal from '../components/ui/Modal'
import { useEhMobile } from '../lib/mobile'
import { fmtBRL, precisaAtencao, resumir } from '../lib/previstos'
import type { GastoPrevisto, GastoPrevistoForm as FormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'reservar' | 'concluir' | null
type AbaPrevistos = 'todos' | 'atencao' | 'em-dia'

const ABAS: { id: AbaPrevistos; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'atencao', label: 'Precisam de atenção' },
  { id: 'em-dia', label: 'Em dia' },
]

interface Props {
  previstosApi: ReturnType<typeof useGastosPrevistos>
  familiaId?: string
  meuUid?: string
}

export default function GastosPrevistosPage({ previstosApi, familiaId, meuUid }: Props) {
  const { user } = useAuthContext()
  const { criar: criarDespesa } = useDespesas(familiaId ?? user?.uid, meuUid ?? user?.uid)
  const { previstos, loading, criar, editar, remover, reservar, concluir } = previstosApi

  const [modal, setModal] = useState<ModalTipo>(null)
  const [sel, setSel] = useState<GastoPrevisto | null>(null)
  const [aba, setAba] = useState<AbaPrevistos>('todos')
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela')
  // No celular só existe a lista nova (que já traz os totais)
  const ehMobile = useEhMobile()
  const modoVisual = ehMobile ? 'tabela' : visualizacao
  const qtdAtencao = previstos.filter(precisaAtencao).length

  const abrir = (tipo: ModalTipo, g: GastoPrevisto | null = null) => { setSel(g); setModal(tipo) }
  const fechar = () => { setModal(null); setSel(null) }

  const totalMes = previstos.reduce((s, g) => s + resumir(g).pendenteNoMes, 0)
  const custoMensal = previstos.reduce((s, g) => s + g.valorEstimado / g.intervaloMeses, 0)

  const salvarNovo = async (f: FormType) => { await criar(f); fechar() }
  const salvarEdicao = async (f: FormType) => { if (sel) await editar(sel.id, f); fechar() }

  const salvarReserva = async (valor: number, data: string, obs: string) => {
    if (sel) await reservar(sel.id, valor, data, obs)
    fechar()
  }

  const salvarConclusao = async (d: DadosConclusao) => {
    if (!sel) return
    if (d.lancarDespesa) {
      await criarDespesa({
        nome: sel.nome,
        categoria: sel.categoria,
        metodoPagamento: 'pix',
        tipoGasto: 'variavel',
        tipo: 'padrao',
        parcelas: 1,
        valorTotal: d.valorReal,
        dataCompra: d.data,
        data: d.data,
        observacoes: 'Gasto previsto concluído',
      }, { jaPago: true })
    }
    await concluir(sel.id, { valorReal: d.valorReal, data: d.data, atualizarEstimativa: d.atualizarEstimativa })
    fechar()
  }

  const excluir = async (g: GastoPrevisto) => {
    if (!confirm(`Excluir "${g.nome}"? O histórico de reservas será perdido.`)) return
    await remover(g.id)
  }

  const lista = aba === 'atencao' ? previstos.filter(precisaAtencao)
    : aba === 'em-dia' ? previstos.filter((g) => !precisaAtencao(g)) : previstos
  const proximo = [...previstos].sort((a, b) => a.proximaData.localeCompare(b.proximaData))[0]

  return (
    <div className="previstos-page">
      <EstilosPrevistos />

      {/* Linha 1: título + cards/tabela */}
      <div className="ph-row1">
        <h1 className="page-titulo">Previstos</h1>
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
            <button key={id} className={`tab-btn ${aba === id ? 'ativo' : ''}`} onClick={() => setAba(id)}>
              {label}{id === 'atencao' && qtdAtencao > 0 && <span className="pp-badge">{qtdAtencao}</span>}
            </button>
          ))}
        </div>
        <button className="btn-criar" onClick={() => abrir('criar')}>+ Nova</button>
      </div>

      {/* Resumo */}
      {!ehMobile && (
      <div className="pp-resumo">
        <div className="pp-metrica destaque">
          <span>Reservar este mês</span>
          <strong>{fmtBRL(totalMes)}</strong>
        </div>
        <div className="pp-metrica">
          <span>Custo médio</span>
          <strong>{fmtBRL(custoMensal)}<small>/mês</small></strong>
        </div>
        <div className="pp-metrica">
          <span>Próximo</span>
          <strong>{proximo ? proximo.nome : '—'}</strong>
          {proximo && <small>{new Date(proximo.proximaData + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</small>}
        </div>
      </div>
      )}

      {loading ? (
        <div className="gp-vazio">Carregando...</div>
      ) : previstos.length === 0 ? (
        <div className="gp-vazio">
          <CalendarClock size={46} color="#B2BEC3" />
          <p>Cadastre gastos que sempre voltam, como troca de óleo, revisão, IPVA ou dentista. O Grifo diz quanto guardar por mês e avisa quando estiver chegando a hora.</p>
          <button className="btn-criar-vazio" onClick={() => abrir('criar')}>Cadastrar o primeiro</button>
        </div>
      ) : lista.length === 0 ? (
        <div className="gp-vazio"><p>Nenhum previsto nesta aba.</p></div>
      ) : modoVisual === 'tabela' ? (
        <TabelaPrevistos previstos={lista}
          onReservar={(g) => abrir('reservar', g)} onConcluir={(g) => abrir('concluir', g)}
          onEditar={(g) => abrir('editar', g)} onRemover={excluir} />
      ) : (
        <div className="gp-lista">
          {lista.map((g) => (
            <GastoPrevistoCard
              key={g.id}
              gasto={g}
              onReservar={() => abrir('reservar', g)}
              onConcluir={() => abrir('concluir', g)}
              onEditar={() => abrir('editar', g)}
              onRemover={() => excluir(g)}
            />
          ))}
        </div>
      )}

      {modal === 'criar' && (
        <Modal titulo="Novo gasto previsto" onFechar={fechar}>
          <GastoPrevistoForm onSalvar={salvarNovo} onCancelar={fechar} />
        </Modal>
      )}
      {modal === 'editar' && sel && (
        <Modal titulo="Editar gasto previsto" onFechar={fechar}>
          <GastoPrevistoForm inicial={sel} onSalvar={salvarEdicao} onCancelar={fechar} />
        </Modal>
      )}
      {modal === 'reservar' && sel && (
        <Modal titulo={`Reservar · ${sel.nome}`} onFechar={fechar}>
          <ReservarForm gasto={sel} onSalvar={salvarReserva} onCancelar={fechar} />
        </Modal>
      )}
      {modal === 'concluir' && sel && (
        <Modal titulo={`Concluir · ${sel.nome}`} onFechar={fechar}>
          <ConcluirForm gasto={sel} onSalvar={salvarConclusao} onCancelar={fechar} />
        </Modal>
      )}

      <style>{`
        .previstos-page { display: flex; flex-direction: column; gap: 1rem; }
        .pp-resumo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
        .pp-metrica {
          background: #fff; border: 1px solid #F1F2F6; border-radius: 14px;
          padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; min-width: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .pp-metrica > span { font-size: 0.68rem; font-weight: 700; color: #95A5A6; text-transform: uppercase; letter-spacing: 0.05em; }
        .pp-metrica strong { font-size: 1.15rem; font-weight: 800; color: #2D3436; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
        .pp-metrica strong small { font-size: 0.75rem; font-weight: 600; color: #95A5A6; margin-left: 2px; }
        .pp-metrica > small { font-size: 0.75rem; color: #95A5A6; }
        .pp-metrica.destaque strong { color: #C8A45A; }
        .pp-badge { margin-left: 0.35rem; background: #E17055; color: #fff; border-radius: 999px; font-size: 0.65rem; padding: 0 6px; }
        @media (max-width: 480px) {
          .pp-resumo { grid-template-columns: 1fr 1fr; }
          .pp-metrica.destaque { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  )
}
