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

const API = {
  async getUserProfile(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async saveUserToFirestore(uid, userData) {
    await setDoc(doc(db, "users", uid), { ...userData, updated_at: Date.now() }, { merge: true });
  },

  async updateUser(uid, data) {
    return await updateDoc(doc(db, "users", uid), data);
  },

  escutarTodosPedidos(callback) {
    return onSnapshot(collection(db, "pedidos"), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      if (result?.user) {
        let profile = await API.getUserProfile(result.user.uid);
        
        if (!profile) {
          profile = { 
            name: result.user.displayName, 
            email: result.user.email, 
            userType: 'cliente', 
            online: false 
          };
          await API.saveUserToFirestore(result.user.uid, profile);
        }

        const userData = { id: result.user.uid, ...profile };
        localStorage.setItem('benaion_user', JSON.stringify(userData));
        
        // Redirecionamento imediato após salvar os dados
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

// Exportações Globais
window.API = API;
window.Auth = Auth;
window.db = db;
window.auth = auth;

export { API, Auth, db, auth };
