// ========================================
// BENAION DELIVERY - UTILS PREMIUM (V3.5)
// ========================================

const Utils = {
  // Sons do sistema
  sons: {
    pedidoNovo: null,
    pedidoAceito: null,
    entregaFinalizada: null,
    
    inicializar() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();
      } catch(e) {}
    },
    
    tocar(tipo) {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        const sons = {
          pedidoNovo: { freq: 880, duracao: 0.2 },
          pedidoAceito: { freq: 660, duracao: 0.3 },
          sucesso: { freq: 1000, duracao: 0.15 },
          erro: { freq: 200, duracao: 0.4 }
        };
        
        const config = sons[tipo] || sons.sucesso;
        osc.frequency.value = config.freq;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(this.ctx.currentTime + config.duracao);
      } catch(e) {}
    }
  },

  // Toast melhorado com som
  showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
    container.appendChild(toast);

    if (type === 'success') { this.sons.tocar('sucesso'); this.vibrate(30); }
    if (type === 'error') { this.sons.tocar('erro'); this.vibrate([100, 50, 100]); }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.add('active'); modal.style.display = 'flex'; }
  },

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
  },

  openGoogleMaps(origem, destino) {
    const de = encodeURIComponent(`${origem}, Laranjal do Jari, AP`);
    const para = encodeURIComponent(`${destino}, Laranjal do Jari, AP`);
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${de}&destination=${para}&travelmode=motorcycle`, '_blank');
  },

  openWhatsApp(telefone, mensagem) {
    if (!telefone) { this.showToast("Telefone não disponível", "warning"); return; }
    window.open(`https://wa.me/55${telefone.replace(/\D/g,'')}?text=${encodeURIComponent(mensagem)}`, '_blank');
  },

  formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  },

  formatDate(ts) {
    if (!ts) return '---';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  },

  getStatusText(s) {
    const map = {
      pendente:'📝 Pendente', preparando:'👨‍🍳 Preparando', pronto:'📦 Pronto',
      aguardando_entregador:'🔍 No Radar', aceito:'🛵 Motoboy a Caminho',
      em_entrega:'🚀 Em Entrega', finalizado:'✅ Entregue', cancelado:'❌ Cancelado'
    };
    return map[s] || s;
  },

  // Gerar código de 4 dígitos
  gerarCodigo() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  // Calcular tempo estimado
  estimarTempo(bairroOrigem, bairroDestino) {
    const tempos = {
      'Centro': { 'Agreste': 15, 'Cajari': 12, 'Sarney': 10, 'Buritizal': 18, 'Malvinas': 15 },
      'Agreste': { 'Centro': 15, 'Cajari': 10, 'Sarney': 15 },
      'Cajari': { 'Centro': 12, 'Agreste': 10, 'Sarney': 12 },
    };
    return (tempos[bairroOrigem] && tempos[bairroOrigem][bairroDestino]) || 20;
  },

  vibrate(p = [200]) { if ('vibrate' in navigator) navigator.vibrate(p); },

  confirmar(msg) { return confirm(msg); }
};

// Inicializar sons
Utils.sons.inicializar();

window.Utils = Utils;
