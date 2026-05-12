// ========================================
// BENAION DELIVERY - PAINEL ADMIN (V2.3)
// ========================================

let todosPedidos = [];
let filtroAtual = 'todos';

async function initAdmin() {
  if (!window.Auth || !window.API || !window.db) {
    setTimeout(initAdmin, 300);
    return;
  }

  if (!window.Auth.requireAuth(['admin'])) return;
  
  console.log('🚀 Benaion Admin: Painel operacional conectado.');

  window.API.escutarTodosPedidos((pedidos) => {
    todosPedidos = pedidos.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    atualizarInterfaceAdmin();
    renderizarPedidosAdmin();
  });

  setTimeout(carregarConfiguracoesTaxas, 1000);
}

function atualizarInterfaceAdmin() {
  const hoje = new Date().toLocaleDateString();
  
  const pedidosHoje = todosPedidos.filter(p => {
    const data = new Date(p.created_at);
    return data.toLocaleDateString() === hoje;
  });

  const ativos = todosPedidos.filter(p => 
    ['pendente', 'preparando', 'aguardando_entregador', 'aceito', 'em_entrega'].includes(p.status)
  ).length;
  
  updateStat('statPedidosHoje', pedidosHoje.length);
  updateStat('statPedidosAtivos', ativos);
  
  const faturamentoTaxas = pedidosHoje.reduce((acc, curr) => acc + (curr.taxaEntrega || 0), 0);
  updateStat('statFaturamento', window.Utils.formatCurrency(faturamentoTaxas));
}

function updateStat(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function carregarConfiguracoesTaxas() {
  const container = document.getElementById('listaConfigTaxas');
  if (!container) return;

  const taxas = window.TAXAS_LOCAIS || {};

  const todosBairros = [
    "Agreste", "Nova esperança", "Prosperidade", "Castanheira", "Cajari", 
    "Rodovia do gogó", "buritizal", "Sarney", "Nazaré mineiro", "centro", 
    "mirilandia", "Rio branco", "José cesário", "Malvinas", "samaúma", "monte dourado"
  ];

  container.innerHTML = todosBairros.map(bairro => `
    <div class="taxa-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
      <span style="font-weight: 500; font-size: 14px;">${bairro}</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: #666;">R$</span>
        <input type="number" step="0.50" class="input-taxa-dinamica" data-bairro="${bairro}" 
               value="${taxas[bairro] || '6.00'}" 
               style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 6px; text-align: center; font-weight: bold;">
      </div>
    </div>
  `).join('');
}

async function salvarNovasTaxas() {
  const btn = document.getElementById('btnSalvarTaxas');
  const inputs = document.querySelectorAll('.input-taxa-dinamica');
  const novaTabela = {};

  inputs.forEach(input => {
    novaTabela[input.dataset.bairro] = parseFloat(input.value) || 6.00;
  });

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "SALVANDO...";
    }
    
    await window.API.salvarTaxas(novaTabela);
    window.Utils.showToast("Tabela de Taxas atualizada!", "success");
  } catch (err) {
    window.Utils.showToast("Erro ao sincronizar taxas", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Salvar Taxas";
    }
  }
}

function filtrarPedidos(status) {
  filtroAtual = status;
  renderizarPedidosAdmin();
  
  document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
}

function renderizarPedidosAdmin() {
  const container = document.getElementById('containerPedidosAdmin');
  if (!container) return;

  const pedidosFiltrados = filtroAtual === 'todos' 
    ? todosPedidos 
    : todosPedidos.filter(p => p.status === filtroAtual);

  if (pedidosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#999;">
        <i class="fas fa-search fa-2x"></i>
        <p style="margin-top:10px;">Nenhum pedido encontrado.</p>
      </div>`;
    return;
  }

  container.innerHTML = pedidosFiltrados.map(p => `
    <div class="card-pedido-admin animate__animated animate__fadeInUp" style="border-left: 5px solid ${getStatusColorAdmin(p.status)}; background:white; padding:15px; margin-bottom:12px; border-radius:10px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <b style="font-size: 15px; color: #333;">#${(p.id || '').substring(0, 6).toUpperCase()}</b>
          <div style="font-size: 11px; color: #e30613; font-weight: bold;">${p.lojaNome || 'PEDIDO AVULSO'}</div>
        </div>
        <span class="badge" style="background: ${getStatusColorAdmin(p.status)}; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: bold;">
          ${window.Utils.getStatusText(p.status).toUpperCase()}
        </span>
      </div>
      
      <div style="margin: 15px 0; font-size: 13px; color: #444;">
        <div style="margin-bottom: 5px;">
          <i class="fas fa-arrow-up" style="color: #27ae60; width: 15px;"></i> ${p.bairroRetirada || 'Não informado'}
        </div>
        <div>
          <i class="fas fa-arrow-down" style="color: #e30613; width: 15px;"></i> ${p.bairro || 'N/A'}
        </div>
        ${p.entregadorNome ? `<div style="margin-top:5px;"><i class="fas fa-motorcycle"></i> ${p.entregadorNome}</div>` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 12px;">
        <div>
          <small style="display:block; font-size: 10px; color: #999;">TAXA ENTREGA</small>
          <span style="font-weight: 800; color: #27ae60; font-size: 16px;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
        </div>
        <button class="btn btn-small btn-primary" onclick="window.Utils.showToast('ID: ${p.id}', 'info')">
          DETALHES
        </button>
      </div>
    </div>
  `).join('');
}

function getStatusColorAdmin(status) {
  const cores = {
    'pendente': '#f1c40f',
    'preparando': '#3498db',
    'pronto': '#9b59b6',
    'aguardando_entregador': '#95a5a6',
    'aceito': '#3498db',
    'em_entrega': '#e67e22',
    'finalizado': '#2ecc71',
    'cancelado': '#e30613'
  };
  return cores[status] || '#ccc';
}

// ==========================================
// LANÇAR PEDIDO MANUAL (ADMIN)
// ==========================================
window.lancarPedidoManual = async function(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;

  const data = {
    clienteNome: document.getElementById('manualCliente').value,
    produto: document.getElementById('manualProduto').value,
    bairroRetirada: document.getElementById('manualBairroRet').value,
    bairro: document.getElementById('manualBairroEnt').value,
    taxaEntrega: parseFloat(document.getElementById('manualTaxa').value),
    status: 'aguardando_entregador',
    created_at: Date.now(),
    origem: 'ADMIN'
  };

  try {
    await window.API.createPedido(data);
    window.Utils.showToast("✅ Pedido lançado no Radar!", "success");
    window.Utils.hideModal('novoPedidoModal');
    e.target.reset();
  } catch (err) {
    window.Utils.showToast("❌ Erro ao lançar pedido.", "error");
  } finally {
    btn.disabled = false;
  }
};

// Expor funções globalmente
window.filtrarPedidos = filtrarPedidos;
window.salvarNovasTaxas = salvarNovasTaxas;

document.addEventListener('DOMContentLoaded', initAdmin);
