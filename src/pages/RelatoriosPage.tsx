import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpDown, FolderOpen, CalendarDays, TrendingUp, Lightbulb, LineChart, CreditCard,
} from 'lucide-react'
import { useDespesas } from '../hooks/useDespesas'
import { useReceitas } from '../hooks/useReceitas'
import { useCartoes } from '../hooks/useCartoes'
import { useAuthContext } from '../lib/AuthContext'
import FluxoCaixaMensal from '../components/relatorios/FluxoCaixaMensal'
import RelatorioCategoria from '../components/relatorios/RelatorioCategoria'
import ControleParcelamentos from '../components/relatorios/ControleParcelamentos'
import ForecastGastos from '../components/relatorios/ForecastGastos'
import QuantoPossoGastar from '../components/relatorios/QuantoPossoGastar'
import EvolucaoFinanceira from '../components/relatorios/EvolucaoFinanceira'
import RelatorioCartoes from '../components/relatorios/RelatorioCartoes'

type RelatorioTipo =
  | 'fluxo'
  | 'categorias'
  | 'parcelamentos'
  | 'forecast'
  | 'saldo-livre'
  | 'evolucao'
  | 'cartoes'

const ABAS: { id: RelatorioTipo; label: string; Icon: LucideIcon }[] = [
  { id: 'fluxo', label: 'Fluxo Mensal', Icon: ArrowUpDown },
  { id: 'categorias', label: 'Categorias', Icon: FolderOpen },
  { id: 'parcelamentos', label: 'Parcelamentos', Icon: CalendarDays },
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
  const { receitas } = useReceitas(user?.uid)
  const { cartoes } = useCartoes(user?.uid)


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
  const totalMes = despesas.reduce((total, d) => {
    if (d.listaParcelas?.length > 0) {
      return total + d.listaParcelas
        .filter(p => p.dataVencimento?.startsWith(mesStr))
        .reduce((s, p) => s + p.valor, 0)
    }
    return !d.pago && d.data?.startsWith(mesStr) ? total + d.valorTotal : total
  }, 0)

  const isTemporal = !['parcelamentos', 'forecast', 'evolucao', 'cartoes'].includes(abaAtiva);

  const relatorioProps = { despesas, receitas, userId: user?.uid ?? '', mes, ano }

  return (
    <div className="rel-page">
      <div className="rel-header">
        <div>
          <h1 className="rel-titulo">Relatórios</h1>
          <p className="rel-subtitulo">Visão completa das suas finanças</p>
        </div>
        <div className={`mes-seletor ${!isTemporal ? 'desabilitado' : ''}`}>
          <button className="mes-nav" onClick={() => isTemporal && navegarMes(-1)} disabled={!isTemporal}>‹</button>
          <span className="mes-label">{NOMES_MES[mes]} {ano}</span>
          <button className="mes-nav" onClick={() => isTemporal && navegarMes(1)} disabled={!isTemporal}>›</button>
        
        </div>
      </div>

      {isTemporal && (
        <div className="rel-resumo">
          <div className="rel-resumo-item">
            <span className="rel-resumo-label">
              Despesa de {NOMES_MES[mes]}
            </span>
            <span className="rel-resumo-valor rel-despesa">
              {fmt(totalMes)}
            </span>
          </div>
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
       <header className="conteudo-header">
           <h2 className="rel-nome-ativo">{ABAS.find((a) => a.id === abaAtiva)?.label}</h2>
           {!isTemporal && <span className="tag-global">Dados Gerais</span>}
        </header>

        {abaAtiva === 'fluxo' && <FluxoCaixaMensal {...relatorioProps} />}
        {abaAtiva === 'categorias' && <RelatorioCategoria {...relatorioProps} />}
        {abaAtiva === 'parcelamentos' && <ControleParcelamentos {...relatorioProps} />}
        {abaAtiva === 'forecast' && <ForecastGastos {...relatorioProps} />}
        {abaAtiva === 'saldo-livre' && <QuantoPossoGastar {...relatorioProps} />}
        {abaAtiva === 'evolucao' && <EvolucaoFinanceira {...relatorioProps} />}
        {abaAtiva === 'cartoes' && <RelatorioCartoes despesas={despesas} cartoes={cartoes} />}
      </div>

      <style>{`
        .rel-page { display: flex; flex-direction: column; gap: 1.25rem; }

        .rel-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .rel-header-container { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          gap: 1rem;
        }
        .rel-titulo { font-size: 1.5rem; font-weight: 500; color: #2D3436; letter-spacing: -0.02em; }
        .rel-subtitulo { font-size: 0.85rem; color: #95A5A6; }

        .rel-resumo {
          display: flex; align-items: center; gap: 0;
          background: #FFFFFF; border: 1px solid #F1F2F6;
          border-radius: 16px; padding: 1.25rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .rel-resumo-item { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
        .rel-resumo-sep { width: 1px; background: #F1F2F6; align-self: stretch; margin: 0 1rem; }
        .rel-resumo-label { color: #95A5A6; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .rel-resumo-valor { font-size: 1.5rem; font-weight: 800; color: #2D3436; margin-top: 4px; display: block; }
        .rel-despesa { color: #E74C3C; }
        .rel-poupanca { color: #2ECC71; }

        .mes-seletor { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          background: #FFFFFF; 
          border: 1px solid #F1F2F6; 
          border-radius: 12px; 
          padding: 0.4rem 0.8rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          position: relative;
          transition: all 0.3s ease;
        }
        .mes-seletor.desabilitado { 
          opacity: 0.5; 
          background: #F8F9FA; 
          filter: grayscale(1);
          cursor: not-allowed;
        }
        .mes-nav { 
          background: #F8F9FA; 
          border: none; 
          width: 28px; 
          height: 28px; 
          border-radius: 8px; 
          color: #C8A45A; 
          cursor: pointer; 
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mes-label { 
          font-size: 0.85rem; 
          font-weight: 200; 
          color: #2D3436; 
          min-width: 85px; 
          text-align: center; 
        }

        .rel-abas-scroll { margin: 0 -1.25rem; padding: 0 1.25rem; overflow-x: auto; scrollbar-width: none; }        .rel-abas-scroll::-webkit-scrollbar { display: none; }
        .rel-abas { display: flex; gap: 0.6rem; padding: 0.2rem; width: max-content; }
        .rel-aba { 
          display: flex; 
          flex-direction: row; 
          align-items: center; 
          gap: 0.6rem; 
          background: #FFFFFF; 
          border: 1px solid #F1F2F6; 
          border-radius: 12px; 
          padding: 0.6rem 1rem; 
          cursor: pointer; 
          color: #95A5A6;
          transition: all 0.2s;
        }
        .rel-aba.active { 
          background: #C8A45A; 
          color: #FFFFFF; 
          border-color: #C8A45A;
          box-shadow: 0 4px 12px rgba(200,164,90,0.3);
        }
        .aba-label { font-size: 0.8rem; font-weight: 600; white-space: nowrap; }

        .rel-conteudo { 
          background: #FFFFFF; 
          border: 1px solid #F1F2F6; 
          border-radius: 20px; 
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }
        .conteudo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .rel-nome-ativo { font-size: 1.1rem; font-weight: 800; color: #2D3436; margin: 0; }
        .tag-global { background: #F1F2F6; color: #95A5A6; font-size: 0.65rem; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }

        .relatorio-section { display: flex; flex-direction: column; gap: 0; }
        .estado-vazio-rel { text-align: center; padding: 3rem 1rem; color: #95A5A6; font-size: 0.88rem; line-height: 1.6; }

        @media (max-width: 600px) {
          .rel-header-container { flex-direction: column; align-items: flex-start; }
          .mes-seletor { width: 100%; justify-content: space-between; }
          .rel-aba { padding: 0.5rem 0.8rem; }
        }
      `}</style>
    </div>
  )
}
