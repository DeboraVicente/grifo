import { auth } from './firebase'

/**
 * Ao sair ou excluir a conta, o Firestore encerra as assinaturas abertas com
 * "permission-denied" antes de o React desmontar os componentes. Esse erro é
 * esperado e não deve poluir o console.
 */
export function sessaoEncerrada(err: unknown): boolean {
  return (err as { code?: string })?.code === 'permission-denied' && !auth.currentUser
}

/** Registra um erro de leitura, exceto o esperado ao encerrar a sessão. */
export function registrarErroLeitura(contexto: string, err: unknown) {
  if (sessaoEncerrada(err)) return
  console.error(`${contexto}:`, err)
}
