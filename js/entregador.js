// ========================================
// BENAION DELIVERY - PAINEL DO ENTREGADOR (V2.3)
// ========================================

let currentUser = null;
let pedidosEscutados = [];

async function initEntregador() {
  if (!window.Auth || !window.API || !window.auth) {
    setTimeout(initEntregador, 300);
    return;
  }

  if (!window.Auth.requireAuth(['entregador'])) return;
  currentUser = window.Auth.getCurrentUser();
  
  document.getElementById('entregadorNome').textContent = "Olá, " + currentUser.name.split(' ')[0];
  
  const perfil = await window.API.getUserProfile(currentUser.id);
  currentUser.online = perfil?.online || false;
  sincronizarUIStatus(currentUser.online);

  window.API.escutarTodosPedidos((pedidos) => {
    pedidosEscutados = pedidos;
    renderizarListas();
    atualizarEstatisticas();
  });
}

function sincronizarUIStatus(isOnline) {
  const indicator = document.getElementById('statusIndicator');
  const textNav = document.getElementById('navTextStatus');
  const iconNav = document.getElementById('navIconStatus');
  const btnHeader = document.getElementById('btnStatusHeader');

  if (isOnline) {
    if(indicator) {
      indicator.style.background = "#d4f8e2";
      indicator.style.color = "#2ecc71";
      indicator.innerHTML = '<i class="fas fa-circle" style="font-size: 8px;"></i> NO RADAR';
    }
    if(textNav) textNav.textContent = "Online";
    if(iconNav) iconNav.style.color = "#2ecc71";
    if(btnHeader) btnHeader.style.color = "#2ecc71";
  } else {
    if(indicator) {
      indicator.style.background = "#eee";
      indicator.style.color = "#95a5a6";
      indicator.innerHTML = '<i class="fas fa-circle" style="font-size: 8px;"></i> OFFLINE';
    }
    if(textNav) textNav.textContent = "Offline";
    if(iconNav) iconNav.style.color = "#95a5a6";
    if(btnHeader) btnHeader.style.color = "#666";
  }
}

async function toggleStatus() {
  const novoStatus = !currentUser.online;
  try {
    await window.API.updateUser(currentUser.id, { online: novoStatus });
    currentUser.online = novoStatus;
    localStorage.setItem('benaion_user', JSON.stringify(currentUser));
    sincronizarUIStatus(novoStatus);
    renderizarListas();
    window.Utils.showToast(novoStatus ? "Você está Online!" : "Você saiu do radar", "info");
  } catch (e) {
    window.Utils.showToast("Erro ao mudar status", "error");
  }
}

function renderizarListas() {
  const dispContainer = document.getElementById('listaPedidosDisponiveis');
  const minhasContainer = document.getElementById('listaMinhasEntregas');

  if (!dispContainer || !minhasContainer) return;

  // FILTRO CORRIGIDO: inclui 'pronto' e 'aguardando_entregador'
  const disponiveis = currentUser.online 
    ? pedidosEscutados.filter(p => 
        ['aguardando_entregador', 'pronto'].includes(p.status) && 
        !p.entregadorId
      )
    : [];

  const minhas = pedidosEscutados.filter(p => 
    p.entregadorId === currentUser.id && 
    ['aceito', 'em_entrega'].includes(p.status)
  );

  // Radar
  dispContainer.innerHTML = disponiveis.length === 0 
    ? `<div style="text-align:center; padding:40px; color:#999;">
        <i class="fas ${currentUser.online ? 'fa-box-open' : 'fa-toggle-off'} fa-2x" style="margin-bottom:10px;"></i>
        <p>${currentUser.online ? 'Sem pedidos no momento...' : 'Fique Online para ver o Radar'}</p>
       </div>`
    : disponiveis.map(p => `
      <div class="pedido-card animate__animated animate__fadeInUp" style="background:white; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-left:6px solid #E30613;">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div style="font-size: 13px;">
            <b style="color:#E30613;">DE:</b> ${p.bairroRetirada ? p.bairroRetirada.toUpperCase() : 'N/A'}<br>
            <b style="color:#333;">PARA:</b> ${p.bairro ? p.bairro.toUpperCase() : 'N/A'}
            <p style="margin-top:8px; color:#666; font-size:12px;">
              <i class="fas fa-box"></i> ${p.produto || 'Entrega Diversa'}
            </p>
            ${p.retiradaLocal ? `<p style="font-size:11px; color:#888;"><i class="fas fa-store"></i> ${p.retiradaLocal}</p>` : ''}
          </div>
          <div style="text-align:right;">
            <b style="color:#2ecc71; font-size:20px;">${window.Utils.formatCurrency(p.taxaEntrega)}</b>
          </div>
        </div>
        <button class="btn-action btn-aceitar" onclick="window.aceitarCorrida('${p.id}', this)" style="background:#E30613; color:white; width:100%; margin-top:10px; border-radius:10px; padding:12px; font-weight:800; border:none; cursor:pointer;">ACEITAR ENTREGA</button>
      </div>
    `).join('');

  // Minhas Entregas
  minhasContainer.innerHTML = minhas.length === 0
    ? '<div style="text-align:center; padding:30px; color:#999;">Sem entregas ativas.</div>'
    : minhas.map(p => `
      <div class="card" style="border-left: 6px solid #3498db; margin-bottom:12px; border-radius:15px; background: white; padding: 15px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <b style="font-size:12px; color:#3498db;">#${p.id.substring(0,6).toUpperCase()}</b>
          <span class="badge" style="background:#3498db; color:white; font-size:10px; padding:2px 8px; border-radius:10px;">${window.Utils.getStatusText(p.status).toUpperCase()}</span>
        </div>
        <div style="font-size:13px; margin-bottom:15px; color:#444;">
          <p><i class="fas fa-store"></i> <b>Retirada:</b> ${p.retiradaLocal || 'Loja'} (${p.bairroRetirada || 'N/A'})</p>
          <p><i class="fas fa-map-marker-alt"></i> <b>Entrega:</b> ${p.entregaLocal || 'Endereço'} (${p.bairro || 'N/A'})</p>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <button class="btn-action" style="background:#f1f1f1; color:#333; border-radius:10px; padding:12px; font-weight:800; border:none; cursor:pointer;" onclick="window.Utils.openGoogleMaps('${p.bairroRetirada}', '${p.bairro}')">🗺️ ROTA</button>
          <button class="btn-action" style="background:#2ecc71; color:white; border-radius:10px; padding:12px; font-weight:800; border:none; cursor:pointer;" onclick="window.finalizarEntrega('${p.id}')">✅ ENTREGUE</button>
        </div>
      </div>
    `).join('');
}

async function aceitarCorrida(id, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = "PROCESSANDO...";
  }
  
  try {
    await window.API.updatePedido(id, {
      entregadorId: currentUser.id,
      entregadorNome: currentUser.name,
      status: 'aceito',
      aceito_em: Date.now()
    });
    window.Utils.showToast("Pedido aceito! Boa entrega.", "success");
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    mostrarAba('minhas');
  } catch (e) {
    window.Utils.showToast("Este pedido já foi pego por outro entregador.", "error");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "ACEITAR ENTREGA";
    }
  }
}

async function finalizarEntrega(id) {
  if (confirm("Confirmar que você finalizou esta entrega?")) {
    try {
      await window.API.updatePedido(id, { 
        status: 'finalizado',
        finalizado_em: Date.now()
      });
      window.Utils.showToast("Ganhos adicionados!", "success");
    } catch (e) {
      window.Utils.showToast("Erro ao finalizar.", "error");
    }
  }
}

function atualizarEstatisticas() {
  const hojeStr = new Date().toLocaleDateString();
  
  const concluidosHoje = pedidosEscutados.filter(p => {
    if (p.entregadorId !== currentUser.id || p.status !== 'finalizado') return false;
    const dataFinalizado = p.finalizado_em ? new Date(p.finalizado_em).toLocaleDateString() : '';
    return dataFinalizado === hojeStr;
  });

  const ganhos = concluidosHoje.reduce((acc, p) => acc + (parseFloat(p.taxaEntrega) || 0), 0);
  
  const statHoje = document.getElementById('statHoje');
  const statSaldo = document.getElementById('statSaldo');
  if (statHoje) statHoje.textContent = concluidosHoje.length;
  if (statSaldo) statSaldo.textContent = window.Utils.formatCurrency(ganhos);
}

function mostrarAba(aba) {
  const disp = document.getElementById('abaDisponiveis');
  const minhas = document.getElementById('abaMinhas');
  const btnDisp = document.getElementById('btnTabDisp');
  const btnMinhas = document.getElementById('btnTabMinhas');

  if (disp) disp.classList.toggle('hidden', aba !== 'disponiveis');
  if (minhas) minhas.classList.toggle('hidden', aba !== 'minhas');
  if (btnDisp) btnDisp.className = aba === 'disponiveis' ? 'btn btn-primary' : 'btn btn-outline';
  if (btnMinhas) btnMinhas.className = aba === 'minhas' ? 'btn btn-primary' : 'btn btn-outline';
  
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  if (navItems[0]) navItems[0].classList.toggle('active', aba === 'disponiveis');
}

// Expor funções globalmente
window.toggleStatus = toggleStatus;
window.aceitarCorrida = aceitarCorrida;
window.finalizarEntrega = finalizarEntrega;
window.mostrarAba = mostrarAba;

document.addEventListener('DOMContentLoaded', initEntregador);
