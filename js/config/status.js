// ========================================
// BENAION DELIVERY - STATUS DOS PEDIDOS
// ========================================

export const STATUS = Object.freeze({

  PENDENTE: "pendente",

  PREPARANDO: "preparando",

  PRONTO: "pronto",

  AGUARDANDO_ENTREGADOR: "aguardando_entregador",

  ACEITO: "aceito",

  EM_ENTREGA: "em_entrega",

  FINALIZADO: "finalizado",

  CANCELADO: "cancelado"

});

export const STATUS_TEXTO = Object.freeze({

  pendente: "📝 Pendente",

  preparando: "👨‍🍳 Preparando",

  pronto: "📦 Pronto",

  aguardando_entregador: "🔍 No Radar",

  aceito: "🛵 Motoboy Aceitou",

  em_entrega: "🚀 Em Entrega",

  finalizado: "✅ Finalizado",

  cancelado: "❌ Cancelado"

});

export function getStatusTexto(status) {
  return STATUS_TEXTO[status] || status;
}
