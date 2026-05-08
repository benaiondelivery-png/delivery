// ========================================
// BENAION DELIVERY - CLIENTE (V2.1)
// ========================================
import { db, API, Auth } from './api.js';
import { collection, query, where, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let meusPedidos = [];
let user = null;

async function initCliente() {
    // 1. Aguarda carregamento dos módulos globais
    if (!window.Auth || !window.API || !window.Utils) {
        setTimeout(initCliente, 300);
        return;
    }

    // 2. Proteção de Rota
    if (!window.Auth.requireAuth(['cliente'])) return;
    user = window.Auth.getCurrentUser();
    
    // 3. UI Inicial
    const nomeEl = document.getElementById('clienteNome'); // Ajustado para bater com seu cliente.html
    if (nomeEl) nomeEl.textContent = `Olá, ${user.name.split(' ')[0]}`;
    
    // 4. Inicia monitoramento
    escutarMeusPedidos();
}

// 1. MONITORAMENTO REAL-TIME
function escutarMeusPedidos() {
    const q = query(
        collection(db, "pedidos"), 
        where("clienteId", "==", user.id)
    );

    onSnapshot(q, (snapshot) => {
        meusPedidos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Ordena: Mais recentes primeiro (Lida com milissegundos ou Firebase Timestamps)
        meusPedidos.sort((a, b) => {
            const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : a.created_at;
            const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : b.created_at;
            return (timeB || 0) - (timeA || 0);
        });

        renderizarListaPedidos();
        atualizarResumo();
    });
}

// 2. RENDERIZAÇÃO DOS CARDS
function renderizarListaPedidos() {
    const container = document.getElementById('listaPedidos');
    if (!container) return;

    if (meusPedidos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#999;">
                <i class="fas fa-shopping-bag fa-3x" style="margin-bottom:15px; opacity:0.2;"></i>
                <p>Nenhum pedido realizado ainda.</p>
            </div>`;
        return;
    }

    container.innerHTML = meusPedidos.map(p => `
        <div class="card pedido-item animate__animated animate__fadeInUp" 
             style="margin-bottom:12px; border-left: 5px solid ${getStatusColor(p.status)}; border-radius:12px; padding:15px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <span style="font-size:10px; color:#999; font-weight:bold;">#${p.id.substring(0,6).toUpperCase()}</span>
                    <h4 style="margin:2px 0; color:#333; font-size:15px;">${p.lojaNome || 'Pedido Avulso'}</h4>
                </div>
                <span style="background:${getStatusColor(p.status)}; color:white; font-size:10px; padding:4px 10px; border-radius:20px; font-weight:bold;">
                    ${window.Utils.getStatusText(p.status).toUpperCase()}
                </span>
            </div>
            
            <div style="margin:12px 0; font-size:13px; color:#666;">
                <p style="margin:4px 0;"><i class="fas fa-map-marker-alt" style="color:#E30613; width:15px;"></i> Entregar em: <b>${p.bairro}</b></p>
                <p style="margin:4px 0;"><i class="fas fa-receipt" style="color:#E30613; width:15px;"></i> ${p.descricao || 'Sem descrição'}</p>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f5f5f5; margin-top:10px; padding-top:10px;">
                <div>
                    <small style="font-size:10px; color:#999; display:block;">VALOR TOTAL</small>
                    <span style="font-weight:bold; color:#2ecc71; font-size:16px;">${window.Utils.formatCurrency(p.valorTotal)}</span>
                </div>
                <button class="btn btn-small" onclick="repetirPedido('${p.id}')" 
                        style="background:#f8f9fa; border:1px solid #ddd; color:#555; padding:6px 12px; border-radius:8px; font-size:11px; font-weight:bold;">
                    <i class="fas fa-redo-alt" style="margin-right:5px;"></i> REPETIR
                </button>
            </div>
        </div>
    `).join('');
}

// 3. LOGICA DE ENVIO
window.fazerNovoPedido = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENVIANDO...';

    try {
        const bairroEntrega = document.getElementById('entregaBairro').value;
        const bairroLoja = "Centro"; // Bairro padrão de retirada para pedidos de clientes
        
        // Usa a função inteligente da API que já conhece a tabela de taxas
        const taxaEntrega = window.API.calcularTaxa(bairroLoja, bairroEntrega);
        const valorProdutos = parseFloat(document.getElementById('valorProdutos').value || 0);

        const novoPedido = {
            clienteId: user.id,
            clienteNome: user.name,
            clienteTel: user.telefone || "",
            status: 'pendente',
            bairro: bairroEntrega,
            bairroRetirada: bairroLoja,
            taxaEntrega: taxaEntrega,
            valorProdutos: valorProdutos,
            valorTotal: valorProdutos + taxaEntrega,
            descricao: document.getElementById('pedidoDesc').value,
            created_at: Date.now(),
            origem: 'APP_CLIENTE'
        };

        await addDoc(collection(db, "pedidos"), novoPedido);
        
        window.Utils.showToast("Pedido solicitado com sucesso!", "success");
        window.Utils.hideModal('modalNovoPedido');
        e.target.reset();
        
    } catch (error) {
        console.error(error);
        window.Utils.showToast("Erro ao processar. Verifique sua conexão.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'SOLICITAR ENTREGA';
    }
};

// 4. AUXILIARES
function getStatusColor(status) {
    const cores = {
        'pendente': '#f1c40f',
        'preparando': '#3498db',
        'pronto': '#9b59b6',
        'aguardando_entregador': '#e67e22',
        'aceito': '#2ecc71',
        'em_entrega': '#2ecc71',
        'finalizado': '#27ae60',
        'cancelado': '#e30613'
    };
    return cores[status] || '#95a5a6';
}

function atualizarResumo() {
    const concluidos = meusPedidos.filter(p => p.status === 'finalizado');
    const totalGasto = concluidos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
    
    const countEl = document.getElementById('pedidosConcluidosCount'); // Ajustado para seu HTML
    const totalEl = document.getElementById('totalGastoValor');
    
    if (countEl) countEl.textContent = concluidos.length;
    if (totalEl) totalEl.textContent = window.Utils.formatCurrency(totalGasto);
}

window.repetirPedido = (id) => {
    const anterior = meusPedidos.find(p => p.id === id);
    if (anterior) {
        document.getElementById('pedidoDesc').value = anterior.descricao;
        document.getElementById('entregaBairro').value = anterior.bairro;
        window.Utils.showModal('modalNovoPedido');
        window.Utils.showToast("Dados do pedido anterior carregados!");
    }
};

document.addEventListener('DOMContentLoaded', initCliente);
