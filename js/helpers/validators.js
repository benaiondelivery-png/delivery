// helpers/validators.js

export const validators = {
    // Valida se um número de telefone tem o tamanho mínimo
    isPhoneValid: (phone) => {
        const clean = phone.replace(/\D/g, '');
        return clean.length >= 10 && clean.length <= 11;
    },

    // Verifica se campos obrigatórios estão preenchidos
    areFieldsFilled: (fields) => {
        return fields.every(field => field && field.trim() !== '');
    }
};
