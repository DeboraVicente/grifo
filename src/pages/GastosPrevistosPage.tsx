import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { useAuthContext } from '../lib/AuthContext'
import { useDespesas } from '../hooks/useDespesas'
import type { useGastosPrevistos } from '../hooks/useGastosPrevistos'
import GastoPrevistoCard from '../components/previstos/GastoPrevistoCard'
import GastoPrevistoForm from '../components/previstos/GastoPrevistoForm'
import ReservarForm from '../components/previstos/ReservarForm'
import ConcluirForm, { type DadosConclusao } from '../components/previstos/ConcluirForm'
import EstilosPrevistos from '../components/previstos/estilos'
import Modal from '../components/ui/Modal'
import { fmtBRL, resumir } from '../lib/previstos'
import type { GastoPrevisto, GastoPrevistoForm as FormType } from '../types'

type ModalTipo = 'criar' | 'editar' | 'reservar' | 'concluir' | null

interface Props {
  previstosApi: ReturnType<typeof useGastosPrevistos>
}

export default function GastosPrevistosPage({ previstosApi }: Props) {
  const { user } = useAuthContext()
  const { criar: criarDespesa } = useDespesas(user?.uid)
  const { previstos, loading, criar, editar, remover, reservar, concluir } = previstosApi

  const [modal, setModal] = useState<ModalTipo>(null)
  const [sel, setSel] = useState<GastoPrevisto | null>(null)

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

  return (
    <div>
      <EstilosPrevistos />

      <div className="gp-topo">
        <div className="gp-total">
          <span>Reservar este mês</span>
          <strong>{fmtBRL(totalMes)}</strong>
          {previstos.length > 0 && <small style={{ color: '#95A5A6', fontSize: '0.78rem' }}>Custo médio: {fmtBRL(custoMensal)}/mês</small>}
        </div>
        <button className="gp-btn" onClick={() => abrir('criar')}><Plus size={16} /> Novo previsto</button>
      </div>

      {loading ? (
        <div className="gp-vazio">Carregando...</div>
      ) : previstos.length === 0 ? (
        <div className="gp-vazio">
          <CalendarClock size={46} color="#B2BEC3" />
          <p>Cadastre gastos que sempre voltam, como troca de óleo, revisão, IPVA ou dentista. O Grifo diz quanto guardar por mês e avisa quando estiver chegando a hora.</p>
          <button className="gp-btn" onClick={() => abrir('criar')}><Plus size={16} /> Cadastrar o primeiro</button>
        </div>
      ) : (
        <div className="gp-lista">
          {previstos.map((g) => (
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
    </div>
  )
}
