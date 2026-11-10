interface Props {
  label: string
  membros: { uid: string; nome: string }[]
  valor?: string
  onChange: (uid: string) => void
}

/** Escolha de um membro da família (ex.: quem pagou, quem recebeu). */
export default function SeletorMembro({ label, membros, valor, onChange }: Props) {
  return (
    <div className="seletor-membro">
      <span className="seletor-membro-label">{label}</span>
      <div className="tipo-tabs seletor-membro-opcoes" role="radiogroup" aria-label={label}>
        {membros.map((m) => (
          <button key={m.uid} type="button" role="radio" aria-checked={valor === m.uid}
            className={`tipo-tab-btn ${valor === m.uid ? 'active' : ''}`}
            onClick={() => onChange(m.uid)}>
            {m.nome || 'Membro'}
          </button>
        ))}
      </div>
      <style>{`
        .seletor-membro { display: flex; flex-direction: column; gap: 0.4rem; }
        .seletor-membro-label {
          color: #2D3436; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .seletor-membro-opcoes { flex-wrap: wrap; }
        .seletor-membro-opcoes .tipo-tab-btn { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  )
}
