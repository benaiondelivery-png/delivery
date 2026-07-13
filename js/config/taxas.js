// ========================================
// BENAION DELIVERY - TAXAS
// ========================================

export const TAXAS = Object.freeze({

  "Agreste": 6,
  "Nova Esperança": 6,
  "Prosperidade": 6,
  "Castanheira": 6,
  "Centro": 6,
  "José Cesário": 6,

  "Rio Branco": 7,
  "Cajari": 7,
  "Buritizal": 7,

  "Rodovia do Gogó": 8,
  "Sarney": 8,
  "Malvinas": 8,

  "Nazaré Mineiro": 10,

  "Samaúma": 15,

  "Monte Dourado": 30

});

export function getTaxa(bairro) {
  return TAXAS[bairro] ?? 0;
}

export function atualizarTaxa(bairro, valor) {
  if (bairro in TAXAS) {
    TAXAS[bairro] = Number(valor);
  }
}

export function listarTaxas() {
  return { ...TAXAS };
}
