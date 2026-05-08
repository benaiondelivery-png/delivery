// ========================================
// BENAION DELIVERY - UTILITÁRIOS (V2.1)
// ========================================

const Utils = {
  // 1. NOTIFICAÇÕES (Toasts elegantes)
  showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    // Adicionamos classes de animação da Animate.css que você já usa no projeto
    toast.className = `toast toast-${type} animate__animated animate__fadeInRight`;
    
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Vibe suave ao receber notificação (se for erro ou sucesso)
    if(type === 'error') this.vibrate([100, 50, 100]);
    if(type === 'success') this.vibrate(50);

    setTimeout(() => {
      toast.classList.replace('animate__fadeInRight', 'animate__fadeOutRight');
      setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }
      }, 500);
    }, duration);
  },

  // 2. MODAIS (Suporte a animações CSS)
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  // 3. GOOGLE MAPS (Link corrigido para navegação GPS)
  openGoogleMaps(bairroDestino) {
    // Simplificado: No Jari, o nome do bairro + cidade já basta para o GPS
    const endereco = encodeURIComponent(`${bairroDestino}, Laranjal do Jari, AP`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${endereco}&travelmode=motorcycle`;
    window.open(url, '_blank');
  },

  // 4. FORMATAÇÃO E LÓGICA
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  calcularAdicionalTempo(timestampInicio) {
    if (!timestampInicio) return 0;
    // Lida com Timestamp do Firebase ou Milissegundos padrão
    const inicio = timestampInicio.seconds ? timestampInicio.seconds * 1000 : timestampInicio;
    const diffMs = Date.now() - inicio;
    const diffMinutos = Math.floor(diffMs / 60000);

    // Regra Benaion: Após 3 minutos, R$ 0,30 por minuto extra
    if (diffMinutos > 3) {
      return (diffMinutos - 3) * 0.30;
    }
    return 0;
  },

  getStatusText(status) {
    const statusMap = {
      'pendente': 'Aguardando Loja',
      'preparando': 'Preparando...',
      'pronto': 'Pronto para Coleta',
      'aguardando_entregador': 'No Radar (Buscando Motoboy)',
      'aceito': 'Motoboy a Caminho',
      'em_entrega': 'Saiu para Entrega',
      'finalizado': 'Concluído ✅',
      'cancelado': 'Cancelado ✕'
    };
    return statusMap[status] || status;
  },

  // 5. UTILITÁRIOS DE DISPOSITIVO
  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }
};

window.Utils = Utils;
