/** Estilos dos formulários de conta e cartão (mesmo visual do formulário de despesas). */
export default function EstilosFormConta() {
  return (
    <style>{`
      .fc-form { display: flex; flex-direction: column; gap: 1.1rem; }
      .fc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
      @media (max-width: 480px) { .fc-grid { grid-template-columns: 1fr; } }

      .fc-field { display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; }
      .fc-field label {
        color: #95A5A6; font-size: 0.7rem; font-weight: 700;
        letter-spacing: 0.05em; text-transform: uppercase;
      }
      .fc-opcional { text-transform: none; letter-spacing: 0; font-weight: 500; color: #BDC3C7; }
      .fc-field input, .fc-field select {
        background: #F8F9FA; border: 1px solid #F1F2F6; border-radius: 12px;
        color: #2D3436; padding: 0.8rem 1rem; font-size: 0.95rem;
        outline: none; transition: all 0.2s; font-family: inherit; width: 100%;
      }
      .fc-field input:focus, .fc-field select:focus {
        border-color: #C8A45A; background: #FFFFFF; box-shadow: 0 0 0 4px rgba(200,164,90,0.05);
      }
      .fc-dica { color: #95A5A6; font-size: 0.74rem; line-height: 1.4; }
      .fc-erro { font-size: 0.82rem; padding: 0.55rem 0.75rem; border-radius: 8px; background: rgba(224,92,92,0.1); color: #e05c5c; }

      .fc-acoes {
        display: flex; justify-content: flex-end; gap: 0.75rem;
        padding-top: 1.1rem; border-top: 1px solid #F1F2F6;
      }
      .fc-btn-primario {
        background: #C8A45A; color: #FFFFFF; border: none; border-radius: 12px;
        padding: 0.85rem 1.6rem; font-size: 0.9rem; font-weight: 700;
        cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(200,164,90,0.2);
      }
      .fc-btn-primario:disabled { opacity: 0.5; }
      .fc-btn-secundario {
        background: transparent; color: #95A5A6; border: 1px solid #F1F2F6;
        border-radius: 12px; padding: 0.85rem 1.4rem; font-size: 0.9rem;
        font-weight: 600; cursor: pointer; font-family: inherit;
      }
      .fc-btn-secundario:hover { background: #F8F9FA; color: #636E72; }
      @media (max-width: 480px) {
        .fc-acoes { flex-direction: column-reverse; }
        .fc-btn-primario, .fc-btn-secundario { width: 100%; }
      }
    `}</style>
  )
}
