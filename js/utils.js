// ========================================
// BENAION DELIVERY - UTILITÁRIOS (V2.2)
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

  // 2. MODAIS
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  },

  // 3. GOOGLE MAPS
  openGoogleMaps(origem, destino) {
    let url;
    if (destino) {
      // Rota de origem até destino
      const de = encodeURIComponent(`${origem}, Laranjal do Jari, AP`);
      const para = encodeURIComponent(`${destino}, Laranjal do Jari, AP`);
      url = `https://www.google.com/maps/dir/?api=1&origin=${de}&destination=${para}&travelmode=motorcycle`;
    } else {
      // Apenas destino
      const endereco = encodeURIComponent(`${origem}, Laranjal do Jari, AP`);
      url = `https://www.google.com/maps/dir/?api=1&destination=${endereco}&travelmode=motorcycle`;
    }
    window.open(url, '_blank');
  },

  // 4. WHATSAPP
  openWhatsApp(telefone, mensagem) {
    if (!telefone) {
      this.showToast("Número de telefone não disponível", "warning");
      return;
    }
    const numero = telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  },

  // 5. FORMATAÇÃO
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  },

  formatDate(timestamp) {
    if (!timestamp) return '---';
    const data = new Date(timestamp);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // 6. CÁLCULO DE ADICIONAL POR TEMPO DE ESPERA
  calcularAdicionalTempo(timestampInicio) {
    if (!timestampInicio) return 0;
    const inicio = timestampInicio.seconds ? timestampInicio.seconds * 1000 : timestampInicio;
    const diffMs = Date.now() - inicio;
    const diffMinutos = Math.floor(diffMs / 60000);

    if (diffMinutos > 3) {
      return (diffMinutos - 3) * 0.30;
    }
    return 0;
  },

  // 7. STATUS TEXTO
  getStatusText(status) {
    const statusMap = {
      'pendente': 'Aguardando Loja',
      'preparando': 'Preparando...',
      'pronto': 'Pronto para Coleta',
      'aguardando_entregador': 'No Radar',
      'aceito': 'Motoboy a Caminho',
      'em_entrega': 'Saiu para Entrega',
      'finalizado': 'Concluído ✅',
      'cancelado': 'Cancelado ✕'
    };
    return statusMap[status] || status;
  },

  // 8. VIBRAÇÃO
  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  },

  // 9. CONFIRMAÇÃO
  confirmar(mensagem) {
    return new Promise((resolve) => {
      if (confirm(mensagem)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }
};

window.Utils = Utils;
