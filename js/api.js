import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// Taxas dinâmicas (Carregamento inicial + Real-time)
let TAXAS_LOCAIS = {
  "Agreste": 6, "Nova esperança": 6, "Prosperidade": 6, "Castanheira": 6,
  "Cajari": 7, "Rodovia do gogó": 8, "buritizal": 7, "Sarney": 8,
  "Nazaré mineiro": 10, "centro": 6, "mirilandia": 6, "Rio branco": 7,
  "José cesário": 6, "Malvinas": 8, "samaúma": 15, "monte dourado": 30
};

onSnapshot(doc(db, "configuracoes", "taxas"), (doc) => {
    if (doc.exists()) {
        TAXAS_LOCAIS = doc.data();
        console.log("✅ Taxas atualizadas via Firestore");
    }
});

const API = {
  calcularTaxa(bairroOrigem, bairroDestino) {
    const TAXA_MINIMA = 6;
    if (!bairroOrigem || !bairroDestino) return TAXA_MINIMA;
    const t1 = TAXAS_LOCAIS[bairroOrigem] || TAXA_MINIMA;
    const t2 = TAXAS_LOCAIS[bairroDestino] || TAXA_MINIMA;
    return Math.max(t1, t2);
  },

  async getUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), { ...userData, updated_at: Date.now() }, { merge: true });
  },

  async createPedido(pedidoData) {
    return await addDoc(collection(db, "pedidos"), {
      ...pedidoData,
      status: pedidoData.status || 'aguardando_entregador',
      created_at: Date.now()
    });
  },

  async updatePedido(id, data) {
    return await updateDoc(doc(db, "pedidos", id), { ...data, updated_at: Date.now() });
  },

  async deletePedido(id) {
    await deleteDoc(doc(db, "pedidos", id));
  },

  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  },

  async updateUser(uid, data) {
    return await updateDoc(doc(db, "users", uid), data);
  }
};

const Auth = {
  async loginWithGoogle() {
    await signInWithRedirect(auth, googleProvider);
  },

  async handleRedirect() {
    // Só processa o redirect se estivermos na index.html ou página de login
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') return;

    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        let profile = await API.getUserProfile(result.user.uid);
        if (!profile) {
          profile = { name: result.user.displayName, email: result.user.email, userType: 'cliente', online: false };
          await API.saveUserToFirestore(result.user.uid, profile);
        }
        localStorage.setItem('benaion_user', JSON.stringify({ id: result.user.uid, ...profile }));
        window.location.href = `${profile.userType}.html`;
      }
    } catch (e) { console.error("Erro Auth:", e); }
  },

  async loginWithEmail(email, pass) {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await API.getUserProfile(cred.user.uid);
    localStorage.setItem('benaion_user', JSON.stringify({ id: cred.user.uid, ...profile }));
    window.location.href = `${profile.userType}.html`;
  },

  logout() {
    auth.signOut();
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() { return JSON.parse(localStorage.getItem('benaion_user')); },

  requireAuth(allowedTypes = []) {
    const user = this.getCurrentUser();
    if (!user) { window.location.href = 'index.html'; return false; }
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};

// Inicialização
Auth.handleRedirect();

// Exportações Globais
window.API = API;
window.Auth = Auth;
window.db = db;
window.auth = auth;
window.authService = { createUserWithEmailAndPassword, signInWithEmailAndPassword };

export { API, Auth, db, auth };
