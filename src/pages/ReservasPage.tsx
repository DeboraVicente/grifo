import CaixinhasPage from './CaixinhasPage'
import GastosPrevistosPage from './GastosPrevistosPage'
import type { useGastosPrevistos } from '../hooks/useGastosPrevistos'

export type SegmentoReservas = 'caixinhas' | 'previstos'

interface Props {
  segmento: SegmentoReservas
  onSegmento: (s: SegmentoReservas) => void
  previstosApi: ReturnType<typeof useGastosPrevistos>
  alertasPrevistos: number
}

/** Aba "Caixinhas": dinheiro guardado para metas e para gastos que vão voltar. */
export default function ReservasPage({ segmento, onSegmento, previstosApi, alertasPrevistos }: Props) {
  return (
    <div>
      <div className="rs-segmento">
        <button className={segmento === 'caixinhas' ? 'on' : ''} onClick={() => onSegmento('caixinhas')}>Caixinhas</button>
        <button className={segmento === 'previstos' ? 'on' : ''} onClick={() => onSegmento('previstos')}>
          Previstos {alertasPrevistos > 0 && <span className="rs-badge">{alertasPrevistos}</span>}
        </button>
      </div>

      {segmento === 'caixinhas' ? <CaixinhasPage /> : <GastosPrevistosPage previstosApi={previstosApi} />}

      <style>{`
        .rs-segmento { display: flex; background: #ECEFF1; border-radius: 12px; padding: 3px; margin-bottom: 1rem; max-width: 420px; }
        .rs-segmento button {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          border: none; background: none; border-radius: 10px; padding: 0.55rem;
          font-weight: 700; color: #95A5A6; cursor: pointer; font-family: inherit; font-size: 0.88rem;
        }
        .rs-segmento button.on { background: #FFF; color: #2D3436; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .rs-badge { background: #C8A45A; color: #FFF; border-radius: 999px; font-size: 0.7rem; padding: 1px 7px; }
      `}</style>
    </div>
  )
}
