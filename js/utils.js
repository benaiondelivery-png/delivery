const Utils = {
  showToast(message, type = 'info') {
    alert(message); // Simplificado para garantir funcionamento, pode voltar ao design original depois
  },
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
  },
  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },
  openGoogleMaps(origin, destination) {
    const cleanOrigin = encodeURIComponent(origin + ", Laranjal do Jari, AP");
    const cleanDest = encodeURIComponent(destination + ", Laranjal do Jari, AP");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${cleanOrigin}&destination=${cleanDest}&travelmode=motorcycle`;
    window.open(url, '_blank');
  },
  getStatusText(status) {
    const statusMap = {
      'aguardando_entregador': 'Buscando Entregador',
      'aceito': 'A caminho',
      'finalizado': 'Entregue ✅'
    };
    return statusMap[status] || status;
  }
};
window.Utils = Utils;
