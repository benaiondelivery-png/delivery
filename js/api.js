import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl-U9X9qxohjDpgr8y2pdkS3j-qNm19pk",
  authDomain: "benaion-delivery.firebaseapp.com",
  projectId: "benaion-delivery",
  storageBucket: "benaion-delivery.firebasestorage.app",
  messagingSenderId: "309927409217",
  appId: "1:309927409217:web:7a105cb5237b2294b1b8c0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const API = {
  async saveUserToFirestore(uid, data) {
    await setDoc(doc(db, "usuarios", uid), { ...data, updated_at: Date.now() });
  },
  async getUserProfile(uid) {
    const d = await getDoc(doc(db, "usuarios", uid));
    return d.exists() ? d.data() : null;
  },
  async createPedido(data) {
    // Padronizando para Timestamp numérico para facilitar ordenação no cliente
    return await addDoc(collection(db, "pedidos"), { 
        ...data, 
        created_at: Date.now(),
        timestamp: serverTimestamp() 
    });
  },
  async updatePedido(id, data) {
    await updateDoc(doc(db, "pedidos", id), data);
  },
  async deletePedido(id) {
    await deleteDoc(doc(db, "pedidos", id));
  },
  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
};

export const Auth = {
  async loginWithGoogle() { await signInWithRedirect(auth, googleProvider); },
  logout() {
    signOut(auth);
    localStorage.removeItem('benaion_user');
    window.location.href = 'index.html';
  },
  getCurrentUser() { return JSON.parse(localStorage.getItem('benaion_user')); },
  requireAuth(allowedTypes = []) {
    const user = this.getCurrentUser();
    if (!user) { window.location.href = 'index.html'; return false; }
    if (allowedTypes.length > 0 && !allowedTypes.includes(user.userType)) {
        alert("Acesso restrito!");
        window.location.href = 'index.html';
        return false;
    }
    return true;
  }
};

// Disponibiliza globalmente para os scripts legados (HTML)
window.API = API;
window.Auth = Auth;
window.auth = auth;
