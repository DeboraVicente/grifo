import { Lock } from 'lucide-react'
import type { Despesa, InfoFamilia } from '../../types'
import { etiquetaDespesa } from '../../lib/escopo'

export default function EtiquetaEscopo({ despesa, familia }: { despesa: Despesa; familia?: InfoFamilia }) {
  const e = etiquetaDespesa(despesa, familia)
  if (!e) return null
  return (
    <span className={`etiqueta-escopo ${e.tipo}`}>
      {e.tipo === 'pessoal' && <Lock size={10} />} {e.texto}
      <style>{`
        .etiqueta-escopo {
          display: inline-flex; align-items: center; gap: 3px; width: fit-content;
          font-size: 0.68rem; font-weight: 700; border-radius: 6px; padding: 0.1rem 0.4rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
        }
        .etiqueta-escopo.familiar { background: rgba(200,164,90,0.12); color: #A8853F; }
        .etiqueta-escopo.pessoal { background: #F1F2F6; color: #636E72; }
      `}</style>
    </span>
  )
}
