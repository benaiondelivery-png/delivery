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

// Configurações Globais
let TAXAS_LOCAIS = { "Agreste": 6, "Centro": 6, "monte dourado": 30 }; 

const API = {
  calcularTaxa(bairroOrigem, bairroDestino) {
    const taxaRet = TAXAS_LOCAIS[bairroOrigem] || 6;
    const taxaEnt = TAXAS_LOCAIS[bairroDestino] || 6;
    return Math.max(taxaRet, taxaEnt);
  },
  async getUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },
  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), { ...userData, updated_at: new Date().toISOString() }, { merge: true });
  },
  async createPedido(pedidoData) {
    return await addDoc(collection(db, "pedidos"), { ...pedidoData, created_at: new Date().toISOString() });
  },
  async updatePedido(id, data) {
    return await updateDoc(doc(db, "pedidos", id), data);
  },
  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
};

const Auth = {
  async loginWithGoogle() {
    await signInWithRedirect(auth, googleProvider);
  },
  async handleRedirect() {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        let profile = await API.getUserProfile(result.user.uid);
        if (!profile) {
          profile = { name: result.user.displayName, email: result.user.email, userType: 'cliente', online: false };
          await API.saveUserToFirestore(result.user.uid, profile);
        }
        localStorage.setItem('benaion_user', JSON.stringify({ id: result.user.uid, ...profile }));
        window.location.href = `${profile.userType}.html`;
      }
    } catch (e) { console.error("Erro Google Auth:", e); }
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
      window.location.href = 'index.html'; return false;
    }
    return true;
  }
};

// Inicialização
Auth.handleRedirect();
window.API = API;
window.Auth = Auth;
window.db = db;
window.auth = auth;
