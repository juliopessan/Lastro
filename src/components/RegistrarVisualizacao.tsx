"use client";

import { useEffect } from "react";

// Avisa o servidor que a proposta foi aberta, depois de a página carregar no
// navegador. Só é renderizado para quem não está logado (o cliente); robôs de
// prévia de link normalmente nem executam isto (ver lib/visualizacao).
export function RegistrarVisualizacao({ propostaId }: { propostaId: string }) {
  useEffect(() => {
    fetch(`/api/proposals/${propostaId}/visualizacao`, { method: "POST", keepalive: true }).catch(() => {
      // Contagem é informativa: se falhar, a página segue normal.
    });
  }, [propostaId]);
  return null;
}
