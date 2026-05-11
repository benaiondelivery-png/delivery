// ========================================
// BENAION DELIVERY - CORE API (V2.2)
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, 
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  sendPasswordResetEmail, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ========================================
// CONFIGURAÇÃO FIREBASE
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0",
  measurementId: "G-TK1KNW14WH"
};

// ========================================
// INICIALIZAÇÃO
// ========================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ========================================
// API PRINCIPAL
// ========================================
const API = {
  // ---- USUÁRIOS ----
  async getUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), { 
      ...userData, 
      updated_at: Date.now() 
    }, { merge: true });
  },

  async updateUser(uid, data) {
    return await updateDoc(doc(db, "users", uid), data);
  },

  // ---- PEDIDOS ----
  async createPedido(data) {
    return await addDoc(collection(db, "pedidos"), {
      ...data,
      created_at: data.created_at || Date.now()
    });
  },

  async updatePedido(id, data) {
    return await updateDoc(doc(db, "pedidos", id), data);
  },

  async deletePedido(id) {
    return await deleteDoc(doc(db, "pedidos", id));
  },

  async getPedido(id) {
    const docSnap = await getDoc(doc(db, "pedidos", id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snap) => {
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos);
    });
  },

  escutarPedidosPorLoja(lojaId, callback) {
    const q = query(collection(db, "pedidos"), where("lojaId", "==", lojaId));
    return onSnapshot(q, (snap) => {
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos);
    });
  },

  escutarPedidosPorCliente(clienteId, callback) {
    const q = query(collection(db, "pedidos"), where("clienteId", "==", clienteId));
    return onSnapshot(q, (snap) => {
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos);
    });
  },

  escutarPedidosPorEntregador(entregadorId, callback) {
    const q = query(collection(db, "pedidos"), where("entregadorId", "==", entregadorId));
    return onSnapshot(q, (snap) => {
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos);
    });
  },

  // ---- TAXAS ----
  calcularTaxa(origem, destino) {
    const taxas = window.TAXAS_LOCAIS || {};
    const taxa = taxas[destino] || taxas[origem];
    if (taxa) return taxa;
    
    // Tabela padrão se não houver taxas cadastradas
    const tabelaPadrao = {
      "Centro": 6.00,
      "Agreste": 8.00,
      "Nova esperança": 7.50,
      "Nova Esperança": 7.50,
      "Prosperidade": 9.00,
      "Castanheira": 10.00,
      "Cajari": 8.50,
      "Rodovia do gogó": 12.00,
      "buritizal": 10.00,
      "Buritizal": 10.00,
      "Sarney": 7.00,
      "Nazaré mineiro": 11.00,
      "mirilandia": 9.50,
      "Rio branco": 8.00,
      "José cesário": 10.50,
      "Malvinas": 7.50,
      "samaúma": 13.00,
      "monte dourado": 15.00,
      "Monte Dourado": 15.00
    };
    return tabelaPadrao[destino] || tabelaPadrao[origem] || 6.00;
  },

  async carregarTaxas() {
    try {
      const docSnap = await getDoc(doc(db, "config", "taxas"));
      if (docSnap.exists()) {
        window.TAXAS_LOCAIS = docSnap.data();
      }
    } catch (e) {
      console.log("Taxas não carregadas, usando padrão local.");
    }
  },

  async salvarTaxas(taxas) {
    await setDoc(doc(db, "config", "taxas"), taxas);
    window.TAXAS_LOCAIS = taxas;
  },

  // ---- PRODUTOS ----
  async getProdutosLoja(lojaId) {
    const q = query(collection(db, "produtos"), where("lojaId", "==", lojaId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addProduto(produto) {
    return await addDoc(collection(db, "produtos"), produto);
  },

  async updateProduto(id, data) {
    return await updateDoc(doc(db, "produtos", id), data);
  },

  async deleteProduto(id) {
    return await deleteDoc(doc(db, "produtos", id));
  }
};

// ========================================
// AUTENTICAÇÃO
// ========================================
const Auth = {
  async loginWithGoogle() {
    await signInWithRedirect(auth, googleProvider);
  },

  async handleRedirect() {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        let profile = await API.getUserProfile(result.user.uid);
        
        if (!profile) {
          profile = { 
            name: result.user.displayName || "Usuário Google", 
            email: result.user.email, 
            userType: 'cliente', 
            online: false,
            created_at: Date.now()
          };
          await API.saveUserToFirestore(result.user.uid, profile);
        }

        const userData = { id: result.user.uid, ...profile };
        localStorage.setItem('benaion_user', JSON.stringify(userData));
        window.location.href = `${profile.userType}.html`;
      }
    } catch (e) { 
      console.error("Erro no Redirecionamento:", e); 
    }
  },

  logout() {
    auth.signOut();
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() { 
    return JSON.parse(localStorage.getItem('benaion_user')); 
  },

  requireAuth(allowedTypes = []) {
    const user = this.getCurrentUser();
    if (!user) { 
      window.location.href = 'index.html'; 
      return false; 
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
      window.location.href = `${user.userType}.html`;
      return false;
    }
    return true;
  }
};

// ========================================
// EXPORTAÇÕES GLOBAIS
// ========================================
window.API = API;
window.Auth = Auth;
window.db = db;
window.auth = auth;

// Carrega taxas ao iniciar
API.carregarTaxas();

export { API, Auth, db, auth };
