// ========================================
// BENAION DELIVERY - CLIENTE PREMIUM (V3.5)
// ========================================

let currentUser = null;
let taxaCalculada = 6.00;
let lojaSelecionada = null;
let enderecosSalvos = [];

async function initPaginaCliente() {
  if (!window.Auth || !window.API) { setTimeout(initPaginaCliente, 300); return; }
  if (!window.Auth.requireAuth(['cliente'])) return;
  currentUser = window.Auth.getCurrentUser();
  
  document.getElementById('clienteNome').textContent = `Olá, ${currentUser.name.split(' ')[0]}`;
  carregarEnderecos();

  window.API.escutarTodosPedidos((todos) => {
    const meusPedidos = todos.filter(p => p.clienteId === currentUser.id);
    meusPedidos.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    document.getElementById('contadorPedidos').textContent = meusPedidos.length;
    renderizarMeusPedidos(meusPedidos);
  });

  carregarParceirosReais();
}

function carregarEnderecos() {
  const salvos = localStorage.getItem('benaion_enderecos');
  enderecosSalvos = salvos ? JSON.parse(salvos) : [];
}

function salvarEndereco() {
  const endereco = {
    retiradaLocal: document.getElementById('pedidoRetiradaLocal').value,
    bairroRetirada: document.getElementById('pedidoBairroRetirada').value,
    entregaLocal: document.getElementById('pedidoEntregaLocal').value,
    bairroEntrega: document.getElementById('pedidoBairroEntrega').value,
  };
  
  enderecosSalvos.unshift(endereco);
  if (enderecosSalvos.length > 5) enderecosSalvos.pop();
  localStorage.setItem('benaion_enderecos', JSON.stringify(enderecosSalvos));
  window.Utils.showToast('📍 Endereço salvo!', 'success');
  renderizarEnderecosSalvos();
}

function renderizarEnderecosSalvos() {
  const container = document.getElementById('enderecosSalvos');
  if (!container || enderecosSalvos.length === 0) return;
  
  container.innerHTML = `
    <div style="margin-bottom:10px; font-size:11px; color:#999;">📌 Seus endereços:</div>
    ${enderecosSalvos.map((e, i) => `
      <div onclick="usarEnderecoSalvo(${i})" style="background:var(--light-gray); padding:8px 12px; border-radius:8px; margin-bottom:5px; cursor:pointer; font-size:12px;">
        📍 ${e.entregaLocal} (${e.bairroEntrega})
      </div>
    `).join('')}
  `;
}

function usarEnderecoSalvo(index) {
  const e = enderecosSalvos[index];
  document.getElementById('pedidoRetiradaLocal').value = e.retiradaLocal;
  document.getElementById('pedidoBairroRetirada').value = e.bairroRetirada;
  document.getElementById('pedidoEntregaLocal').value = e.entregaLocal;
  document.getElementById('pedidoBairroEntrega').value = e.bairroEntrega;
  window.Utils.showToast('Endereço carregado!', 'info');
  atualizarTaxaEstimada();
}

function atualizarTaxaEstimada() {
  const bairroDestino = document.getElementById('pedidoBairroEntrega').value;
  taxaCalculada = window.API.calcularTaxa(null, bairroDestino);
  const txt = document.getElementById('txtTaxaEstimada');
  if (txt) txt.textContent = window.Utils.formatCurrency(taxaCalculada);
}

function renderizarMeusPedidos(pedidos) {
  const container = document.getElementById('listaPedidos');
  if (!container) return;

  if (pedidos.length === 0) {
    container.innerHTML = `<div class="text-center" style="padding:40px; opacity:0.5;">📭 Nenhum pedido ainda</div>`;
    return;
  }

  container.innerHTML = pedidos.map(p => {
    const statusSteps = {
      'pendente': 0, 'preparando': 1, 'pronto': 2,
      'aguardando_entregador': 3, 'aceito': 4, 'em_entrega': 5, 'finalizado': 6
    };
    const step = statusSteps[p.status] || 0;
    
    return `
    <div class="card" style="border-left:5px solid ${getStatusColor(p.status)};">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <b style="color:var(--primary-red);">#${p.id.substring(0,6).toUpperCase()}</b>
        <span class="badge" style="background:${getStatusColor(p.status)}; color:white;">${window.Utils.getStatusText(p.status)}</span>
      </div>
      
      <!-- Barra de Progresso -->
      <div class="progress-bar">
        ${['📝','👨‍🍳','📦','🔍','🛵','🚀','✅'].map((icon, i) => `
          <div class="progress-step">
            <div class="progress-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}">${i <= step ? icon : ''}</div>
            <span class="progress-label">${['Pendente','Preparando','Pronto','Radar','Aceito','Entrega','Concluído'][i]}</span>
          </div>
        `).join('')}
      </div>
      
      <div style="font-size:13px; margin:10px 0;">
        <p><b>📤 Retirada:</b> ${p.retiradaLocal || 'Loja'} (${p.bairroRetirada})</p>
        <p><b>📥 Entrega:</b> ${p.entregaLocal || 'Endereço'} (${p.bairro})</p>
        ${p.entregadorNome ? `<p><b>🛵 Entregador:</b> ${p.entregadorNome}</p>` : ''}
        <p style="color:var(--primary-red); font-weight:bold; font-size:16px; margin-top:5px;">${window.Utils.formatCurrency(p.taxaEntrega)}</p>
      </div>
      
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${p.status === 'aguardando_entregador' ? `<button onclick="cancelarMeuPedido('${p.id}')" class="btn btn-small btn-outline">✕ Cancelar</button>` : ''}
        <button onclick="repetirPedido('${p.id}')" class="btn btn-small" style="background:var(--light-gray);">🔄 Repetir</button>
        ${p.status === 'finalizado' ? `<button onclick="avaliarEntrega('${p.id}','${p.entregadorId||''}')" class="btn btn-small" style="background:var(--primary-yellow);">⭐ Avaliar</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function repetirPedido(id) {
  const p = pedidosEscutados?.find(x => x.id === id);
  if (p) {
    document.getElementById('pedidoRetiradaLocal').value = p.retiradaLocal || '';
    document.getElementById('pedidoEntregaLocal').value = p.entregaLocal || '';
    document.getElementById('pedidoProduto').value = p.produto || '';
    document.getElementById('pedidoBairroEntrega').value = p.bairro || '';
    atualizarTaxaEstimada();
    window.Utils.showModal('novoPedidoModal');
  }
}

async function cancelarMeuPedido(id) {
  if (confirm("Cancelar este pedido?")) {
    await window.API.deletePedido(id);
    window.Utils.showToast("Pedido cancelado", "success");
  }
}

async function avaliarEntrega(pedidoId, entregadorId) {
  const nota = prompt("⭐ Nota de 1 a 5:");
  if (!nota || isNaN(nota) || nota < 1 || nota > 5) return;
  await window.API.addAvaliacao({ pedidoId, entregadorId, clienteId: currentUser.id, nota: parseInt(nota) });
  window.Utils.showToast("⭐ Obrigado pela avaliação!", "success");
}

async function handleNovoPedido(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  
  if (!document.getElementById('pedidoRetiradaLocal').value.trim()) {
    return window.Utils.showToast('Informe o local de retirada', 'warning');
  }
  if (!document.getElementById('pedidoBairroEntrega').value) {
    return window.Utils.showToast('Selecione o bairro de entrega', 'warning');
  }
  if (!document.getElementById('pedidoEntregaLocal').value.trim()) {
    return window.Utils.showToast('Informe o endereço de entrega', 'warning');
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';

  const codigoConfirmacao = window.Utils.gerarCodigo();
  
  const data = {
    clienteId: currentUser.id,
    clienteNome: currentUser.name,
    clienteTel: currentUser.telefone || '',
    lojaId: lojaSelecionada?.id || null,
    lojaNome: lojaSelecionada?.nome || null,
    bairroRetirada: document.getElementById('pedidoBairroRetirada').value,
    retiradaLocal: document.getElementById('pedidoRetiradaLocal').value,
    bairro: document.getElementById('pedidoBairroEntrega').value,
    entregaLocal: document.getElementById('pedidoEntregaLocal').value,
    produto: document.getElementById('pedidoProduto').value,
    taxaEntrega: taxaCalculada,
    codigoConfirmacao: codigoConfirmacao,
    status: 'aguardando_entregador',
    created_at: Date.now()
  };

  try {
    await window.API.createPedido(data);
    salvarEndereco();
    window.Utils.sons.tocar('pedidoNovo');
    window.Utils.showToast(`🚀 Pedido enviado! Código: ${codigoConfirmacao}`, 'success');
    window.Utils.hideModal('novoPedidoModal');
    lojaSelecionada = null;
    e.target.reset();
    atualizarTaxaEstimada();
  } catch (err) {
    window.Utils.showToast("Erro ao enviar pedido", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = 'CONFIRMAR E PEDIR';
  }
}

async function carregarParceirosReais() {
  const container = document.getElementById('listaParceiros');
  if (!container) return;
  try {
    const parceiros = await window.API.getUsersByType('parceiro');
    if (parceiros.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5;">🏪 Nenhuma loja parceira ainda</p>';
      return;
    }
    container.innerHTML = parceiros.map(p => `
      <div onclick="selecionarLojaParceira('${p.id}','${p.storeName||p.name}')" style="text-align:center; min-width:75px; cursor:pointer;">
        <div style="width:55px;height:55px;background:linear-gradient(135deg,#E30613,#c00510);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;box-shadow:0 4px 15px rgba(227,6,19,0.2);">
          <i class="fas fa-store" style="font-size:22px;color:white;"></i>
        </div>
        <p style="font-size:10px;margin-top:6px;font-weight:700;">${p.storeName||p.name}</p>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = '<p style="text-align:center;opacity:0.5;">Erro ao carregar</p>';
  }
}

function selecionarLojaParceira(lojaId, lojaNome) {
  lojaSelecionada = { id: lojaId, nome: lojaNome };
  document.getElementById('pedidoBairroRetirada').value = 'Centro';
  document.getElementById('pedidoRetiradaLocal').value = lojaNome;
  window.Utils.showToast(`🏪 ${lojaNome} selecionada!`, 'success');
  window.Utils.showModal('novoPedidoModal');
  atualizarTaxaEstimada();
}

function getStatusColor(s) {
  const c = { pendente:'#f1c40f', preparando:'#3498db', pronto:'#9b59b6', aguardando_entregador:'#e67e22', aceito:'#2ecc71', em_entrega:'#e91e63', finalizado:'#27ae60', cancelado:'#e30613' };
  return c[s] || '#999';
}

window.atualizarTaxaEstimada = atualizarTaxaEstimada;
window.handleNovoPedido = handleNovoPedido;
window.selecionarLojaParceira = selecionarLojaParceira;
window.cancelarMeuPedido = cancelarMeuPedido;
window.avaliarEntrega = avaliarEntrega;
window.repetirPedido = repetirPedido;

document.addEventListener('DOMContentLoaded', initPaginaCliente);
