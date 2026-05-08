const Utils = {
  showToast(message, type = 'info') {
    const colors = { success: '#2ecc71', error: '#e30613', info: '#3498db' };
    console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
    // Se quiseres um visual melhor que o alert, podes usar a biblioteca Toastify aqui
    alert(`${type.toUpperCase()}: ${message}`);
  },

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('animate__animated', 'animate__fadeIn');
    }
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  },

  updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },

  openGoogleMaps(origin, destination) {
    const cleanOrigin = encodeURIComponent(origin + ", Laranjal do Jari, AP");
    const cleanDest = encodeURIComponent(destination + ", Laranjal do Jari, AP");
    // URL Corrigida para a API oficial do Google Maps
    const url = `https://www.google.com/maps/dir/?api=1&origin=${cleanOrigin}&destination=${cleanDest}&travelmode=motorcycle`;
    window.open(url, '_blank');
  },

  getStatusText(status) {
    const statusMap = {
      'aguardando_entregador': 'Buscando Entregador',
      'aceito': 'A caminho',
      'finalizado': 'Entregue ✅',
      'cancelado': 'Cancelado ❌',
      'preparando': 'Na Cozinha 🍳'
    };
    return statusMap[status] || status;
  }
};
window.Utils = Utils;
