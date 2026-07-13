// helpers/dom.js

export const dom = {
    // Alerta estilo "Toast" que desaparece sozinho
    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    },

    // Alternar visibilidade de elementos (esconder/mostrar)
    toggleVisibility: (elementId) => {
        const el = document.getElementById(elementId);
        if (el) el.classList.toggle('hidden');
    }
};

