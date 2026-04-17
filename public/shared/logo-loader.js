// Logo Loader - Para usar en PDFs y obtener el logo guardado
(function() {
  'use strict';

  // Función para obtener el logo de la empresa desde localStorage
  function getCompanyLogo() {
    try {
      var session = localStorage.getItem('upsen_current_user');
      if (!session) return null;
      
      var data = JSON.parse(session);
      var logo = data && data.user && data.user.companyData && data.user.companyData.logo;
      
      return logo || null;
    } catch (e) {
      console.log('Error getting company logo:', e);
      return null;
    }
  }

  // Exportar función para uso en PDFs y otras páginas
  window.getCompanyLogo = getCompanyLogo;
})();
