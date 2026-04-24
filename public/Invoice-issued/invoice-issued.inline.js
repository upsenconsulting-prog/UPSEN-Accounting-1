// Theme application (read-only, controlled from settings page)
        const THEME_STORAGE_KEY = 'factufacil-theme';

        function applySavedTheme() {
          const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme') || 'light';
          const isDark = savedTheme === 'dark';
          document.body.classList.toggle('dark', isDark);
          document.body.classList.toggle('theme-dark', isDark);
          return isDark;
        }

        function updateChartColors(isDark) {
          if (typeof Chart === 'undefined') return;
          const textColor = isDark ? '#F1F5F9' : '#1F2937';
          const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

          for (let id in Chart.instances) {
            try {
              let chart = Chart.instances[id];
              if (chart.options && chart.options.scales) {
                if (chart.options.scales.x) {
                  chart.options.scales.x.grid.color = gridColor;
                  chart.options.scales.x.ticks.color = textColor;
                }
                if (chart.options.scales.y) {
                  chart.options.scales.y.grid.color = gridColor;
                  chart.options.scales.y.ticks.color = textColor;
                }
              }
              chart.update();
            } catch (e) {}
          }
        }

        document.addEventListener('DOMContentLoaded', () => {
          const isDark = applySavedTheme();
          setTimeout(() => updateChartColors(isDark), 1000);
        });

        // Confirm logout
        window.confirmLogout = function() {
            if (confirm('¿Cerrar sesión?')) {
                localStorage.removeItem('upsen_current_user');
                window.location.href = '../login.html';
            }
        };

        // Clear filters
        function clearFilters() {
            document.getElementById('paymentFilter').value = 'todas';
            document.getElementById('dateFilter').value = 'todos';
            document.getElementById('searchInput').value = '';
            if (typeof renderInvoices === 'function') renderInvoices();
        }

        // Modal instances
        var viewInvoiceModal = null;
        var modalExport = null;
        var modalImport = null;

        document.addEventListener('DOMContentLoaded', function() {
          var viewModalEl = document.getElementById('viewInvoiceModal');
          if (viewModalEl) {
            viewInvoiceModal = new bootstrap.Modal(viewModalEl);
            window.viewInvoiceModal = viewInvoiceModal;
          }

          var exportModalEl = document.getElementById('modalExport');
          if (exportModalEl) {
            modalExport = new bootstrap.Modal(exportModalEl);
          }

          var importModalEl = document.getElementById('modalImport');
          if (importModalEl) {
            modalImport = new bootstrap.Modal(importModalEl);
          }

          // New Invoice Button: populate inline form and scroll to it (no modal)
          var newBtn = document.getElementById('newInvoiceBtn');
          if (newBtn) {
            newBtn.addEventListener('click', function() {
              var date = new Date();
              var num = 'INV-' + date.getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
              var numberInput = document.querySelector('#formNewInvoiceIssued input[name="invoiceNumber"]');
              if (numberInput) numberInput.value = num;

              var invoiceDate = document.querySelector('#formNewInvoiceIssued input[name="invoiceDate"]');
              var dueDate = document.querySelector('#formNewInvoiceIssued input[name="dueDate"]');
              if (invoiceDate) invoiceDate.value = new Date().toISOString().split('T')[0];
              if (dueDate) {
                var due = new Date();
                due.setDate(due.getDate() + 30);
                dueDate.value = due.toISOString().split('T')[0];
              }

              var inlineCard = document.getElementById('inlineNewInvoiceCard');
              if (inlineCard) {
                inlineCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // focus first input
                setTimeout(function() {
                  if (numberInput) numberInput.focus();
                }, 200);
              }
            });
          }

            // Export Button
            document.getElementById('btnExport').addEventListener('click', function() {
                if (modalExport) {
                    modalExport.show();
                }
            });

            // Import Button
            document.getElementById('btnImport').addEventListener('click', function() {
                if (modalImport) {
                    modalImport.show();
                }
            });

            // Confirm Import Button
            document.getElementById('confirmImportBtn').addEventListener('click', function() {
                var fileInput = document.getElementById('importFileInputIssued');
                if (fileInput && fileInput.files.length > 0) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var content = e.target.result;
                        var count = 0;
                        if (typeof importInvoicesFromCSV === 'function') {
                            count = importInvoicesFromCSV(content);
                        }

                        if (count > 0) {
                            alert(count + ' facturas importadas con éxito!');
                            if (typeof renderInvoices === 'function') renderInvoices();
                            if (typeof renderChart === 'function') renderChart();
                            if (typeof renderSummaryCards === 'function') renderSummaryCards();
                            if (modalImport) modalImport.hide();
                        } else {
                            alert('Ninguna factura importada. Verifica el formato del CSV.');
                        }

                        fileInput.value = '';
                    };
                    reader.readAsText(fileInput.files[0]);
                } else {
                    alert('Por favor, selecciona un archivo CSV.');
                }
            });

            // Confirm Export Button
            document.getElementById('confirmExportBtn').addEventListener('click', function() {
                var format = document.getElementById('exportFormat')?.value || 'pdf';
                var period = document.getElementById('exportPeriod')?.value || 'all';

                if (typeof exportInvoices === 'function') {
                    exportInvoices(format, period);
                }

                if (modalExport) {
                    modalExport.hide();
                }
            });

            // Sidebar link handling
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

/**
 * Iframe ????????
 * ?????????????????? iframe ????
 *
 * ????:
 * 1. ???????????? HTML ?
 * 2. ??????????????????
 */

(function () {
  "use strict";

  // ????? iframe ?
  if (window.self === window.top) {
    return; // ?? iframe ?,???
  }

  // ??????????
  if (window.__iframeHighlightInitialized) {
    return;
  }
  window.__iframeHighlightInitialized = true;
  console.log("Iframe ???????");

  // ???????
  var overlay = document.createElement("div");
  overlay.id = "iframe-highlight-overlay";
  overlay.style.cssText = "\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100vw;\n    height: 100vh;\n    pointer-events: none;\n    z-index: 999999;\n    overflow: hidden;\n  ";

  // ???????(????)
  var highlightBox = document.createElement("div");
  highlightBox.id = "iframe-highlight-box";
  highlightBox.style.cssText = "\n    position: absolute;\n    border: 2px dashed #007AFF;\n    background: rgba(0, 122, 255, 0.08);\n    pointer-events: none;\n    display: none;\n    transition: all 0.1s ease;\n    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);\n    border-radius: 2px;\n  ";

  // ????????????(????)
  var selectedBox = document.createElement("div");
  selectedBox.id = "iframe-selected-box";
  selectedBox.style.cssText = "\n    position: absolute;\n    border: 2px solid #007AFF;\n    pointer-events: none;\n    display: none;\n    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 8px rgba(255, 107, 53, 0.4);\n    border-radius: 2px;\n    z-index: 1000000;\n  ";

  // ????????
  var tagLabel = document.createElement("div");
  tagLabel.id = "iframe-tag-label";
  tagLabel.style.cssText = "\n    position: absolute;\n    background: #007AFF;\n    color: white;\n    padding: 2px 6px;\n    font-size: 11px;\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n    border-radius: 2px;\n    pointer-events: none;\n    display: none;\n    white-space: nowrap;\n    z-index: 1000001;\n    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);\n    font-weight: 500;\n  ";

  // ????????
  var selectedLabel = document.createElement("div");
  selectedLabel.id = "iframe-selected-label";
  selectedLabel.style.cssText = "\n    position: absolute;\n    background: #007AFF;\n    color: white;\n    padding: 3px 8px;\n    font-size: 11px;\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n    border-radius: 3px;\n    pointer-events: none;\n    display: none;\n    white-space: nowrap;\n    z-index: 1000002;\n    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);\n    font-weight: 600;\n  ";
  overlay.appendChild(highlightBox);
  overlay.appendChild(selectedBox);
  overlay.appendChild(tagLabel);
  overlay.appendChild(selectedLabel);
  document.body.appendChild(overlay);

  // ?????????
  var selectedElement = null;
  var highlightEnabled = false;

  // ???????????
  function updateSelectedHighlight(element) {
    console.log("updateSelectedHighlight called with:", element);
    if (!element) {
      selectedBox.style.display = "none";
      selectedLabel.style.display = "none";
      selectedElement = null;
      console.log("Cleared selected highlight");
      return;
    }
    selectedElement = element;
    var rect = element.getBoundingClientRect();
    console.log("Selected element rect:", rect);

    // ?????????
    selectedBox.style.display = "block";
    selectedBox.style.left = "".concat(rect.left - 2, "px");
    selectedBox.style.top = "".concat(rect.top - 2, "px");
    selectedBox.style.width = "".concat(rect.width + 4, "px");
    selectedBox.style.height = "".concat(rect.height + 4, "px");

    // ???????????
    selectedLabel.style.display = "block";
    selectedLabel.textContent = "\u2713 <".concat(element.tagName.toLowerCase(), ">");

    // ??????,???????
    var labelTop = rect.top - 28;
    var labelLeft = rect.left;

    // ?????????,???????
    if (labelTop < 5) {
      labelTop = rect.bottom + 5;
    }

    // ?????????,????
    var labelWidth = selectedLabel.offsetWidth || 100; // ????
    if (labelLeft + labelWidth > window.innerWidth - 10) {
      labelLeft = window.innerWidth - labelWidth - 10;
    }
    selectedLabel.style.left = "".concat(Math.max(5, labelLeft), "px");
    selectedLabel.style.top = "".concat(labelTop, "px");
    console.log("Selected highlight positioned at:", {
      left: selectedBox.style.left,
      top: selectedBox.style.top,
      width: selectedBox.style.width,
      height: selectedBox.style.height
    });
  }
  function getElementSelector(element) {
    if (!(element instanceof Element)) throw new Error('Argument must be a DOM element');
    var segments = [];
    var current = element;
    while (current !== document.documentElement) {
      var selector = '';
      // ??????ID
      if (current.id && document.querySelectorAll("#".concat(current.id)).length === 1) {
        segments.unshift("#".concat(current.id));
        break; // ID??,??????
      }

      // ???????(????????)
      var classes = Array.from(current.classList).filter(function (c) {
        return !c.startsWith('js-');
      });
      var className = classes.length > 0 ? ".".concat(classes[0]) : '';

      // ??????(nth-child)
      var tag = current.tagName.toLowerCase();
      if (!className) {
        var siblings = Array.from(current.parentNode.children);
        var index = siblings.findIndex(function (el) {
          return el === current;
        }) + 1;
        selector = "".concat(tag, ":nth-child(").concat(index, ")");
      } else {
        selector = className;
      }
      segments.unshift(selector);
      current = current.parentElement;
    }

    // ?????
    if (current === document.documentElement) {
      segments.unshift('html');
    }
    return segments.join(' > ');
  }

  // ????????
  function getElementText(element) {
    var _element$textContent;
    if (element.tagName === "INPUT") {
      return element.value || element.placeholder || "";
    }
    if (element.tagName === "TEXTAREA") {
      return element.value || element.placeholder || "";
    }
    var text = ((_element$textContent = element.textContent) === null || _element$textContent === void 0 ? void 0 : _element$textContent.trim()) || "";
    return text.length > 50 ? text.substring(0, 50) + "..." : text;
  }

  // ????????
  function getElementAttributes(element) {
    var attrs = {};
    for (var i = 0; i < element.attributes.length; i++) {
      var attr = element.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  // ????????
  function handleMouseOver(e) {
    if (!highlightEnabled) return;
    var target = e.target;
    if (!target || target === overlay || target === highlightBox || target === tagLabel || target === selectedBox || target === selectedLabel) {
      return;
    }

    // ???? html ? body ??
    if (target === document.documentElement || target === document.body) {
      return;
    }

    // ?????????,???????
    if (target === selectedElement) {
      highlightBox.style.display = "none";
      tagLabel.style.display = "none";
      return;
    }
    var rect = target.getBoundingClientRect();
    var selector = getElementSelector(target);
    var text = getElementText(target);
    var attributes = getElementAttributes(target);

    // ?????????
    highlightBox.style.display = "block";
    highlightBox.style.left = "".concat(rect.left - 2, "px");
    highlightBox.style.top = "".concat(rect.top - 2, "px");
    highlightBox.style.width = "".concat(rect.width + 4, "px");
    highlightBox.style.height = "".concat(rect.height + 4, "px");

    // ?????????
    tagLabel.style.display = "block";
    tagLabel.textContent = "<".concat(target.tagName.toLowerCase(), ">");

    // ??????,???????
    var labelTop = rect.top - 22;
    var labelLeft = rect.left;

    // ?????????,???????
    if (labelTop < 0) {
      labelTop = rect.bottom + 5;
    }

    // ?????????,????
    if (labelLeft + tagLabel.offsetWidth > window.innerWidth) {
      labelLeft = window.innerWidth - tagLabel.offsetWidth - 5;
    }
    tagLabel.style.left = "".concat(Math.max(0, labelLeft), "px");
    tagLabel.style.top = "".concat(labelTop, "px");

    // ????????
    var elementInfo = {
      tagName: target.tagName.toLowerCase(),
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      },
      selector: selector,
      text: text,
      attributes: attributes,
      url: window.location.href,
      path: window.location.pathname,
      timestamp: Date.now()
    };
    try {
      window.parent.postMessage({
        type: "iframe-element-hover",
        data: elementInfo,
        source: "iframe-highlight-injector"
      }, "*");
    } catch (error) {
      console.warn("??????????:", error);
    }
  }

  // ????????
  function handleMouseOut(e) {
    if (!highlightEnabled) return;
    var relatedTarget = e.relatedTarget;

    // ??????????????,?????
    if (relatedTarget && (relatedTarget === highlightBox || relatedTarget === tagLabel || relatedTarget === overlay || relatedTarget === selectedBox || relatedTarget === selectedLabel)) {
      return;
    }
    highlightBox.style.display = "none";
    tagLabel.style.display = "none";
    try {
      window.parent.postMessage({
        type: "iframe-element-hover",
        data: null,
        source: "iframe-highlight-injector"
      }, "*");
    } catch (error) {
      console.warn("??????????:", error);
    }
  }

  // ??????
  function handleClick(e) {
    var target = e.target;
    if (!target || target === overlay || target === highlightBox || target === tagLabel || target === selectedBox || target === selectedLabel) {
      return;
    }

    // ???? html ? body ??
    if (target === document.documentElement || target === document.body) {
      return;
    }

    // ?????????,????????????
    var isInteractiveElement = ['input', 'textarea', 'select', 'button', 'a'].includes(target.tagName.toLowerCase());

    // ????????,??????????????????
    if (highlightEnabled) {
      e.preventDefault();
      e.stopPropagation();
    }
    var rect = target.getBoundingClientRect();
    var selector = getElementSelector(target);
    var text = getElementText(target);
    var attributes = getElementAttributes(target);
    console.log("Element clicked:", {
      tagName: target.tagName,
      selector: selector,
      rect: rect
    });

    // ????????
    updateSelectedHighlight(target);

    // ??????,?????????
    highlightBox.style.display = "none";
    tagLabel.style.display = "none";
    var elementInfo = {
      tagName: target.tagName.toLowerCase(),
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      },
      selector: selector,
      text: text,
      attributes: attributes,
      url: window.location.href,
      path: window.location.pathname,
      timestamp: Date.now()
    };
    try {
      window.parent.postMessage({
        type: "iframe-element-click",
        data: elementInfo,
        source: "iframe-highlight-injector"
      }, "*");
    } catch (error) {
      console.warn("??????????:", error);
    }
  }

  // ??????????
  function handleParentMessage(event) {
    console.log("Received message from parent:", event.data);
    if (event.data.type === "iframe-highlight-toggle") {
      var enabled = event.data.enabled;
      console.log("Highlight toggle:", enabled);
      if (enabled) {
        enableHighlight();
      } else {
        disableHighlight();
      }
    } else if (event.data.type === "enable-iframe-highlight") {
      console.log("Enable iframe highlight");
      enableHighlight();
    } else if (event.data.type === "disable-iframe-highlight") {
      console.log("Disable iframe highlight");
      disableHighlight();
    } else if (event.data.type === "toggle-iframe-highlight") {
      var _enabled = event.data.enabled !== undefined ? event.data.enabled : !highlightEnabled;
      console.log("Toggle iframe highlight to:", _enabled);
      if (_enabled) {
        enableHighlight();
      } else {
        disableHighlight();
      }
    } else if (event.data.type === "update-selected-element") {
      var selector = event.data.selector;
      console.log("Update selected element with selector:", selector);
      if (selector) {
        try {
          var element = document.querySelector(selector);
          console.log("Found element by selector:", element);
          updateSelectedHighlight(element);
        } catch (error) {
          console.warn("Failed to select element:", error);
          updateSelectedHighlight(null);
        }
      } else {
        updateSelectedHighlight(null);
      }
    } else if (event.data.type === "clear-selected-element") {
      console.log("Clear selected element");
      updateSelectedHighlight(null);
    }
  }

  // ??????
  function enableHighlight() {
    console.log("Enabling highlight");
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleClick, true);
    highlightEnabled = true;
    overlay.style.display = "block";
  }

  // ??????
  function disableHighlight() {
    console.log("Disabling highlight");
    highlightEnabled = false;
    // ???????,??? highlightEnabled ??????
    // ?????????????
    highlightBox.style.display = "none";
    tagLabel.style.display = "none";
    // ??? selectedBox ? selectedLabel,??????
  }

  // ????????(???????)
  function fullyDisableHighlight() {
    console.log("Fully disabling highlight");
    highlightEnabled = false;
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleClick, true);
    overlay.style.display = "none";
    highlightBox.style.display = "none";
    tagLabel.style.display = "none";
    selectedBox.style.display = "none";
    selectedLabel.style.display = "none";
  }

  // ??????
  enableHighlight();
  window.addEventListener("message", handleParentMessage);

  // ???????????
  window.__iframeHighlightControl = {
    enable: enableHighlight,
    disable: disableHighlight,
    fullyDisable: fullyDisableHighlight,
    isEnabled: function isEnabled() {
      return highlightEnabled;
    },
    getSelectedElement: function getSelectedElement() {
      return selectedElement;
    },
    updateSelected: updateSelectedHighlight,
    // ??????????
    sendToggleMessage: function sendToggleMessage(enabled) {
      window.parent.postMessage({
        type: 'iframe-highlight-status',
        enabled: enabled || highlightEnabled,
        source: 'iframe-highlight-injector'
      }, '*');
    }
  };

  // ??????????
  try {
    window.parent.postMessage({
      type: "iframe-highlight-ready",
      data: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      source: "iframe-highlight-injector"
    }, "*");
  } catch (error) {
    console.warn("????????????:", error);
  }

  // ????
  window.__iframeHighlightCleanup = function () {
    fullyDisableHighlight();
    window.removeEventListener("message", handleParentMessage);
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
    delete window.__iframeHighlightInitialized;
    delete window.__iframeHighlightCleanup;
  };
})();

// Initialize floating ball functionality
function initFloatingBall() {
  const ball = document.getElementById('minimax-floating-ball');
  if (!ball) return;

  // Initial animation
  ball.style.opacity = '0';
  ball.style.transform = 'translateY(20px)';

  setTimeout(() => {
    ball.style.opacity = '1';
    ball.style.transform = 'translateY(0)';
  }, 500);

  // Handle logo click
  const ballContent = ball.querySelector('.minimax-ball-content');
  ballContent.addEventListener('click', function (e) {
    e.stopPropagation();
    window.open('https://agent.minimax.io/', '_blank');
    ball.style.transform = 'scale(0.95)';
    setTimeout(() => {
      ball.style.transform = 'scale(1)';
    }, 100);
  });

  // Handle close button click
  const closeIcon = ball.querySelector('.minimax-close-icon');
  closeIcon.addEventListener('click', function (e) {
    e.stopPropagation();
    ball.style.opacity = '0';
    ball.style.transform = 'translateY(20px)';

    setTimeout(() => {
      ball.style.display = 'none';
    }, 300);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initFloatingBall);

