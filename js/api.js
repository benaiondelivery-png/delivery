// ========================================
// BENAION DELIVERY - CORE API (V4.0)
// Melhorias: Cache inteligente, retry automático, logs, métricas
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, startAfter,
  doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
  enableIndexedDbPersistence, enableNetwork, disableNetwork, runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  sendPasswordResetEmail, signOut, onAuthStateChanged,
  sendEmailVerification, updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0",
  measurementId: "G-TK1KNW14WH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Configurar Google Provider
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Persistência offline
try { enableIndexedDbPersistence(db).catch(() => {}); } catch(e) {}

// Cache em memória
const memoryCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

function getCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

// Retry automático para operações
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        try { await enableNetwork(db); } catch(e2) {}
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

// Métricas
const metrics = {
  pedidosCriados: 0,
  entregasFinalizadas: 0,
  loginsRealizados: 0,
  erros: 0,
  
  registrar(metrica) {
    this[metrica]++;
    // Envia para analytics se existir
    if (window.gtag) {
      window.gtag('event', metrica, { event_category: 'benaion' });
    }
  }
};

// ========================================
// API PRINCIPAL
// ========================================
const API = {
  // ---- MÉTRICAS ----
  metrics: metrics,

  // ---- USUÁRIOS ----
  async getUserProfile(uid) {
    const cacheKey = `user_${uid}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const docSnap = await withRetry(() => getDoc(doc(db, "users", uid)));
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setCache(cacheKey, data);
        return data;
      }
      return null;
    } catch (e) {
      console.error("❌ getUserProfile:", e.code);
      metrics.registrar('erros');
      return null;
    }
  },

  async saveUserToFirestore(uid, userData) {
    const cacheKey = `user_${uid}`;
    setCache(cacheKey, { id: uid, ...userData });
    
    return await withRetry(() => 
      setDoc(doc(db, "users", uid), { ...userData, updated_at: Date.now() }, { merge: true })
    );
  },

  async updateUser(uid, data) {
    const cacheKey = `user_${uid}`;
    memoryCache.delete(cacheKey);
    return await withRetry(() => updateDoc(doc(db, "users", uid), data));
  },

  async getUsersByType(userType) {
    const cacheKey = `users_type_${userType}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const q = query(collection(db, "users"), where("userType", "==", userType));
      const snap = await withRetry(() => getDocs(q));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error("❌ getUsersByType:", e.code);
      return [];
    }
  },

  async getAllUsers() {
    try {
      const snap = await withRetry(() => getDocs(collection(db, "users")));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      return [];
    }
  },

  // ---- PEDIDOS ----
  async createPedido(data) {
    metrics.registrar('pedidosCriados');
    
    const pedido = {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: Date.now()
    };
    
    return await withRetry(() => addDoc(collection(db, "pedidos"), pedido));
  },

  async updatePedido(id, data) {
    const updateData = { ...data, updated_at: Date.now() };
    
    if (data.status === 'finalizado') {
      metrics.registrar('entregasFinalizadas');
      updateData.finalizado_em = Date.now();
    }
    
    return await withRetry(() => updateDoc(doc(db, "pedidos", id), updateData));
  },

  async deletePedido(id) {
    return await withRetry(() => deleteDoc(doc(db, "pedidos", id)));
  },

  async getPedido(id) {
    try {
      const snap = await withRetry(() => getDoc(doc(db, "pedidos", id)));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch(e) {
      return null;
    }
  },

  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("❌ Erro listener pedidos:", error.code);
      metrics.registrar('erros');
    });
  },

  async getHistoricoEntregador(entregadorId) {
    try {
      const q = query(
        collection(db, "pedidos"),
        where("entregadorId", "==", entregadorId),
        where("status", "==", "finalizado"),
        orderBy("finalizado_em", "desc"),
        limit(50)
      );
      const snap = await withRetry(() => getDocs(q));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      return [];
    }
  },

  async getPedidosPaginados(ultimoDoc = null, pageSize = 20) {
    try {
      let q = query(collection(db, "pedidos"), orderBy("created_at", "desc"), limit(pageSize));
      if (ultimoDoc) q = query(q, startAfter(ultimoDoc));
      
      const snap = await withRetry(() => getDocs(q));
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = snap.docs[snap.docs.length - 1] || null;
      
      return { pedidos, ultimoDoc: lastDoc, temMais: snap.docs.length === pageSize };
    } catch(e) {
      return { pedidos: [], ultimoDoc: null, temMais: false };
    }
  },

  // ---- TAXAS ----
  calcularTaxa(origem, destino) {
    const taxas = window.TAXAS_LOCAIS || {};
    const taxa = taxas[destino] || taxas[origem];
    if (taxa) return Number(taxa);
    
    const tabelaPadrao = {
      "Centro": 6.00, "Agreste": 8.00, "Nova esperança": 7.50,
      "Nova Esperança": 7.50, "Prosperidade": 9.00, "Castanheira": 6.00,
      "Cajari": 7.00, "Rodovia do gogo": 8.00, "buritizal": 7.00,
      "Buritizal": 7.00, "Sarney": 8.00, "Nazaré mineiro": 10.00,
      "mirilandia": 6.00, "Rio branco": 7.00, "José cesário": 10.00,
      "Malvinas": 8.00, "samaúma": 15.00, "monte dourado": 15.00,
      "Monte Dourado": 15.00
    };
    return tabelaPadrao[destino] || tabelaPadrao[origem] || 6.00;
  },

  async carregarTaxas() {
    try {
      const docSnap = await withRetry(() => getDoc(doc(db, "config", "taxas")));
      if (docSnap.exists()) window.TAXAS_LOCAIS = docSnap.data();
    } catch(e) {}
  },

  async salvarTaxas(taxas) {
    await withRetry(() => setDoc(doc(db, "config", "taxas"), taxas));
    window.TAXAS_LOCAIS = taxas;
    window.Utils?.showToast?.("✅ Taxas atualizadas!", "success");
  },

  // ---- PRODUTOS ----
  async getProdutosLoja(lojaId) {
    try {
      const q = query(collection(db, "produtos"), where("lojaId", "==", lojaId));
      const snap = await withRetry(() => getDocs(q));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      return [];
    }
  },

  async addProduto(produto) {
    return await withRetry(() => addDoc(collection(db, "produtos"), { ...produto, created_at: Date.now() }));
  },

  async updateProduto(id, data) {
    return await withRetry(() => updateDoc(doc(db, "produtos", id), data));
  },

  async deleteProduto(id) {
    return await withRetry(() => deleteDoc(doc(db, "produtos", id)));
  },

  // ---- AVALIAÇÕES ----
  async addAvaliacao(data) {
    return await withRetry(() => addDoc(collection(db, "avaliacoes"), { ...data, created_at: Date.now() }));
  },

  async getAvaliacoesEntregador(entregadorId) {
    try {
      const q = query(collection(db, "avaliacoes"), where("entregadorId", "==", entregadorId));
      const snap = await withRetry(() => getDocs(q));
      const avaliacoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const media = avaliacoes.length > 0 
        ? (avaliacoes.reduce((a,b) => a + b.nota, 0) / avaliacoes.length).toFixed(1)
        : 0;
      return { avaliacoes, media, total: avaliacoes.length };
    } catch(e) {
      return { avaliacoes: [], media: 0, total: 0 };
    }
  },

  // ---- MÉTRICAS DO SISTEMA ----
  async getDashboardStats() {
    try {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      
      const [pedidosSnap, usersSnap] = await Promise.all([
        withRetry(() => getDocs(collection(db, "pedidos"))),
        withRetry(() => getDocs(collection(db, "users")))
      ]);
      
      const pedidos = pedidosSnap.docs.map(d => d.data());
      const pedidosHoje = pedidos.filter(p => p.created_at >= hoje.getTime());
      const ativos = pedidos.filter(p => !['finalizado','cancelado'].includes(p.status));
      const faturamentoHoje = pedidosHoje.reduce((a,p) => a + (p.taxaEntrega||0), 0);
      
      const users = usersSnap.docs.map(d => d.data());
      
      return {
        pedidosHoje: pedidosHoje.length,
        pedidosAtivos: ativos.length,
        faturamentoHoje,
        totalUsuarios: users.length,
        totalClientes: users.filter(u => u.userType === 'cliente').length,
        totalEntregadores: users.filter(u => u.userType === 'entregador').length,
        totalParceiros: users.filter(u => u.userType === 'parceiro').length,
        ultimaAtualizacao: Date.now()
      };
    } catch(e) {
      return null;
    }
  },

  // ---- LIMPEZA DE CACHE ----
  clearCache() {
    memoryCache.clear();
    console.log("🧹 Cache limpo");
  }
};

// ========================================
// AUTENTICAÇÃO
// ========================================
const Auth = {
  async loginWithGoogle() {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch(e) {
      console.error("❌ Google login:", e);
      throw e;
    }
  },

  async handleRedirect() {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        metrics.registrar('loginsRealizados');
        
        let profile = await API.getUserProfile(result.user.uid);
        if (!profile) {
          profile = { 
            name: result.user.displayName || "Usuário", 
            email: result.user.email, 
            userType: 'cliente', 
            online: false,
            emailVerified: result.user.emailVerified,
            photoURL: result.user.photoURL || null,
            created_at: Date.now()
          };
          await API.saveUserToFirestore(result.user.uid, profile);
        }

        const userData = { id: result.user.uid, ...profile };
        localStorage.setItem('benaion_user', JSON.stringify(userData));
        
        console.log("✅ Login Google:", profile.email, "→", profile.userType);
        window.location.href = `${profile.userType}.html`;
        return true;
      }
      return false;
    } catch(e) { 
      console.error("❌ Redirect:", e.code, e.message);
      return false;
    }
  },

  async loginWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      metrics.registrar('loginsRealizados');
      console.log("✅ Login:", email);
      return result;
    } catch(e) {
      console.error("❌ Login:", e.code);
      throw e;
    }
  },

  async register(email, password) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ Registro:", email);
      return result;
    } catch(e) {
      console.error("❌ Registro:", e.code);
      throw e;
    }
  },

  async resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
    console.log("📧 Reset enviado para:", email);
  },

  async sendVerificationEmail() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  },

  logout() {
    signOut(auth);
    localStorage.removeItem('benaion_user');
    localStorage.removeItem('benaion_enderecos');
    API.clearCache();
    window.location.href = 'index.html';
  },

  getCurrentUser() { 
    try { return JSON.parse(localStorage.getItem('benaion_user')); } 
    catch(e) { return null; }
  },

  isAuthenticated() {
    return !!this.getCurrentUser();
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
  },

  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// ========================================
// EXPORTAÇÕES GLOBAIS
// ========================================
window.API = API;
window.Auth = Auth;
window.db = db;
window.auth = auth;

// Carregar taxas ao iniciar
API.carregarTaxas();

// Log de inicialização
console.log("🚀 Benaion API V4.0 inicializada");
console.log("📊 Métricas:", metrics);

export { API, Auth, db, auth };
