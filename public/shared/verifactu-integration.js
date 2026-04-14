/**
 * verifactu-integration.js
 * Integração Veri*Factu - Liga o hash, ledger e store
 * Cria faturas automaticamente com registo Veri*Factu
 */

(function() {
  'use strict';

  // ========== HELPER FUNCTIONS ==========
  
  function getUserId() {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      return window.firebaseAuth.currentUser.uid;
    }
    try {
      var auth = window.AuthService || window.Auth;
      if (auth && auth.getCurrentUser) {
        var user = auth.getCurrentUser();
        if (user) return user.uid || user.id;
      }
    } catch (e) {}
    try {
      var session = localStorage.getItem('upsen_current_user');
      if (session) {
        var data = JSON.parse(session);
        if (data && data.user) return data.user.uid || data.user.id || 'unknown';
      }
    } catch (e) {}
    return 'unknown';
  }

  // ========== CRIAR FACTURA EMITIDA COM VERI*FACTU ==========
  
  /**
   * Criar fatura emitida com registo Veri*Factu
   * @param {Object} invoiceData - Dados da fatura
   * @returns {Promise<Object>} - Resultado do registo
   */
  async function createInvoiceIssued(invoiceData) {
    console.log('[VeriFactu Integration] A criar fatura emitida:', invoiceData.invoiceNumber);
    
    // Verificar se os serviços estão disponíveis
    if (!window.VeriFactuHash) {
      console.warn('[VeriFactu Integration] VeriFactuHash não disponível');
      return { success: false, error: 'VeriFactuHash not loaded' };
    }
    
    if (!window.VeriFactuLedger) {
      console.warn('[VeriFactu Integration] VeriFactuLedger não disponível');
      return { success: false, error: 'VeriFactuLedger not loaded' };
    }
    
    try {
      // 1. Preparar dados da fatura para hash
      var invoiceForHash = {
        invoiceNumber: invoiceData.invoiceNumber,
        series: invoiceData.series || 'A',
        invoiceDate: invoiceData.invoiceDate,
        customerNif: invoiceData.customerNif || '',
        amount: Number(invoiceData.amount || 0),
        ivaAmount: Number(invoiceData.ivaAmount || 0),
        totalAmount: Number(invoiceData.totalAmount || invoiceData.amount || 0)
      };
      
      // 2. Obter último hash do ledger
      var lastEntry = window.VeriFactuLedger.getLastEntry();
      var previousHash = lastEntry ? lastEntry.hash : window.VeriFactuHash.getGenesisHash();
      
      console.log('[VeriFactu Integration] Hash anterior:', previousHash);
      
      // 3. Calcular hash da fatura
      var currentHash = await window.VeriFactuHash.calculateInvoiceHash(invoiceForHash, previousHash);
      
      console.log('[VeriFactu Integration] Hash calculado:', currentHash);
      
      // 4. Registar no ledger (cadeia WORM)
      var ledgerResult = await window.VeriFactuLedger.registerInvoice(invoiceForHash, 'create');
      
      console.log('[VeriFactu Integration] Registado no ledger:', ledgerResult);
      
      // 5. Adicionar campos Veri*Factu aos dados da fatura
      var invoiceWithVeriFactu = Object.assign({}, invoiceData, {
        series: invoiceData.series || 'A',
        verifactuHash: currentHash,
        previousHash: previousHash,
        verifactuTimestamp: ledgerResult.registeredAt,
        verifactuRegistered: true,
        verifactuStatus: 'registered'
      });
      
      // 6. Salvar fatura no store (localStorage + Firebase)
      if (window.addInvoiceIssued) {
        window.addInvoiceIssued(invoiceWithVeriFactu);
      }
      
      // 7. Retornar resultado
      return {
        success: true,
        hash: currentHash,
        previousHash: previousHash,
        registeredAt: ledgerResult.registeredAt,
        ledgerEntry: ledgerResult.ledgerEntry
      };
      
    } catch (err) {
      console.error('[VeriFactu Integration] Erro ao criar fatura:', err);
      
      // Se falhar, ainda criar a fatura sem Veri*Factu
      if (window.addInvoiceIssued) {
        var invoiceWithoutVeriFactu = Object.assign({}, invoiceData, {
          series: invoiceData.series || 'A',
          verifactuHash: '',
          previousHash: '',
          verifactuTimestamp: '',
          verifactuRegistered: false,
          verifactuStatus: 'error'
        });
        window.addInvoiceIssued(invoiceWithoutVeriFactu);
      }
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  // ========== CRIAR FACTURA RECEBIDA COM VERI*FACTU ==========
  
  /**
   * Criar fatura recebida com registo Veri*Factu
   * @param {Object} invoiceData - Dados da fatura
   * @returns {Promise<Object>} - Resultado do registo
   */
  async function createInvoiceReceived(invoiceData) {
    console.log('[VeriFactu Integration] A criar fatura recebida:', invoiceData.invoiceNumber);
    
    // Verificar se os serviços estão disponíveis
    if (!window.VeriFactuHash) {
      console.warn('[VeriFactu Integration] VeriFactuHash não disponível');
      return { success: false, error: 'VeriFactuHash not loaded' };
    }
    
    if (!window.VeriFactuLedger) {
      console.warn('[VeriFactu Integration] VeriFactuLedger não disponível');
      return { success: false, error: 'VeriFactuLedger not loaded' };
    }
    
    try {
      // 1. Preparar dados da fatura para hash (recebida usa supplierNif)
      var invoiceForHash = {
        invoiceNumber: invoiceData.invoiceNumber,
        series: invoiceData.series || 'R',
        invoiceDate: invoiceData.invoiceDate,
        customerNif: invoiceData.supplierNif || '', // Para recebidas, o NIF é do fornecedor
        amount: Number(invoiceData.amount || 0),
        ivaAmount: Number(invoiceData.ivaAmount || 0),
        totalAmount: Number(invoiceData.totalAmount || invoiceData.amount || 0)
      };
      
      // 2. Obter último hash do ledger
      var lastEntry = window.VeriFactuLedger.getLastEntry();
      var previousHash = lastEntry ? lastEntry.hash : window.VeriFactuHash.getGenesisHash();
      
      // 3. Calcular hash da fatura
      var currentHash = await window.VeriFactuHash.calculateInvoiceHash(invoiceForHash, previousHash);
      
      // 4. Registar no ledger
      var ledgerResult = await window.VeriFactuLedger.registerInvoice(invoiceForHash, 'create');
      
      // 5. Adicionar campos Veri*Factu
      var invoiceWithVeriFactu = Object.assign({}, invoiceData, {
        series: invoiceData.series || 'R',
        supplierNif: invoiceData.supplierNif || '',
        verifactuHash: currentHash,
        previousHash: previousHash,
        verifactuTimestamp: ledgerResult.registeredAt,
        verifactuRegistered: true,
        verifactuStatus: 'registered'
      });
      
      // 6. Salvar no store
      if (window.addInvoiceReceived) {
        window.addInvoiceReceived(invoiceWithVeriFactu);
      }
      
      return {
        success: true,
        hash: currentHash,
        previousHash: previousHash,
        registeredAt: ledgerResult.registeredAt,
        ledgerEntry: ledgerResult.ledgerEntry
      };
      
    } catch (err) {
      console.error('[VeriFactu Integration] Erro ao criar fatura recebida:', err);
      
      // Se falhar, ainda criar sem Veri*Factu
      if (window.addInvoiceReceived) {
        var invoiceWithoutVeriFactu = Object.assign({}, invoiceData, {
          series: invoiceData.series || 'R',
          supplierNif: invoiceData.supplierNif || '',
          verifactuHash: '',
          previousHash: '',
          verifactuTimestamp: '',
          verifactuRegistered: false,
          verifactuStatus: 'error'
        });
        window.addInvoiceReceived(invoiceWithoutVeriFactu);
      }
      
      return {
        success: false,
        error: err.message
      };
    }
  }

  // ========== VERIFICAR ESTADO VERI*FACTU ==========
  
  /**
   * Obter estado Veri*Factu de uma fatura
   * @param {Object} invoice - Fatura a verificar
   * @returns {Object} - Estado e informações
   */
  function getInvoiceVeriFactuStatus(invoice) {
    if (!invoice) {
      return {
        registered: false,
        status: 'no_data',
        hashPreview: '---------',
        icon: 'fa-minus',
        iconClass: 'text-muted'
      };
    }
    
    var registered = invoice.verifactuRegistered === true || invoice.verifactuRegistered === 'true';
    var status = invoice.verifactuStatus || 'draft';
    
    if (registered && status === 'registered') {
      return {
        registered: true,
        status: 'registered',
        hashPreview: window.VeriFactuHash ? window.VeriFactuHash.getHashPreview(invoice.verifactuHash) : invoice.verifactuHash.substring(0, 8) + '...',
        fullHash: invoice.verifactuHash,
        timestamp: invoice.verifactuTimestamp,
        icon: 'fa-check-circle',
        iconClass: 'text-success'
      };
    } else if (status === 'error') {
      return {
        registered: false,
        status: 'error',
        hashPreview: '---------',
        icon: 'fa-exclamation-triangle',
        iconClass: 'text-danger'
      };
    } else {
      return {
        registered: false,
        status: 'draft',
        hashPreview: '---------',
        icon: 'fa-edit',
        iconClass: 'text-muted'
      };
    }
  }

  // ========== VERIFICAR INTEGRIDADE DA CADEIA ==========
  
  /**
   * Verificar integridade de todas as faturas registadas
   * @returns {Promise<Array>} - Lista de problemas encontrados
   */
  async function verifyChainIntegrity() {
    if (!window.VeriFactuLedger) {
      console.warn('[VeriFactu Integration] VeriFactuLedger não disponível');
      return [{ type: 'error', message: 'VeriFactuLedger not loaded' }];
    }
    
    return await window.VeriFactuLedger.verifyIntegrity();
  }

  // ========== EXPORT TO WINDOW ==========
  window.VeriFactuIntegration = {
    createInvoiceIssued: createInvoiceIssued,
    createInvoiceReceived: createInvoiceReceived,
    getInvoiceStatus: getInvoiceVeriFactuStatus,
    verifyIntegrity: verifyChainIntegrity
  };

  console.log('✅ VeriFactu Integration service loaded');

})();

