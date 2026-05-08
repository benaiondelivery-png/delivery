// ========================================
// BENAION DELIVERY - PAINEL DO ENTREGADOR (V2.2)
// ========================================
import { db } from './api.js';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;
let pedidosEscutados = [];

async function initEntregador() {
    if (!window.Auth || !window.API || !window.auth) {
        setTimeout(initEntregador, 300);
        return;
    }

    if (!window.Auth.requireAuth(['entregador'])) return;
    currentUser = window.Auth.getCurrentUser();

    // UI Inicial
    const displayNome = document.getElementById('entregadorNome');
    if (displayNome) displayNome.textContent = currentUser.name.split(' ')[0];
    
    // Inicia Monitoramento
    escutarPedidosSistema();
    sincronizarStatusUI();
}

// 1. MONITORAMENTO REAL-TIME
function escutarPedidosSistema() {
    // Escuta todos os pedidos para filtrar localmente (mais rápido para o entregador)
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        pedidosEscutados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Radar: Pedidos que precisam de entregador
        const disponiveis = pedidosEscutados.filter(p => 
            (p.status === 'aguardando_entregador' || p.status === 'pronto') && !p.entregadorId
        );

        // Minhas Entregas: Pedidos que eu aceitei e não finalizei
        const meus = pedidosEscutados.filter(p => 
            p.entregadorId === currentUser.id && 
            !['finalizado', 'cancelado'].includes(p.status)
        );

        renderizarDisponiveis(disponiveis);
        renderizarMinhasEntregas(meus);
        atualizarEstatisticas();
    });
}

// 2. RENDERIZAÇÃO DO RADAR (DISPONÍVEIS)
function renderizarDisponiveis(pedidos) {
    const container = document.getElementById('listaPedidosDisponiveis');
    if (!container) return;

    if (!currentUser.online) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#999;">
                <i class="fas fa-toggle-off fa-3x" style="margin-bottom:10px;"></i>
                <p>Fique <b>ONLINE</b> para receber novos pedidos no radar.</p>
            </div>`;
        return;
    }

    if (pedidos.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#999;">
                <div class="radar-loader"></div>
                <p>Buscando pedidos próximos...</p>
            </div>`;
        return;
    }

    container.innerHTML = pedidos.map(p => `
        <div class="card pedido-card animate__animated animate__fadeInUp" style="border-left: 5px solid #2ecc71; margin-bottom:15px; padding:15px; background:#fff; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size:12px; background:#f0f0f0; padding:4px 8px; border-radius:5px;">${p.lojaNome || 'PEDIDO AVULSO'}</span>
                <span style="color:#2ecc71; font-weight:800; font-size:18px;">${window.Utils.formatCurrency(p.taxaEntrega)}</span>
            </div>
            <div style="margin:15px 0; font-size:14px; color:#555;">
                <p style="margin:5px 0;"><i class="fas fa-store" style="color:#E30613; width:20px;"></i> <b>De:</b> ${p.bairroRetirada}</p>
                <p style="margin:5px 0;"><i class="fas fa-map-marker-alt" style="color:#3498db; width:20px;"></i> <b>Para:</b> ${p.bairro}</p>
            </div>
            <button class="btn btn-primary w-100" onclick="aceitarCorrida('${p.id}')" style="background:#2ecc71; border:none; padding:12px; font-weight:bold; border-radius:10px;">
                ACEITAR CORRIDA
            </button>
        </div>
    `).join('');
}

// 3. RENDERIZAÇÃO DAS MINHAS ENTREGAS
function renderizarMinhasEntregas(pedidos) {
    const container = document.getElementById('listaMinhasEntregas');
    if (!container) return;

    if (pedidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Você não tem entregas em curso.</p>';
        return;
    }

    container.innerHTML = pedidos.map(p => `
        <div class="card pedido-card active" style="border-left: 5px solid #3498db; margin-bottom:15px; padding:15px; background:#fff; border-radius:12px;">
            <div style="display:flex; justify-content:space-between;">
                <b>ID: #${p.id.substring(0,6).toUpperCase()}</b>
                <span class="badge" style="background:#3498db; color:#fff; padding:3px 8px; border-radius:5px; font-size:11px;">${p.status.toUpperCase()}</span>
            </div>
            
            <div style="margin:15px 0;">
                <button class="btn btn-small btn-outline w-100" style="margin-bottom:8px;" onclick="window.Utils.openGoogleMaps('${p.bairro}')">
                    <i class="fas fa-directions"></i> ABRIR GPS (GOOGLE MAPS)
                </button>
                <button class="btn btn-small btn-outline w-100" onclick="window.Utils.openWhatsApp('${p.clienteTel}', 'Olá, sou seu entregador Benaion!')">
                    <i class="fab fa-whatsapp"></i> FALAR COM CLIENTE
                </button>
            </div>

            ${p.status === 'aceito' ? `
                <button class="btn btn-warning w-100" onclick="atualizarStatusPedido('${p.id}', 'em_entrega')">SAIR PARA ENTREGA</button>
            ` : `
                <button class="btn btn-success w-100" onclick="atualizarStatusPedido('${p.id}', 'finalizado')">CONFIRMAR ENTREGA</button>
            `}
        </div>
    `).join('');
}

// 4. AÇÕES DO ENTREGADOR
window.aceitarCorrida = async (id) => {
    try {
        const pedidoRef = doc(db, "pedidos", id);
        const snap = await getDoc(pedidoRef);
        
        if (snap.data().entregadorId) {
            window.Utils.showToast("Puxa! Outro entregador foi mais rápido.", "warning");
            return;
        }

        await updateDoc(pedidoRef, {
            entregadorId: currentUser.id,
            entregadorNome: currentUser.name,
            status: 'aceito',
            aceito_em: Date.now()
        });

        window.Utils.showToast("Corrida aceita! Vá até o local de retirada.", "success");
        window.Utils.vibrate(100);
    } catch (e) {
        window.Utils.showToast("Erro ao aceitar corrida", "error");
    }
};

window.atualizarStatusPedido = async (id, novoStatus) => {
    try {
        const data = { status: novoStatus };
        if (novoStatus === 'finalizado') data.finalizado_em = Date.now();
        
        await updateDoc(doc(db, "pedidos", id), data);
        window.Utils.showToast(`Status atualizado: ${window.Utils.getStatusText(novoStatus)}`, "success");
    } catch (e) {
        window.Utils.showToast("Erro ao atualizar status", "error");
    }
};

// 5. GESTÃO DE STATUS ONLINE/OFFLINE
window.toggleOnline = async () => {
    currentUser.online = !currentUser.online;
    localStorage.setItem('benaion_user', JSON.stringify(currentUser));
    
    await window.API.updateUser(currentUser.id, { online: currentUser.online });
    sincronizarStatusUI();
