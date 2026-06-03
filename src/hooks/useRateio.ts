// Arquivo mantido para compatibilidade — funcionalidade de rateio removida
export function useRateioRecebido(_userId: string | undefined) {
  return { despesasRateadas: [], responderRateio: async () => {}, pagarParteRateio: async () => {} }
}

export function useCompartilhadoRecebido(_userId: string | undefined) {
  return { despesasCompartilhadas: [], responderCompartilhamento: async () => {} }
}
