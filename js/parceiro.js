// ========================================
// BENAION DELIVERY - JS DO PARCEIRO (V2.2)
// ========================================
import { db } from './api.js';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let userLoja = null;
let todosPedidos = [];

async function init() {
    if (!window.Auth || !window.API || !window.Utils) {
        setTimeout(init, 300);
        return;
    }

    userLoja = window.Auth.getCurrentUser();
    
    if (!userLoja || userLoja.userType !== 'parceiro') {
        window.location.href = 'index.html';
        return;
    }

    const displayNome = document.getElementById('lojaNome');
    if (displayNome) displayNome.textContent = userLoja.storeName || userLoja.name;

    escutarPedidos();
    carregarProdutos();
}

// 1. MONITORAMENTO DE PEDIDOS EM TEMPO REAL
function escutarPedidos() {
    // Filtra apenas pedidos desta loja
    const q = query(collection(db, "pedidos"), where("lojaId", "==", userLoja.id));

    onSnapshot(q, (snapshot) => {
        todosPedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Ordenação: Mais recentes ou urgentes primeiro
        todosPedidos.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        
        renderizarPainel();
    });
}

function renderizarPainel() {
    const container = document.getElementById('listaPedidos');
    if (!container) return;

    // Filtramos apenas os que não foram finalizados ou cancelados para o painel principal
    const ativos = todosPedidos.filter(p => !['finalizado', 'cancelado'].includes(p.status));
    
    // Atualiza contador no Dashboard
    const contadorAtivos = document.getElementById('pedidosAtivos');
    if(contadorAtivos) contadorAtivos.textContent = ativos.length;

    if (ativos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#999;">
                <i class="fas fa-clipboard-list fa-3x" style="opacity:0.2; margin-bottom:15px;"></i>
                <p>Nenhum pedido em aberto no momento.</p>
            </div>`;
        return;
    }

    container.innerHTML = ativos.map(p => {
        // Regra Benaion: Calcula se o entregador já está esperando há muito tempo
        const adicionalTempo = window.Utils.calcularAdicionalTempo(p.hora_chegada_mercado);
        
        return `
        <div class="card pedido-card animate__animated animate__fadeIn" 
             style="margin-bottom:15px; border-left: 6px solid ${getStatusColor(p.status)}; border-radius:12px; padding:16px; background:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <span style="font-size:10px; color:#999; font-weight:bold;">#${p.id.substring(0,6).toUpperCase()}</span>
                    <div style="font-weight:800; font-size:16px; color:#333;">${p.clienteNome || 'Cliente Avulso'}</div>
                </div>
                <span style="background:${getStatusColor(p.status)}; color:white; font-size:10px; padding:4px 10px; border-radius:20px; font-weight:bold;">
                    ${window.Utils.getStatusText(p.status).toUpperCase()}
                </span>
            </div>
            
            <div style="margin:12px 0; padding:10px; background:#f9f9f9; border-radius:8px;">
                <div style="font-size:13px; color:#555; margin-bottom:5px;">
                    <i class="fas fa-map-marker-alt" style="color:#E30613;"></i> ${p.bairro || 'Retirada na Loja'}
                </div>
                <div style="font-size:13px; color:#666;">
                    <i class="fas fa-shopping-basket"></i> ${p.descricao || 'Itens não especificados'}
                </div>
            </div>

            ${p.hora_chegada_mercado ? `
                <div style="display:flex; align-items:center; gap:8px; background:${adicionalTempo > 0 ? '#fff5f5' : '#f5fff8'}; padding:8px; border-radius:6px; margin-bottom:12px; border:1px dashed ${adicionalTempo > 0 ? '#feb2b2' : '#b2febd'}">
                    <i class="fas fa-stopwatch" style="color:${adicionalTempo > 0 ? '#E30613' : '#2ecc71'}"></i>
                    <span style="font-size:12px; font-weight:bold; color:${adicionalTempo > 0 ? '#E30613' : '#2ecc71'}">
                        Aguardando Entregador: ${window.Utils.formatCurrency(adicionalTempo)}
                    </span>
                </div>
            ` : ''}

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                ${renderBotaoAcao(p)}
                <button class="btn" style="background:#f0f0f0; color:#444; font-size:12px; font-weight:bold; border-radius:8px;" 
                        onclick="window.Utils.openWhatsApp('${p.clienteTel || ''}', 'Olá, aqui é da ${userLoja.storeName}. Recebemos seu pedido!')">
                    <i class="fab fa-whatsapp"></i> CONTATO
                </button>
            </div>
        </div>
    `}).join('');
}

// Função auxiliar para definir a cor baseada no status
function getStatusColor(status) {
    const cores = {
        'pendente': '#f1c40f',
        'preparando': '#3498db',
        'pronto': '#9b59b6',
        'aguardando_entregador': '#e67e22',
        'aceito': '#2ecc71',
        'em_entrega': '#2ecc71'
    };
    return cores[status] || '#ccc';
}

// Lógica de qual botão mostrar dependendo da fase do pedido
function renderBotaoAcao(p) {
    if (p.status === 'pendente') {
        return `<button class="btn btn-primary" style="background:#E30613; font-size:12px;" onclick="alterarStatus('${p.id}', 'preparando')">ACEITAR PEDIDO</button>`;
    }
    if (p.status === 'preparando') {
        return `<button class="btn" style="background:#3498db; color:white; font-size:12px;" onclick="alterarStatus('${p.id}', 'pronto')">MARCAR COMO PRONTO</button>`;
    }
    if (p.status === 'pronto') {
        return `<button class="btn" style="background:#9b59b6; color:white; font-size:12px;" onclick="alterarStatus('${p.id}', 'aguardando_entregador')">CHAMAR MOTOBOY</button>`;
    }
    return `<button class="btn" disabled style="background:#eee; color:#999; font-size:11px;">EM ANDAMENTO</button>`;
}

// 2. CHAMAR ENTREGADOR (MANUAL/TELEFONE)
window.lancarPedidoManualLoja = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> LANÇANDO...';

        const bairroEntrega = document.getElementById('manualBairroEnt').value;
        const bairroLoja = userLoja.bairro || "Centro"; 
        
        // Calcula taxa automaticamente
        const taxaEntrega = window.API.calcularTaxa(bairroLoja, bairroEntrega);
        const valorProdutos = parseFloat(document.getElementById('manualValor').value || 0);

        const novoPedido = {
            lojaId: userLoja.id,
            lojaNome: userLoja.storeName || userLoja.name,
            lojaTel: userLoja.telefone || "",
            bairroRetirada: bairroLoja,
            clienteNome: document.getElementById('manualCliente').value,
            clienteTel: document.getElementById('manualTel')?.value || "",
            bairro: bairroEntrega,
            taxaEntrega: taxaEntrega,
            valorProdutos: valorProdutos,
            valorTotal: valorProdutos + taxaEntrega,
            status: 'aguardando_entregador', // Já vai direto para o radar dos motoboys
            created_at: Date.now(),
            origem: 'LOJA_PARCEIRA'
        };

        await addDoc(collection(db, "pedidos"), novoPedido);
        
        window.Utils.showToast("Pedido lançado no Radar dos Entregadores!", "success");
        window.Utils.hideModal('modalPedidoManual');
        form.reset();
    } catch (err) {
        console.error(err);
        window.Utils.showToast("Erro ao lançar pedido", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'LANÇAR NO RADAR';
    }
};

// 3. AÇÕES RÁPIDAS
window.alterarStatus = async (id, status) => {
    try {
        const ref = doc(db, "pedidos", id);
        await updateDoc(ref, { status: status });
        window.Utils.showToast(`Pedido agora está: ${window.Utils.getStatusText(status)}`, "info");
    } catch (e) {
        window.Utils.showToast("Erro ao mudar status", "error");
    }
};

async function carregarProdutos() {
    const grid = document.getElementById('gridProdutos');
    if(!grid) return;

    const q = query(collection(db, "produtos"), where("lojaId", "==", userLoja.id));
    const snap = await getDocs(q);
    
    if (snap.empty) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:20px; color:#999;">Nenhum produto cadastrado.</p>';
        return;
    }

    grid.innerHTML = snap.docs.map(d => `
        <div class="product-card animate__animated animate__fadeIn" style="background:#fff; border:1px solid #eee; padding:12px; border-radius:10px; text-align:center;">
            <div style="font-weight:bold; color:#333; margin-bottom:5px;">${d.data().nome}</div>
            <div style="color:#2ecc71; font-weight:bold;">${window.Utils.formatCurrency(d.data().preco)}</div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', init);
