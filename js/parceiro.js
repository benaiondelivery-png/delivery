// ========================================
// BENAION DELIVERY - PARCEIRO (V3.0)
// ========================================

let currentUser = null;
let pedidosLoja = [];
let taxaCalculada = 6;

async function init() {
  if (!window.Auth || !window.API) { setTimeout(init, 300); return; }
  if (!window.Auth.requireAuth(['parceiro'])) return;
  currentUser = window.Auth.getCurrentUser();
  document.getElementById('lojaNome').textContent = currentUser.storeName || currentUser.name;

  const bairros = ["Agreste", "Nova esperança", "Prosperidade", "Castanheira", "Cajari", "Rodovia do gogó", "buritizal", "Sarney", "Nazaré mineiro", "centro", "mirilandia", "Rio branco", "José cesário", "Malvinas", "samaúma", "monte dourado"];
  const comboOrigem = document.getElementById('bairroOrigem');
  const comboDestino = document.getElementById('bairroDestino');
  if (comboOrigem && comboDestino) {
    bairros.forEach(b => { comboOrigem.innerHTML += `<option value="${b}">${b}</option>`; comboDestino.innerHTML += `<option value="${b}">${b}</option>`; });
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
  const ori = document.getElementById('bairroOrigem'), des = document.getElementById('bairroDestino');
  if (ori && des) {
    taxaCalculada = window.API.calcularTaxa(ori.value, des.value);
    const el = document.getElementById('valorTaxaChamada');
    if (el) el.textContent = window.Utils.formatCurrency(taxaCalculada);
  }
}

function abrirModalChamar() { document.getElementById('modalChamar')?.classList.remove('hidden'); }
function fecharModalChamar() { document.getElementById('modalChamar')?.classList.add('hidden'); }

async function handleChamarAvulso(e) {
  e.preventDefault();
  const btn = document.getElementById('btnLancarPedido');
  if (btn) { btn.disabled = true; btn.textContent = "LANÇANDO..."; }

  const pedido = {
    lojaId: currentUser.id, lojaNome: currentUser.storeName || currentUser.name,
    bairroRetirada: document.getElementById('bairroOrigem').value,
    retiradaLocal: currentUser.storeName || currentUser.name,
    bairro: document.getElementById('bairroDestino').value,
    taxaEntrega: taxaCalculada,
    valorProdutos: parseFloat(document.getElementById('valorProdutosAvulso').value) || 0,
    status: 'aguardando_entregador', origem: 'PARCEIRO_AVULSO',
    produto: 'Entrega Avulsa', created_at: Date.now()
  };

  try {
    await window.API.createPedido(pedido);
    window.Utils.showToast("Pedido lançado no Radar!", "success");
    fecharModalChamar(); e.target.reset();
  } catch (err) { window.Utils.showToast("Erro ao chamar motoboy", "error"); }
  finally { if (btn) { btn.disabled = false; btn.textContent = "LANÇAR NO RADAR"; } }
}

function renderizar() {
  const lista = document.getElementById('listaPedidos');
  if (!lista) return;
  lista.innerHTML = pedidosLoja.length === 0 
    ? '<div style="text-align:center; padding:50px; opacity:0.5;"><i class="fas fa-box-open fa-3x"></i><p>Nenhum pedido hoje.</p></div>'
    : pedidosLoja.sort((a,b) => (b.created_at || 0) - (a.created_at || 0)).map(p => `
      <div class="pedido-card" style="border-left:5px solid #ccc; margin-bottom:15px; padding:15px; background:white; border-radius:10px;">
        <div style="display:flex; justify-content:space-between;">
          <b style="color:#E30613;">#${p.id?.substring(0,6).toUpperCase() || 'N/A'}</b>
          <span style="background:#f0f0f0; padding:4px 10px; border-radius:20px; font-size:9px; font-weight:bold;">${window.Utils.getStatusText(p.status).toUpperCase()}</span>
        </div>
        <p style="margin:10px 0;">📍 <b>Para:</b> ${p.bairro || 'N/A'}</p>
        <p>🛵 <b>Entregador:</b> ${p.entregadorNome || 'Buscando...'}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
          <span style="font-weight:bold; color:#27ae60;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
          ${p.status === 'aguardando_entregador' ? `<button onclick="window.cancelarPedidoLoja('${p.id}')" style="background:#ff4757; color:white; border:none; padding:5px 10px; border-radius:8px;">Cancelar</button>` : ''}
        </div>
      </div>
    `).join('');
}

async function cancelarPedidoLoja(id) {
  if (confirm("Remover este pedido?")) {
    await window.API.deletePedido(id);
    window.Utils.showToast("Pedido cancelado.");
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
    grid.innerHTML = produtos.length === 0 
      ? '<p style="text-align:center; padding:20px; color:#999;">Nenhum produto cadastrado.</p>'
      : produtos.map(d => `
        <div class="product-card" style="background:white; border-radius:12px; padding:12px; text-align:center; position:relative;">
          <div style="font-weight:bold;">${d.nome}</div>
          <div style="color:#2ecc71; font-weight:bold;">${window.Utils.formatCurrency(d.preco)}</div>
          <button onclick="window.excluirProduto('${d.id}')" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#e30613; cursor:pointer; font-size:14px;">🗑️</button>
        </div>
      `).join('');
  } catch (e) {}
}

async function handleAddProduto(e) {
  e.preventDefault();
  const nome = document.getElementById('pNome').value, preco = parseFloat(document.getElementById('pPreco').value);
  if (!nome || !preco) return window.Utils.showToast("Preencha todos os campos", "warning");
  try {
    await window.API.addProduto({ lojaId: currentUser.id, nome, preco, created_at: Date.now() });
    window.Utils.showToast("Produto cadastrado!", "success");
    document.getElementById('modalProduto').classList.add('hidden');
    e.target.reset(); carregarProdutos();
  } catch (err) { window.Utils.showToast("Erro ao cadastrar.", "error"); }
}

async function excluirProduto(id) {
  if (confirm("Excluir este produto?")) {
    await window.API.deleteProduto(id);
    window.Utils.showToast("Produto removido.");
    carregarProdutos();
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`aba-${tab}`)?.classList.remove('hidden');
  document.getElementById(`nav-${tab}`)?.classList.add('active');
  if (tab === 'produtos') carregarProdutos();
}

window.calcularTaxaChamada = calcularTaxaChamada;
window.abrirModalChamar = abrirModalChamar;
window.fecharModalChamar = fecharModalChamar;
window.cancelarPedidoLoja = cancelarPedidoLoja;
window.switchTab = switchTab;
window.handleAddProduto = handleAddProduto;
window.excluirProduto = excluirProduto;

document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('formChamarAvulso') && (document.getElementById('formChamarAvulso').onsubmit = handleChamarAvulso);
  document.getElementById('formAddProduto') && (document.getElementById('formAddProduto').onsubmit = handleAddProduto);
});
