import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown, FolderOpen, CalendarDays, Users, TrendingUp, Lightbulb, LineChart, CreditCard,
} from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useRateioRecebido } from '../hooks/useRateio'
import { useReceitas } from '../hooks/useReceitas'
import { useCartoes } from '../hooks/useCartoes'
import { useCaixinhas } from '../hooks/useCaixinhas'
import { useAuthContext } from '../lib/AuthContext'
import FluxoCaixaMensal from '../components/relatorios/FluxoCaixaMensal'
import RelatorioCategoria from '../components/relatorios/RelatorioCategoria'
import ControleParcelamentos from '../components/relatorios/ControleParcelamentos'
import ControleRateio from '../components/relatorios/ControleRateio'
import ForecastGastos from '../components/relatorios/ForecastGastos'
import QuantoPossoGastar from '../components/relatorios/QuantoPossoGastar'
import EvolucaoFinanceira from '../components/relatorios/EvolucaoFinanceira'
import RelatorioCartoes from '../components/relatorios/RelatorioCartoes'

type RelatorioTipo =
  | 'fluxo'
  | 'categorias'
  | 'parcelamentos'
  | 'rateios'
  | 'forecast'
  | 'saldo-livre'
  | 'evolucao'
  | 'cartoes'

const ABAS: { id: RelatorioTipo; label: string; Icon: LucideIcon }[] = [
  { id: 'fluxo', label: 'Fluxo Mensal', Icon: ArrowUpDown },
  { id: 'categorias', label: 'Categorias', Icon: FolderOpen },
  { id: 'parcelamentos', label: 'Parcelamentos', Icon: CalendarDays },
  { id: 'rateios', label: 'Rateios', Icon: Users },
  { id: 'cartoes', label: 'Cartões', Icon: CreditCard },
  { id: 'forecast', label: 'Previsão', Icon: TrendingUp },
  { id: 'saldo-livre', label: 'Saldo Livre', Icon: Lightbulb },
  { id: 'evolucao', label: 'Evolução', Icon: LineChart },
]

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function RelatoriosPage() {
  const { user } = useAuthContext()
  const { despesas } = useDespesas(user?.uid)
  const { despesasRateadas } = useRateioRecebido(user?.uid)
  const { receitas } = useReceitas(user?.uid)
  const { cartoes } = useCartoes(user?.uid)
  const { caixinhas } = useCaixinhas(user?.uid)

  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [abaAtiva, setAbaAtiva] = useState<RelatorioTipo>('fluxo')

  const navegarMes = (dir: -1 | 1) => {
    if (dir === 1 && mes === 11) { setMes(0); setAno(a => a + 1) }
    else if (dir === -1 && mes === 0) { setMes(11); setAno(a => a - 1) }
    else setMes(m => m + dir)
  }

  const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`
  const totalPendenteMes = despesas
    .filter(d => !d.pago && d.data?.startsWith(mesStr))
    .reduce((s, d) => s + d.valorTotal, 0)
  const totalGuardado = caixinhas.reduce((s, c) => s + c.valorAtual, 0)

  const relatorioProps = { despesas, rateiosRecebidos: despesasRateadas, receitas, userId: user?.uid ?? '', mes, ano }

  return (
    <div className="rel-page">
      <div className="rel-header">
        <div>
          <h1 className="rel-titulo">Relatórios</h1>
          <p className="rel-subtitulo">Visão completa das suas finanças</p>
        </div>
      </div>

      <div className="rel-resumo">
        <div className="rel-resumo-item">
          <span className="rel-resumo-label">A pagar em {NOMES_MES[mes]}</span>
          <span className="rel-resumo-valor rel-despesa">{fmt(totalPendenteMes)}</span>
        </div>
        <div className="rel-resumo-sep" />
        <div className="rel-resumo-item">
          <span className="rel-resumo-label">Guardado em caixinhas</span>
          <span className="rel-resumo-valor rel-poupanca">{fmt(totalGuardado)}</span>
        </div>
      </div>

      {!['parcelamentos', 'rateios', 'forecast', 'evolucao', 'cartoes'].includes(abaAtiva) && (
        <div className="mes-seletor">
          <button className="mes-nav" onClick={() => navegarMes(-1)}>‹</button>
          <span className="mes-label">{NOMES_MES[mes]} {ano}</span>
          <button className="mes-nav" onClick={() => navegarMes(1)}>›</button>
        </div>
      )}

      <div className="rel-abas-scroll">
        <div className="rel-abas">
          {ABAS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`rel-aba ${abaAtiva === id ? 'active' : ''}`}
              onClick={() => setAbaAtiva(id)}
            >
              <Icon size={18} />
              <span className="aba-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rel-conteudo">
        <h2 className="rel-nome-ativo">
          {ABAS.find((a) => a.id === abaAtiva)?.label}
        </h2>

        {abaAtiva === 'fluxo' && <FluxoCaixaMensal {...relatorioProps} />}
        {abaAtiva === 'categorias' && <RelatorioCategoria {...relatorioProps} />}
        {abaAtiva === 'parcelamentos' && <ControleParcelamentos {...relatorioProps} />}
        {abaAtiva === 'rateios' && <ControleRateio {...relatorioProps} />}
        {abaAtiva === 'forecast' && <ForecastGastos {...relatorioProps} />}
        {abaAtiva === 'saldo-livre' && <QuantoPossoGastar {...relatorioProps} />}
        {abaAtiva === 'evolucao' && <EvolucaoFinanceira {...relatorioProps} />}
        {abaAtiva === 'cartoes' && <RelatorioCartoes despesas={despesas} cartoes={cartoes} />}
      </div>

      <style>{`
        .rel-page { display: flex; flex-direction: column; gap: 1.25rem; }

        .rel-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .rel-titulo { font-size: 1.4rem; font-weight: 900; color: #2D3436; }
        .rel-subtitulo { font-size: 0.8rem; color: #95A5A6; margin-top: 2px; }

        .rel-resumo {
          display: flex; align-items: center; gap: 0;
          background: #F8F9FA; border: 1px solid #F1F2F6;
          border-radius: 14px; padding: 1rem 1.25rem;
        }
        .rel-resumo-item { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
        .rel-resumo-sep { width: 1px; background: #F1F2F6; align-self: stretch; margin: 0 1rem; }
        .rel-resumo-label { color: #95A5A6; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .rel-resumo-valor { font-size: 1.2rem; font-weight: 800; }
        .rel-despesa { color: #E74C3C; }
        .rel-poupanca { color: #2ECC71; }

        .mes-seletor { display: flex; align-items: center; gap: 1rem; background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px; padding: 0.6rem 1rem; width: fit-content; }
        .mes-nav { background: none; border: none; font-size: 1.2rem; color: #C8A45A; cursor: pointer; font-weight: 700; padding: 0 0.25rem; }
        .mes-label { font-size: 0.9rem; font-weight: 700; color: #2D3436; min-width: 80px; text-align: center; }

        .rel-abas-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .rel-abas-scroll::-webkit-scrollbar { display: none; }
        .rel-abas { display: flex; gap: 0.5rem; background: #F1F2F6; padding: 0.3rem; border-radius: 14px; width: max-content; min-width: 100%; }
        .rel-aba { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: transparent; border: none; border-radius: 10px; padding: 0.5rem 0.85rem; cursor: pointer; min-width: 80px; color: #95A5A6; }
        .rel-aba.active { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); color: #C8A45A; }
        .aba-label { font-size: 0.65rem; font-weight: 600; white-space: nowrap; }

        .rel-conteudo { background: #fff; border: 1px solid #F1F2F6; border-radius: 16px; padding: 1.25rem; }
        .rel-nome-ativo { font-size: 1rem; font-weight: 800; color: #2D3436; margin-bottom: 1.25rem; }

        .relatorio-section { display: flex; flex-direction: column; gap: 0; }
        .estado-vazio-rel { text-align: center; padding: 3rem 1rem; color: #95A5A6; font-size: 0.88rem; line-height: 1.6; }

        @media (max-width: 480px) {
          .rel-header { flex-direction: column; gap: 0.75rem; }
          .rel-resumo { flex-direction: column; gap: 0.75rem; }
          .rel-resumo-sep { width: 100%; height: 1px; margin: 0; }
          .rel-aba { min-width: 60px; padding: 0.4rem 0.5rem; }
          .aba-label { font-size: 0.6rem; }
          .rel-conteudo { padding: 0.9rem; }
        }
      `}</style>
    </div>
  )
}
