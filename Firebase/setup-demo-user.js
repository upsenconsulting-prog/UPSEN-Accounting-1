/**
 * Firebase Emulators Setup Script
 * UPSEN Accounting - Development Only
 * 
 * Usage:
 * 1. Run: firebase emulators:start
 * 2. Run this script: node setup-demo-user.js
 */

const { getAuth } = require('firebase-auth');
const { getFirestore, doc, setDoc, collection } = require('firebase-firestore');
const { initializeApp } = require('firebase-app');

// Configuração (mesma que em public/shared/firebase-config.js)
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "upsen-accounting-demo.firebaseapp.com",
  projectId: "upsen-accounting-demo",
  storageBucket: "upsen-accounting-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

async function setupDemoUser() {
  console.log('🔧 Configurando Firebase Emulators...\n');

  const app = initializeApp(firebaseConfig, 'setup');
  const db = getFirestore(app);

  const demoUser = {
    uid: 'demo_admin',
    email: 'admin@demo.com',
    displayName: 'John Smith (Demo)'
  };

  console.log('📝 Criando utilizador demo:', demoUser.email);

  try {
    // Criar documento do utilizador na Firestore
    const userDoc = {
      id: demoUser.uid,
      companyName: demoUser.displayName,
      email: demoUser.email,
      phone: '+351 123 456 789',
      role: 'admin',
      settings: {
        currency: 'EUR',
        language: 'pt',
        theme: 'light'
      },
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', demoUser.uid), userDoc);
    console.log('✅ Documento do utilizador criado na Firestore');

    // Criar subcollections com dados demo
    const collections = ['invoices_received', 'invoices_issued', 'expenses', 'budgets'];
    
    for (const colName of collections) {
      await setDoc(doc(db, 'users', demoUser.uid, colName, '_init'), {
        _init: true,
        message: `Collection ${colName} inicializada`
      });
      console.log(`  📁 Collection ${colName} criada`);
    }

    console.log('\n✅ Setup completo!');
    console.log('\n📋 Credenciais do utilizador demo:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: demo123');
    console.log('\n🌐 Aceda à UI dos Emulators: http://localhost:4000');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n💡 Certifique-se de que os emulators estão a executar:');
    console.log('   firebase emulators:start');
  }
}

setupDemoUser();

