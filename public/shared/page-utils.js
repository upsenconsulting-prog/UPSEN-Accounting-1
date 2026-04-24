(function() {
  'use strict';

  function getCurrentUserId() {
    let user = null;

    if (window.AuthService && typeof window.AuthService.getCurrentUser === 'function') {
      user = window.AuthService.getCurrentUser();
    } else if (window.AuthSystem && typeof window.AuthSystem.getCurrentUser === 'function') {
      user = window.AuthSystem.getCurrentUser();
    }

    if (!user) {
      try {
        const session = localStorage.getItem('upsen_current_user');
        if (session) {
          const data = JSON.parse(session);
          user = data && data.user ? data.user : null;
        }
      } catch (error) {}
    }

    if (!user) return null;
    return user.uid || user.id || user.userId || null;
  }

  function createStatusMessenger(element) {
    return function(text, type) {
      if (!element) return;
      element.textContent = text;
      element.classList.remove('d-none', 'alert-info', 'alert-success', 'alert-danger', 'alert-warning');
      element.classList.add('alert-' + (type || 'info'));
    };
  }

  function formatCreatedAt(value) {
    if (!value) return '-';
    try {
      const date = value.toDate ? value.toDate() : new Date(value);
      return new Date(date).toLocaleString();
    } catch (error) {
      return '-';
    }
  }

  function moneyEUR(value) {
    return 'EUR ' + Number(value || 0).toFixed(2);
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  window.PageUtils = {
    getCurrentUserId: getCurrentUserId,
    createStatusMessenger: createStatusMessenger,
    formatCreatedAt: formatCreatedAt,
    moneyEUR: moneyEUR,
    normalizeText: normalizeText
  };
})();