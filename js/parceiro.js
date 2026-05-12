// ========================================
// BENAION DELIVERY - PAINEL DO PARCEIRO (V2.3)
// ========================================

let currentUser = null;
let pedidosLoja = [];
let taxaCalculada = 6;

async function init() {
  if (!window.Auth || !window.API) {
    setTimeout(init, 300);
    return;
  }

  if (!window.Auth.requireAuth(['parceiro'])) return;
  currentUser = window.Auth.getCurrentUser();
  document.getElementById('lojaNome').textContent = currentUser.storeName || currentUser.name;

  const bairros = [
    "Agreste", "Nova esperança", "Prosperidade", "Castanheira", "Cajari", 
    "Rodovia do gogó", "buritizal", "Sarney", "Nazaré mineiro", "centro", 
    "mirilandia", "Rio branco", "José cesário", "Malvinas", "samaúma", 
    "monte dourado"
  ];
  
  const comboOrigem = document.getElementById('bairroOrigem');
  const comboDestino = document.getElementById('bairroDestino');
  
  if (comboOrigem && comboDestino) {
    bairros.forEach(b => {
      comboOrigem.innerHTML += `<option value="${b}">${b}</option>`;
      comboDestino.innerHTML += `<option value="${b}">${b}</option>`;
    });
  }

  window.API.escutarTodosPedidos((pedidos) => {
    pedidosLoja = pedidos.filter(p => p.lojaId === currentUser.id);
    renderizar();
    atualizarDashboard();
  });
  
  calcularTaxaChamada();
  carregarProdutos();
}

function calcularTaxaChamada() {
  const ori = document.getElementById('bairroOrigem');
  const des = document.getElementById('bairroDestino');
  if (ori && des) {
    taxaCalculada = window.API.calcularTaxa(ori.value, des.value);
    const valorEl = document.getElementById('valorTaxaChamada');
    if (valorEl) valorEl.textContent = window.Utils.formatCurrency(taxaCalculada);
  }
}

function abrirModalChamar() {
  const modal = document.getElementById('modalChamar');
  if (modal) modal.classList.remove('hidden');
}

function fecharModalChamar() {
  const modal = document.getElementById('modalChamar');
  if (modal) modal.classList.add('hidden');
}

async function handleChamarAvulso(e) {
  e.preventDefault();
  const btn = document.getElementById('btnLancarPedido');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "LANÇANDO...";
  }

  const pedido = {
    lojaId: currentUser.id,
    lojaNome: currentUser.storeName || currentUser.name,
    bairroRetirada: document.getElementById('bairroOrigem').value,
    retiradaLocal: currentUser.storeName || currentUser.name,
    bairro: document.getElementById('bairroDestino').value,
    taxaEntrega: taxaCalculada,
    valorProdutos: parseFloat(document.getElementById('valorProdutosAvulso').value) || 0,
    status: 'aguardando_entregador',
    origem: 'PARCEIRO_AVULSO',
    produto: 'Entrega Avulsa',
    created_at: Date.now()
  };

  try {
    await window.API.createPedido(pedido);
    window.Utils.showToast("Pedido lançado no Radar!", "success");
    fecharModalChamar();
    e.target.reset();
  } catch (err) {
    window.Utils.showToast("Erro ao chamar motoboy", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "LANÇAR NO RADAR";
    }
  }
}

function renderizar() {
  const lista = document.getElementById('listaPedidos');
  if (!lista) return;

  lista.innerHTML = pedidosLoja.length === 0 ? 
    '<div style="text-align:center; padding:50px; opacity:0.5;"><i class="fas fa-box-open fa-3x"></i><p>Nenhum pedido hoje.</p></div>' : 
    pedidosLoja.sort((a,b) => (b.created_at || 0) - (a.created_at || 0)).map(p => `
      <div class="pedido-card ${p.status} animate__animated animate__fadeIn">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b style="color:#E30613;">#${p.id ? p.id.substring(0,6).toUpperCase() : 'N/A'}</b>
          <span class="badge-status" style="background:#f0f0f0; color:#333; font-size:9px;">
            ${window.Utils.getStatusText(p.status).toUpperCase()}
          </span>
        </div>
        <div style="margin:10px 0; font-size:13px;">
          <p>📍 <b>Para:</b> ${p.bairro || 'N/A'}</p>
          <p>🛵 <b>Entregador:</b> ${p.entregadorNome || 'Buscando...'}</p>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:bold; color:#27ae60;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
          <div style="display:flex; gap:5px;">
            ${p.status === 'aguardando_entregador' ? 
              `<button class="btn btn-small" style="background:#ff4757; color:white; border:none; padding:5px 10px;" onclick="window.cancelarPedidoLoja('${p.id}')">Cancelar</button>` : 
              `<button class="btn btn-small btn-outline" onclick="window.Utils.showToast('Entregador: ${p.entregadorNome || 'N/A'}', 'info')">Info</button>`
            }
          </div>
        </div>
      </div>
    `).join('');
}

async function cancelarPedidoLoja(id) {
  if (confirm("Deseja remover este pedido do radar?")) {
    try {
      await window.API.deletePedido(id);
      window.Utils.showToast("Pedido cancelado.");
    } catch (e) {
      window.Utils.showToast("Erro ao cancelar.", "error");
    }
  }
}

function atualizarDashboard() {
  const ativos = pedidosLoja.filter(p => !['finalizado', 'cancelado'].includes(p.status));
  const concluidos = pedidosLoja.filter(p => p.status === 'finalizado');
  const faturamento = concluidos.reduce((acc, p) => acc + (p.valorProdutos || 0), 0);

  const elAtivos = document.getElementById('pedidosAtivos');
  const elVendas = document.getElementById('vendasHoje');
  const elFaturamento = document.getElementById('faturamentoHoje');

  if (elAtivos) elAtivos.textContent = ativos.length;
  if (elVendas) elVendas.textContent = concluidos.length;
  if (elFaturamento) elFaturamento.textContent = window.Utils.formatCurrency(faturamento);
}

async function carregarProdutos() {
  const grid = document.getElementById('gridProdutos');
  if (!grid || !currentUser) return;

  try {
    const produtos = await window.API.getProdutosLoja(currentUser.id);
    
    if (produtos.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">Nenhum produto cadastrado.</p>';
      return;
    }

    grid.innerHTML = produtos.map(d => `
      <div class="product-card animate__animated animate__fadeIn">
        <div style="font-weight:bold; color:#333; margin-bottom:5px;">${d.nome}</div>
        <div style="color:#2ecc71; font-weight:bold;">${window.Utils.formatCurrency(d.preco)}</div>
      </div>
    `).join('');
  } catch (e) {
    console.error("Erro ao carregar produtos:", e);
  }
}

async function handleAddProduto(e) {
  e.preventDefault();
  const nome = document.getElementById('pNome').value;
  const preco = parseFloat(document.getElementById('pPreco').value);

  try {
    await window.API.addProduto({
      lojaId: currentUser.id,
      nome: nome,
      preco: preco,
      created_at: Date.now()
    });
    window.Utils.showToast("Produto cadastrado!", "success");
    document.getElementById('modalProduto').classList.add('hidden');
    e.target.reset();
    carregarProdutos();
  } catch (err) {
    window.Utils.showToast("Erro ao cadastrar produto.", "error");
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const aba = document.getElementById(`aba-${tab}`);
  const nav = document.getElementById(`nav-${tab}`);
  
  if (aba) aba.classList.remove('hidden');
  if (nav) nav.classList.add('active');
  
  if (tab === 'produtos') carregarProdutos();
}

// Expor funções globalmente
window.calcularTaxaChamada = calcularTaxaChamada;
window.abrirModalChamar = abrirModalChamar;
window.fecharModalChamar = fecharModalChamar;
window.cancelarPedidoLoja = cancelarPedidoLoja;
window.switchTab = switchTab;
window.handleAddProduto = handleAddProduto;

document.addEventListener('DOMContentLoaded', () => {
  init();
  
  const formChamar = document.getElementById('formChamarAvulso');
  if (formChamar) formChamar.onsubmit = handleChamarAvulso;
  
  const formProduto = document.getElementById('formAddProduto');
  if (formProduto) formProduto.onsubmit = handleAddProduto;
});
