import type { Despesa, Receita } from '../../types'
import { calcQuantoPossoGastar, fmt } from '../../hooks/useRelatorios'

interface Props {
  despesas: Despesa[]
  receitas: Receita[]
  userId: string
  mes: number
  ano: number
}

export default function QuantoPossoGastar({ despesas, receitas, userId, mes, ano }: Props) {
  const dados = calcQuantoPossoGastar(despesas, receitas, userId, mes, ano)

  const disponivel = dados.disponivel
  const positivo = disponivel >= 0
  const alerta = dados.receitasMes > 0 && dados.percentualGasto >= 80

  if (dados.receitasMes === 0) {
    return (
      <div className="estado-vazio-rel">
        Nenhuma receita registrada para este mês.
        <br />
        Adicione uma receita para ver quanto você pode gastar.
      </div>
    )
  }

  return (
    <div className="relatorio-section">
      <div className={`qpg-destaque ${positivo ? 'positivo' : 'negativo'}`}>
        <span className="qpg-label">Você ainda pode gastar</span>
        <span className="qpg-valor">{fmt(Math.abs(disponivel))}</span>
        {!positivo && <span className="qpg-alerta">Orçamento excedido</span>}
        {alerta && positivo && <span className="qpg-alerta-aviso">Atenção: mais de 80% comprometido</span>}
        <span className="qpg-media">
          Média diária: {fmt(dados.mediaDiaria > 0 ? dados.mediaDiaria : 0)} / dia ({dados.diasRestantes} dias restantes)
        </span>
      </div>

      <div className="qpg-progress-section">
        <div className="qpg-progress-label">
          <span>Orçamento comprometido</span>
          <span className={alerta ? 'qpg-pct-alerta' : ''}>{dados.percentualGasto}%</span>
        </div>
        <div className="qpg-bar">
          <div
            className={`qpg-fill ${alerta ? 'alerta' : ''} ${!positivo ? 'excedido' : ''}`}
            style={{ width: `${Math.min(100, dados.percentualGasto)}%` }}
          />
        </div>
      </div>

      <div className="qpg-breakdown">
        <div className="qpg-linha">
          <span className="qpg-linha-label">Receitas do mês</span>
          <span className="qpg-linha-val receita">{fmt(dados.receitasMes)}</span>
        </div>
        <div className="qpg-linha">
          <span className="qpg-linha-label">Despesas realizadas</span>
          <span className="qpg-linha-val despesa">− {fmt(dados.despesasRealizadas)}</span>
        </div>
        <div className="qpg-linha">
          <span className="qpg-linha-label">Compromissos futuros</span>
          <span className="qpg-linha-val despesa">− {fmt(dados.despesasFuturas)}</span>
        </div>
        <div className="qpg-linha total">
          <span className="qpg-linha-label">Disponível</span>
          <span className={`qpg-linha-val ${positivo ? 'receita' : 'despesa'}`}>{fmt(disponivel)}</span>
        </div>
      </div>

      <style>{`
        .qpg-destaque { border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .qpg-destaque.positivo { background: #F0FDF4; border: 1px solid #BBF7D0; }
        .qpg-destaque.negativo { background: #FEF2F2; border: 1px solid #FCA5A5; }
        .qpg-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #95A5A6; }
        .qpg-valor { font-size: 2rem; font-weight: 900; color: #2D3436; letter-spacing: -0.03em; }
        .qpg-alerta { font-size: 0.75rem; font-weight: 700; color: #E74C3C; }
        .qpg-alerta-aviso { font-size: 0.75rem; font-weight: 700; color: #F39C12; }
        .qpg-media { font-size: 0.78rem; color: #95A5A6; margin-top: 0.25rem; }

        .qpg-progress-section { margin-bottom: 1.25rem; }
        .qpg-progress-label { display: flex; justify-content: space-between; font-size: 0.8rem; color: #636e72; font-weight: 600; margin-bottom: 0.4rem; }
        .qpg-pct-alerta { color: #E74C3C; font-weight: 800; }
        .qpg-bar { height: 10px; background: #F1F2F6; border-radius: 10px; overflow: hidden; }
        .qpg-fill { height: 100%; background: #C8A45A; border-radius: 10px; transition: width 0.4s; }
        .qpg-fill.alerta { background: #F39C12; }
        .qpg-fill.excedido { background: #E74C3C; }

        .qpg-breakdown { display: flex; flex-direction: column; gap: 0.5rem; }
        .qpg-linha { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.75rem; background: #F8F9FA; border-radius: 10px; font-size: 0.85rem; }
        .qpg-linha.total { border-top: 2px solid #F1F2F6; background: #fff; font-weight: 700; }
        .qpg-linha-label { color: #636e72; }
        .qpg-linha-val { font-weight: 700; }
        .qpg-linha-val.receita { color: #2ECC71; }
        .qpg-linha-val.despesa { color: #E74C3C; }
      `}</style>
    </div>
  )
}
