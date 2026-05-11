// ========================================
// BENAION DELIVERY - CORE API (V2.3)
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, 
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot,
  enableIndexedDbPersistence, disableNetwork, enableNetwork
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

// Tentar habilitar persistência offline
try {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Persistência offline não disponível:", err.code);
  });
} catch (e) {
  console.warn("Erro ao configurar persistência:", e);
}

// ========================================
// API PRINCIPAL
// ========================================
const API = {
  // ---- USUÁRIOS ----
  async getUserProfile(uid) {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (e) {
      console.error("Erro ao buscar perfil:", e.code, e.message);
      // Se estiver offline, tenta reconectar
      if (e.code === 'unavailable' || e.message.includes('offline')) {
        try {
          await enableNetwork(db);
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
        } catch (e2) {
          console.error("Falha na reconexão:", e2);
        }
      }
      return null;
    }
  },

  async saveUserToFirestore(uid, userData) {
    try {
      await setDoc(doc(db, "users", uid), { 
        ...userData, 
        updated_at: Date.now() 
      }, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar usuário:", e);
      throw e;
    }
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
    
    const tabelaPadrao = {
      "Centro": 6, "Agreste": 8, "Nova esperança": 7, "Nova Esperança": 7,
      "Prosperidade": 9, "Castanheira": 6, "Cajari": 7, "Rodovia do gogo": 8,
      "buritizal": 7, "Buritizal": 7, "Sarney": 8, "Nazaré mineiro": 10,
      "mirilandia": 6, "Rio branco": 7, "José cesário": 10, "Malvinas": 8,
      "samaúma": 15, "monte dourado": 15, "Monte Dourado": 15
    };
    return tabelaPadrao[destino] || tabelaPadrao[origem] || 6;
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

        localStorage.setItem('benaion_user', JSON.stringify({ id: result.user.uid, ...profile }));
        window.location.href = `${profile.userType}.html`;
        return true;
      }
      return false;
    } catch (e) { 
      console.error("Erro no Redirecionamento:", e);
      return false;
    }
  },

  logout() {
    auth.signOut();
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() { 
    try {
      return JSON.parse(localStorage.getItem('benaion_user')); 
    } catch (e) {
      return null;
    }
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

API.carregarTaxas();

export { API, Auth, db, auth };
