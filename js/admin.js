// ========================================
// BENAION DELIVERY - PAINEL ADMINISTRATIVO (V2.2.0)
// ========================================

let todosPedidos = [];
let filtroAtual = 'todos';

/**
 * Inicialização com proteção contra carregamento assíncrono
 */
async function initAdmin() {
    if (!window.Auth || !window.API || !window.db) {
        setTimeout(initAdmin, 300);
        return;
    }

    try {
        // Proteção de Rota
        if (!window.Auth.requireAuth(['admin'])) return;

        console.log('🚀 Benaion Admin: Painel operacional conectado.');
        
        // 1. Escuta Pedidos em Tempo Real
        window.API.escutarTodosPedidos((pedidos) => {
            // Ordena por data (mais recentes primeiro)
            todosPedidos = pedidos.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
            actualizarInterfaceAdmin();
            renderizarPedidosAdmin();
        });

        // 2. Inicia a Gestão de Taxas
        setTimeout(carregarConfiguracoesTaxas, 1000); // Aguarda sync inicial das taxas

    } catch (error) {
        console.error('Erro Admin:', error);
    }
}

// ========================================
// DASHBOARD & ESTATÍSTICAS
// ========================================

function actualizarInterfaceAdmin() {
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

// ========================================
// GESTÃO DE TAXAS (Laranjal/Monte Dourado)
// ========================================

function carregarConfiguracoesTaxas() {
    const container = document.getElementById('listaConfigTaxas');
    if (!container) return;

    // Puxa as taxas que a API.js já sincronizou no escopo global
    // Caso ainda não tenha carregado, usamos um fallback
    const taxas = window.TAXAS_LOCAIS || {}; 

    container.innerHTML = Object.keys(taxas).sort().map(bairro => `
        <div class="taxa-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
            <span style="font-weight: 500; font-size: 14px;">${bairro}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: #666;">R$</span>
                <input type="number" step="0.50" class="input-taxa-dinamica" data-bairro="${bairro}" value="${taxas[bairro]}" 
                       style="width: 80px; padding: 5px; border: 1px solid #ddd; border-radius: 6px; text-align: center; font-weight: bold;">
            </div>
        </div>
    `).join('');
}

window.salvarNovasTaxas = async () => {
    const btn = event.target;
    const originalText = btn.textContent;
    const inputs = document.querySelectorAll('.input-taxa-dinamica');
    const novaTabela = {};

    inputs.forEach(input => {
        novaTabela[input.dataset.bairro] = parseFloat(input.value);
    });

    try {
        btn.disabled = true;
        btn.textContent = "SALVANDO...";
        
        // Caminho direto no Firestore via API
        await window.API.saveUserToFirestore('taxas', novaTabela); // Usando a lógica de setDoc
        // Ou se você criou uma função específica:
        // await window.API.atualizarConfiguracao('taxas', novaTabela);

        window.Utils.showToast("Tabela de Taxas atualizada no sistema!", "success");
    } catch (err) {
        window.Utils.showToast("Erro ao sincronizar taxas", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

// ========================================
// RENDEREZAÇÃO E FILTROS
// ========================================

window.filtrarPedidos = (status) => {
    filtroAtual = status;
    renderizarPedidosAdmin();
    
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    if(event) event.target.classList.add('active');
};

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
        <div class="card-pedido-admin animate__animated animate__fadeInUp" style="border-left: 5px solid ${getStatusColor(p.status)};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <b style="font-size: 15px; color: #333;">#${p.id.substring(0, 6).toUpperCase()}</b>
                    <div style="font-size: 11px; color: #e30613; font-weight: bold;">${p.lojaNome || 'PEDIDO AVULSO'}</div>
                </div>
                <span class="badge" style="background: ${getStatusColor(p.status)}; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: bold;">
                    ${window.Utils.getStatusText(p.status).toUpperCase()}
                </span>
            </div>
            
            <div style="margin: 15px 0; font-size: 13px; color: #444;">
                <div style="margin-bottom: 5px;">
                    <i class="fas fa-arrow-up" style="color: #27ae60; width: 15px;"></i> ${p.bairroRetirada || 'Não informado'}
                </div>
                <div>
                    <i class="fas fa-arrow-down" style="color: #e30613; width: 15px;"></i> ${p.bairro}
                </div>
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

function getStatusColor(status) {
    const cores = {
        'pendente': '#f1c40f',
        'aguardando_entregador': '#95a5a6',
        'aceito': '#3498db',
        'em_entrega': '#e67e22',
        'finalizado': '#2ecc71',
        'cancelado': '#e30613'
    };
    return cores[status] || '#ccc';
}

document.addEventListener('DOMContentLoaded', initAdmin);
