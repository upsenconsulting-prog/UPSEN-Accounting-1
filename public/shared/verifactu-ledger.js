/**
 * verifactu-ledger.js
 * Sistema de Registo WORM (Write Once Read Many) para Veri*Factu
 * Implementa o livro de registo append-only para compliance fiscal
 */

(function() {
  'use strict';

  // ========== KEYS ==========
  var LEDGER_KEY = 'upsen_verifactu_ledger';
  var LEDGER_INDEX_KEY = 'upsen_verifactu_ledger_index';

  // ========== HELPER FUNCTIONS ==========
  
  function getUserId() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return window.firebaseAuth.currentUser.uid;
    }
    try {
      var session = localStorage.getItem('upsen_current_user');
      if (session) {
        var data = JSON.parse(session);
        if (data && data.user) return data.user.uid || data.user.id || 'unknown';
      }
    } catch (e) {}
    return 'unknown';
  }

  function getUserLedgerKey() {
    var userId = getUserId();
    return userId ? LEDGER_KEY + '_' + userId : LEDGER_KEY;
  }

  // ========== LEDGER FUNCTIONS ==========

  /**
   * Ler todo o livro de registo
   */
  function readLedger() {
    var key = getUserLedgerKey();
    var data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  /**
   * Escrever no livro de registo (append-only)
   */
  function writeLedger(entries) {
    var key = getUserLedgerKey();
    localStorage.setItem(key, JSON.stringify(entries));
  }

  /**
   * Obter o último registo do livro (para encadeamento)
   */
  function getLastLedgerEntry() {
    var ledger = readLedger();
    if (!ledger || ledger.length === 0) {
      return null;
    }
    return ledger[ledger.length - 1];
  }

  /**
   * Obter registo por ID da fatura
   */
  function getLedgerEntryByInvoiceId(invoiceId) {
    var ledger = readLedger();
    return ledger.find(function(entry) {
      return entry.invoiceId === invoiceId;
    });
  }

  /**
   * Criar novo registo no livro (NUNCA modifica registos existentes)
   * @param {Object} invoice - Dados da fatura
   * @param {string} hash - Hash calculado
   * @param {string} previousHash - Hash da fatura anterior
   * @param {string} eventType - Tipo de evento: 'create' | 'modify' | 'cancel'
   * @returns {Object} - Entrada do ledger criada
   */
  async function createLedgerEntry(invoice, hash, previousHash, eventType) {
    if (!invoice || !hash) {
      throw new Error('Invoice and hash are required');
    }

    eventType = eventType || 'create';
    
    var entry = {
      id: generateLedgerId(),
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      series: invoice.series || 'A',
      hash: hash,
      previousHash: previousHash || window.VeriFactuHash.getGenesisHash(),
      timestamp: new Date().toISOString(),
      eventType: eventType,
      createdAt: new Date().toISOString(),
      // Dados da fatura no momento do registo (para verificação futura)
      amount: invoice.amount,
      totalAmount: invoice.totalAmount,
      customerNif: invoice.customerNif || '',
      invoiceDate: invoice.invoiceDate
    };

    // Ler ledger atual
    var ledger = readLedger();
    
    // Adicionar novo registo (append-only - nunca modificar!)
    ledger.push(entry);
    
    // Salvar
    writeLedger(ledger);
    
    console.log('[VeriFactu Ledger] Nova entrada criada:', entry.id);
    
    return entry;
  }

  /**
   * Gerar ID único para entrada do ledger
   */
  function generateLedgerId() {
    return 'led-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
  }

  // ========== MAIN REGISTRATION FUNCTION ==========

  /**
   * Registar uma fatura no livro de registo Veri*Factu
   * Esta função é chamada quando uma fatura é criada/modificada
   * 
   * @param {Object} invoice - Dados da fatura
   * @param {string} eventType - Tipo de evento: 'create' | 'modify' | 'cancel'
   * @returns {Promise<Object>} - Resultado do registo
   */
  async function registerInvoiceInLedger(invoice, eventType) {
    console.log('[VeriFactu Ledger] A registar fatura:', invoice.invoiceNumber);
    
    // 1. Obter último hash registado
    var lastEntry = getLastLedgerEntry();
    var previousHash = lastEntry ? lastEntry.hash : window.VeriFactuHash.getGenesisHash();
    
    console.log('[VeriFactu Ledger] Hash anterior:', previousHash);
    
    // 2. Calcular hash atual da fatura
    var currentHash = await window.VeriFactuHash.calculateInvoiceHash(invoice, previousHash);
    
    console.log('[VeriFactu Ledger] Hash atual:', currentHash);
    
    // 3. Criar registo no ledger (append-only)
    var ledgerEntry = await createLedgerEntry(invoice, currentHash, previousHash, eventType);
    
    // 4. Retornar resultado
    return {
      success: true,
      ledgerEntry: ledgerEntry,
      hash: currentHash,
      previousHash: previousHash,
      registeredAt: ledgerEntry.timestamp
    };
  }

  /**
   * Verificar se uma fatura já está registada
   */
  function isInvoiceRegistered(invoiceId) {
    var entry = getLedgerEntryByInvoiceId(invoiceId);
    return entry !== null && entry !== undefined;
  }

  /**
   * Obter registo de uma fatura
   */
  function getInvoiceLedgerEntry(invoiceId) {
    return getLedgerEntryByInvoiceId(invoiceId);
  }

  /**
   * Verificar integridade de todas as faturas registadas
   * @returns {Promise<Array>} - Lista de problemas encontrados
   */
  async function verifyLedgerIntegrity() {
    var ledger = readLedger();
    var issues = [];
    
    for (var i = 0; i < ledger.length; i++) {
      var entry = ledger[i];
      var expectedPreviousHash = i === 0 
        ? window.VeriFactuHash.getGenesisHash() 
        : ledger[i - 1].hash;
      
      // Verificar encadeamento
      if (entry.previousHash !== expectedPreviousHash) {
        issues.push({
          type: 'chain_break',
          entryId: entry.id,
          invoiceNumber: entry.invoiceNumber,
          message: 'Quebra na cadeia de hash'
        });
      }
    }
    
    return issues;
  }

  /**
   * Obter estatísticas do ledger
   */
  function getLedgerStats() {
    var ledger = readLedger();
    var stats = {
      totalEntries: ledger.length,
      createCount: 0,
      modifyCount: 0,
      cancelCount: 0,
      firstEntry: null,
      lastEntry: null
    };
    
    ledger.forEach(function(entry) {
      if (entry.eventType === 'create') stats.createCount++;
      else if (entry.eventType === 'modify') stats.modifyCount++;
      else if (entry.eventType === 'cancel') stats.cancelCount++;
    });
    
    if (ledger.length > 0) {
      stats.firstEntry = ledger[0].timestamp;
      stats.lastEntry = ledger[ledger.length - 1].timestamp;
    }
    
    return stats;
  }

  /**
   * Exportar ledger para JSON
   */
  function exportLedger() {
    var ledger = readLedger();
    return JSON.stringify(ledger, null, 2);
  }

  /**
   * Importar ledger de JSON (apenas para recuperação)
   */
  function importLedger(jsonString) {
    try {
      var ledger = JSON.parse(jsonString);
      if (Array.isArray(ledger)) {
        writeLedger(ledger);
        console.log('[VeriFactu Ledger] Ledger importado com', ledger.length, 'entradas');
        return { success: true, count: ledger.length };
      }
    } catch (e) {
      console.error('[VeriFactu Ledger] Erro ao importar:', e);
    }
    return { success: false };
  }

  // ========== FIREBASE INTEGRATION (Optional) ==========
  
  /**
   * Sincronizar com Firebase (se disponível)
   */
  async function syncWithFirebase() {
    if (!window.FirebaseSync || !window.FirebaseSync.isFirebaseReady()) {
      console.log('[VeriFactu Ledger] Firebase não disponível, usando apenas localStorage');
      return null;
    }
    
    // Implementar sincronização se necessário
    console.log('[VeriFactu Ledger] Firebase disponível mas sincronização ainda não implementada');
    return null;
  }

  // ========== EXPORT TO WINDOW ==========
  window.VeriFactuLedger = {
    registerInvoice: registerInvoiceInLedger,
    isInvoiceRegistered: isInvoiceRegistered,
    getInvoiceEntry: getInvoiceLedgerEntry,
    verifyIntegrity: verifyLedgerIntegrity,
    getStats: getLedgerStats,
    exportLedger: exportLedger,
    importLedger: importLedger,
    getLastEntry: getLastLedgerEntry,
    syncWithFirebase: syncWithFirebase
  };

  console.log('✅ VeriFactu Ledger service loaded');

})();

