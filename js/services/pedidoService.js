// ========================================
// BENAION DELIVERY
// Pedido Service
// ========================================

import { API } from "../api.js";
import { STATUS } from "../config/status.js";
import { getTaxa } from "../config/taxas.js";

class PedidoService {

    // ===========================
    // Criar Pedido
    // ===========================
    async criar(dados) {

        const pedido = {

            codigo: this.gerarCodigo(),

            clienteId: dados.clienteId,

            cliente: dados.cliente,

            parceiroId: dados.parceiroId || null,

            entregadorId: null,

            retirada: dados.retirada,

            entrega: dados.entrega,

            bairroRetirada: dados.bairroRetirada,

            bairroEntrega: dados.bairroEntrega,

            produto: dados.produto,

            valorProdutos: dados.valorProdutos || 0,

            taxaEntrega: dados.taxaEntrega ?? getTaxa(dados.bairroEntrega),

            status: STATUS.AGUARDANDO_ENTREGADOR,

            created_at: Date.now(),

            aceitoEm: null,

            saiuParaEntrega: null,

            entregueEm: null

        };

        return await API.criarPedido(pedido);

    }

    // ===========================
    // Buscar Pedido
    // ===========================
    async buscar(id) {

        return await API.buscarPedido(id);

    }

    // ===========================
    // Buscar Todos
    // ===========================
    async listar() {

        return await API.listarPedidos();

    }

    // ===========================
    // Atualizar Status
    // ===========================
    async atualizarStatus(id, status) {

        return await API.atualizarPedido(id, {

            status,

            atualizadoEm: Date.now()

        });

    }

    // ===========================
    // Aceitar Pedido
    // ===========================
    async aceitar(id, entregadorId) {

        return await API.atualizarPedido(id, {

            status: STATUS.ACEITO,

            entregadorId,

            aceitoEm: Date.now()

        });

    }

    // ===========================
    // Iniciar Entrega
    // ===========================
    async iniciarEntrega(id) {

        return await API.atualizarPedido(id, {

            status: STATUS.EM_ENTREGA,

            saiuParaEntrega: Date.now()

        });

    }

    // ===========================
    // Finalizar
    // ===========================
    async finalizar(id) {

        return await API.atualizarPedido(id, {

            status: STATUS.FINALIZADO,

            entregueEm: Date.now()

        });

    }

    // ===========================
    // Cancelar
    // ===========================
    async cancelar(id, motivo = "") {

        return await API.atualizarPedido(id, {

            status: STATUS.CANCELADO,

            motivoCancelamento: motivo,

            canceladoEm: Date.now()

        });

    }

    // ===========================
    // Código do Pedido
    // ===========================
    gerarCodigo() {

        const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        const prefixo =
            letras[Math.floor(Math.random() * letras.length)] +
            letras[Math.floor(Math.random() * letras.length)];

        const numero = Math.floor(100000 + Math.random() * 900000);

        return `${prefixo}-${numero}`;

    }

}

export default new PedidoService();
