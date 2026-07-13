// ========================================
// BENAION DELIVERY - BAIRROS
// ========================================

export const BAIRROS = Object.freeze([
  "Agreste",
  "Nova Esperança",
  "Prosperidade",
  "Castanheira",
  "Centro",
  "José Cesário",
  "Mirilândia",
  "Rio Branco",
  "Cajari",
  "Buritizal",
  "Rodovia do Gogó",
  "Sarney",
  "Malvinas",
  "Nazaré Mineiro",
  "Samaúma",
  "Monte Dourado"
]);

export function bairroExiste(nome) {
  return BAIRROS.includes(nome);
}

export function listarBairros() {
  return [...BAIRROS];
}
