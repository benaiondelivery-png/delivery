// ========================================
// BENAION DELIVERY - PAINEL DO CLIENTE (V2.2)
// ========================================

let currentUser = null;
let taxaCalculada = 6.00;

async function initPaginaCliente() {
  if (!window.Auth || !window.API || !window.auth) {
    setTimeout(initPaginaCliente, 300);
    return;
  }

  if (!window.Auth.requireAuth(['cliente'])) return;
  currentUser = window.Auth.getCurrentUser();

  document.getElementById('clienteNome').textContent = "Olá, " + currentUser.name.split(' ')[0];

  window.API.escutarTodosPedidos((todos) => {
    const meusPedidos = todos.filter(p => p.clienteId === currentUser.id);
    meusPedidos.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    document.getElementById('contadorPedidos').textContent = meusPedidos.length;
    renderizarMeusPedidos(meusPedidos);
  });

  carregarParceiros();
}

function atualizarTaxaEstimada() {
  const bairroDestino = document.getElementById('pedidoBairroEntrega').value;
  if (window.API && window.API.calcularTaxa) {
    taxaCalculada = window.API.calcularTaxa(null, bairroDestino);
  } else if (window.TAXAS_LOCAIS && window.TAXAS_LOCAIS[bairroDestino]) {
    taxaCalculada = window.TAXAS_LOCAIS[bairroDestino];
  } else {
    taxaCalculada = 6.00;
  }
  const txt = document.getElementById('txtTaxaEstimada');
  if (txt) txt.textContent = window.Utils.formatCurrency(taxaCalculada);
}

function renderizarMeusPedidos(pedidos) {
  const container = document.getElementById('listaPedidos');
  if (!container) return;

  if (pedidos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; background: white; border-radius: 15px; color: #999;">
        <i class="fas fa-box-open fa-3x" style="opacity:0.2; margin-bottom:10px;"></i>
        <p>Você ainda não fez nenhum pedido.</p>
      </div>`;
    return;
  }

  container.innerHTML = pedidos.map(p => `
    <div class="card animate__animated animate__fadeInUp" style="margin-bottom: 15px; border-left: 6px solid ${getStatusColor(p.status)}; border-radius: 15px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
        <b style="color: #E30613; font-size: 14px;">#${p.id.substring(0,6).toUpperCase()}</b>
        <span style="background:${getStatusColor(p.status)}; color:white; font-size:10px; padding:4px 10px; border-radius:20px; font-weight:bold;">
          ${window.Utils.getStatusText(p.status).toUpperCase()}
        </span>
      </div>
      <div style="font-size: 13px; color: #555;">
        <p style="margin-bottom: 5px;"><i class="fas fa-store" style="color: #E30613;"></i> <b>Retirada:</b> ${p.retiradaLocal || 'Loja'} (${p.bairroRetirada || 'N/A'})</p>
        <p><i class="fas fa-map-marker-alt" style="color: #3498db;"></i> <b>Entrega:</b> ${p.entregaLocal || 'Endereço'} (${p.bairro || 'N/A'})</p>
        ${p.entregadorNome ? `<p><i class="fas fa-motorcycle" style="color: #27ae60;"></i> <b>Entregador:</b> ${p.entregadorNome}</p>` : ''}
      </div>
      <div style="display:flex; justify-content:space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f9f9f9;">
        <span style="font-weight:900; color:#27ae60; font-size: 16px;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
        ${p.status === 'aguardando_entregador' ? 
          `<button onclick="cancelarMeuPedido('${p.id}')" style="background:none; border:none; color:#999; font-size:11px; cursor:pointer;"><i class="fas fa-times"></i> CANCELAR</button>` 
          : ''}
      </div>
    </div>
  `).join('');
}

async function cancelarMeuPedido(id) {
  if (confirm("Deseja cancelar este pedido?")) {
    try {
      await window.API.deletePedido(id);
      window.Utils.showToast("Pedido cancelado com sucesso.");
    } catch (e) {
      window.Utils.showToast("Erro ao cancelar. Tente novamente.", "error");
    }
  }
}

async function handleNovoPedido(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;

  const data = {
    clienteId: currentUser.id,
    clienteNome: currentUser.name,
    clienteTel: currentUser.telefone || '',
    bairroRetirada: document.getElementById('pedidoBairroRetirada').value,
    retiradaLocal: document.getElementById('pedidoRetiradaLocal').value,
    bairro: document.getElementById('pedidoBairroEntrega').value,
    entregaLocal: document.getElementById('pedidoEntregaLocal').value,
    produto: document.getElementById('pedidoProduto').value,
    taxaEntrega: taxaCalculada,
    status: 'aguardando_entregador',
    created_at: Date.now()
  };

  try {
    await window.API.createPedido(data);
    window.Utils.showToast("Pedido enviado ao radar!", "success");
    window.Utils.hideModal('novoPedidoModal');
    e.target.reset();
    atualizarTaxaEstimada();
  } catch (err) {
    window.Utils.showToast("Erro ao processar o pedido.", "error");
  } finally {
    btn.disabled = false;
  }
}

function carregarParceiros() {
  const parceiros = [
    {nome: "Pizzaria", img: "https://cdn-icons-png.flaticon.com/512/3132/3132693.png"},
    {nome: "Burguer 10", img: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png"},
    {nome: "Farmácia", img: "https://cdn-icons-png.flaticon.com/512/4320/4320337.png"},
    {nome: "Distribuidora", img: "https://cdn-icons-png.flaticon.com/512/952/952306.png"}
  ];
  const container = document.getElementById('listaParceiros');
  if (container) {
    container.innerHTML = parceiros.map(p => `
      <div style="text-align: center; min-width: 85px; cursor: pointer;" onclick="window.Utils.showToast('Loja selecionada: ${p.nome}', 'info')">
        <div style="width: 65px; height: 65px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 4px 8px rgba(0,0,0,0.05); border: 1px solid #eee;">
          <img src="${p.img}" style="width: 40px;">
        </div>
        <p style="font-size: 11px; margin-top: 8px; font-weight: 700; color: #666;">${p.nome}</p>
      </div>
    `).join('');
  }
}

function getStatusColor(status) {
  const cores = {
    'aguardando_entregador': '#e67e22', 
    'aceito': '#3498db', 
    'em_entrega': '#9b59b6', 
    'finalizado': '#2ecc71', 
    'cancelado': '#E30613',
    'pendente': '#f1c40f',
    'preparando': '#3498db',
    'pronto': '#2ecc71'
  };
  return cores[status] || '#999';
}

// Expor funções para o escopo global
window.atualizarTaxaEstimada = atualizarTaxaEstimada;
window.cancelarMeuPedido = cancelarMeuPedido;
window.handleNovoPedido = handleNovoPedido;

document.addEventListener('DOMContentLoaded', initPaginaCliente);
