(function() {
  'use strict';

  function sanitizeName(value) {
    return (value || '')
      .replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-žА-Яа-яЁёЇїІіЄє\s'-]/g, '')
      .replace(/\s{2,}/g, ' ');
  }

  function sanitizePhone(value) {
    const input = (value || '').toString();
    const hasLeadingPlus = input.trim().startsWith('+');
    const digitsOnly = input.replace(/\D/g, '');
    return (hasLeadingPlus ? '+' : '') + digitsOnly;
  }

  function getCountryOptions() {
    return Array.from(document.querySelectorAll('[data-country-value]'));
  }

  function getAllowedCountries() {
    return getCountryOptions()
      .map((option) => option.getAttribute('data-country-value'))
      .filter((value) => value);
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

  window.CustomerPageUtils = {
    sanitizeName: sanitizeName,
    sanitizePhone: sanitizePhone,
    getCountryOptions: getCountryOptions,
    getAllowedCountries: getAllowedCountries,
    formatCreatedAt: formatCreatedAt,
    getCurrentUserId: getCurrentUserId
  };
})();