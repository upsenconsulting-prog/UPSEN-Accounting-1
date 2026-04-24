// Mantemos apenas a lógica de UI básica no HTML
        const THEME_STORAGE_KEY = 'factufacil-theme';

        function applySavedTheme() {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme') || 'light';
            const isDark = savedTheme === 'dark';
            document.body.classList.toggle('dark', isDark);
            document.body.classList.toggle('theme-dark', isDark);
        }

        document.addEventListener('DOMContentLoaded', function() {
            applySavedTheme();

            // Import Button
            document.getElementById('btnImport').addEventListener('click', function() {
                if (modalImport) {
                    modalImport.show();
                }
            });

            // Confirm Import Button
            document.getElementById('confirmImportBtn').addEventListener('click', function() {
                var fileInput = document.getElementById('importExpensesFile');
                if (fileInput && fileInput.files.length > 0) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var content = e.target.result;
                        var count = 0;
                        if (typeof importExpensesFromCSV === 'function') {
                            count = importExpensesFromCSV(content);
                        }
                        if (count > 0) {
                            alert(count + ' gastos importados con éxito');
                            if (typeof renderExpenses === 'function') renderExpenses();
                            if (typeof renderChart === 'function') renderChart();
                            if (typeof renderSummaryCards === 'function') renderSummaryCards();
                            if (modalImport) modalImport.hide();
                        } else {
                            alert('No se importaron gastos. Verifique el formato del CSV.');
                        }
                        fileInput.value = '';
                    };
                    reader.readAsText(fileInput.files[0]);
                } else {
                    alert('Por favor, seleccione un archivo CSV.');
                }
            });

            // Export Button
            document.getElementById('btnExport').addEventListener('click', function() {
                if (modalExport) {
                    modalExport.show();
                }
            });

            // Confirm Export Button
            document.getElementById('confirmExportBtn').addEventListener('click', function() {
                var format = document.getElementById('exportFormat').value || 'pdf';
                if (typeof exportExpenses === 'function') {
                    exportExpenses(format);
                } else if (typeof exportExpensesFallback === 'function') {
                    exportExpensesFallback(format);
                }
                if (modalExport) {
                    modalExport.hide();
                }
            });

            // Refresh Button
            document.getElementById('refreshBtn').addEventListener('click', function() {
                location.reload();
            });

            // Sidebar links
            document.querySelectorAll('.sidebar-link').forEach(function(link) {
                link.addEventListener('click', function(e) {
                    var href = this.getAttribute('href');
                    if (href.startsWith('#') || href.startsWith('javascript')) {
                        return;
                    }
                    e.preventDefault();
                    window.location.href = href;
                });
            });
        });

