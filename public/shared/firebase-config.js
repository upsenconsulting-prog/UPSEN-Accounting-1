/**
 * Firebase Configuration - UPSEN Accounting
 * Configuração completa para Authentication e Firestore
 * 
 * DESENVOLVIMENTO LOCAL:
 * - Execute: firebase emulators:start
 * - Aceda: http://localhost:4000 para ver UI dos emulators
 * 
 * PRODUÇÃO (Firebase Cloud):
 * - Mude USE_EMULATORS para false
 * - Substitua a configuração com as suas credenciais reais do Firebase Console
 */

// ===== CONFIGURAÇÃO PARA EMULATORS (DESENVOLVIMENTO) =====
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "upsen-accounting-demo.firebaseapp.com",
  projectId: "upsen-accounting-demo",
  storageBucket: "upsen-accounting-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// ===== CONFIGURAÇÃO PARA PRODUÇÃO (substitua com as suas credenciais) =====
// const firebaseConfig = {
//   apiKey: "SUA-API-KEY",
//   authDomain: "SEU-PROJETO.firebaseapp.com",
//   projectId: "SEU-PROJETO",
//   storageBucket: "SEU-PROJETO.appspot.com",
//   messagingSenderId: "SEU-SENDER-ID",
//   appId: "SUA-APP-ID"
// };

// Bandeira para usar Firebase Emulators (desenvolvimento local)
// Mude para false quando quiser usar Firebase Cloud (produção)
const USE_EMULATORS = true;

// Exportar configuração para outros módulos
export { firebaseConfig, USE_EMULATORS };

