// helpers/formatters.js

export const formatters = {
    // Formata números para moeda brasileira (R$ 0,00)
    currency: (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    },

    // Formata timestamp do Firestore para data legível
    date: (timestamp) => {
        if (!timestamp) return '--/--';
        const date = new Date(timestamp);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    },

    // Remove caracteres especiais de telefones ou CPFs
    cleanString: (str) => {
        return str.replace(/\D/g, '');
    }
};

