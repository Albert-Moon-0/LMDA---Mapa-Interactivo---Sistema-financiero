/* =============================================
   SISTEMA FINANCIERO MEXICANO — SCRIPT.JS
   Cytoscape.js + Interactividad completa
   ============================================= */

// ─── Paleta de colores por nivel ───────────────
const LEVEL_COLORS = {
  autoridad:       { bg: '#e94560', border: '#ff6b84', glow: 'rgba(233,69,96,0.5)',   label: '🏛 Autoridades',       text: 'Autoridades' },
  banca_multiple:  { bg: '#4a90e2', border: '#74aff0', glow: 'rgba(74,144,226,0.5)',  label: '🏦 Banca Múltiple',    text: 'Banca Múltiple' },
  banca_desarrollo:{ bg: '#27ae60', border: '#52c97d', glow: 'rgba(39,174,96,0.5)',   label: '🏗 Banca de Desarrollo', text: 'Banca de Desarrollo' },
  sector_bursatil: { bg: '#f39c12', border: '#fcc043', glow: 'rgba(243,156,18,0.5)',  label: '📈 Sector Bursátil',   text: 'Sector Bursátil' },
  sector_no_bancario: { bg: '#8e44ad', border: '#b06ed6', glow: 'rgba(142,68,173,0.5)', label: '💳 Sector No Bancario', text: 'Sector No Bancario' },
};

const EDGE_COLORS = {
  regulacion:   '#e94560',
  supervision:  '#4a90e2',
  coordinacion: '#f39c12',
  operacion:    '#27ae60',
  proteccion:   '#8e44ad',
};

let cy;
let currentFilter = 'all';
let graphData;

// ─── Cargar datos y arrancar ───────────────────
async function init() {
  try {
    const res = await fetch('data.json');
    graphData = await res.json();
    buildGraph(graphData);
  } catch (err) {
    console.error('Error cargando data.json:', err);
    document.getElementById('loading').innerHTML =
      '<p style="color:#e94560">Error al cargar datos. Asegúrate de servir el proyecto con un servidor local.</p>';
  }
}

// ─── Construir el grafo ────────────────────────
function buildGraph(data) {
  // Calcular rango de tamaños para importancia
  const sizes = data.nodes.map(n => n.data.size);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  cy = cytoscape({
    container: document.getElementById('cy'),

    elements: {
      nodes: data.nodes,
      edges: data.edges,
    },

    style: [
      // ── Nodo base ──
      {
        selector: 'node',
        style: {
          'width': (ele) => mapSize(ele.data('size'), minSize, maxSize, 44, 90),
          'height': (ele) => mapSize(ele.data('size'), minSize, maxSize, 44, 90),
          'background-color': (ele) => getLevelColor(ele.data('level')).bg,
          'border-color': (ele) => getLevelColor(ele.data('level')).border,
          'border-width': 2,
          'label': 'data(label)',
          'color': '#f0f0f8',
          'font-family': 'Space Grotesk, sans-serif',
          'font-size': (ele) => mapSize(ele.data('size'), minSize, maxSize, 8, 11),
          'font-weight': 600,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': (ele) => mapSize(ele.data('size'), minSize, maxSize, 40, 80),
          'overlay-padding': 6,
          'transition-property': 'background-color, border-color, border-width, width, height',
          'transition-duration': '200ms',
          'transition-timing-function': 'ease',
          'z-index': 10,
        }
      },

      // ── Nodo hover ──
      {
        selector: 'node:active',
        style: {
          'overlay-color': 'white',
          'overlay-opacity': 0.1,
        }
      },

      // ── Nodo seleccionado ──
      {
        selector: 'node.selected',
        style: {
          'border-width': 3,
          'border-color': '#ffffff',
          'background-color': (ele) => getLevelColor(ele.data('level')).bg,
          'z-index': 99,
        }
      },

      // ── Nodo atenuado ──
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.2,
        }
      },

      // ── Nodo resaltado (vecino) ──
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 2.5,
          'border-color': '#ffffff',
          'opacity': 1,
        }
      },

      // ── Aristas base ──
      {
        selector: 'edge',
        style: {
          'width': 1.2,
          'line-color': (ele) => getEdgeColor(ele.data('tipo')),
          'target-arrow-color': (ele) => getEdgeColor(ele.data('tipo')),
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'opacity': 0.4,
          'arrow-scale': 0.7,
          'transition-property': 'opacity, width',
          'transition-duration': '200ms',
        }
      },

      // ── Arista hover/resaltada ──
      {
        selector: 'edge.highlighted',
        style: {
          'opacity': 0.9,
          'width': 2,
        }
      },

      // ── Arista atenuada ──
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.04,
        }
      },
    ],

    layout: {
      name: 'cose',
      idealEdgeLength: 120,
      nodeOverlap: 24,
      refresh: 20,
      fit: true,
      padding: 60,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 500000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 50,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },

    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autounselectify: true,
  });

  // ─── Evento: Click en nodo ─────────────────
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    showPanel(node);
    highlightNeighborhood(node);
  });

  // ─── Evento: Click en fondo ────────────────
  cy.on('tap', function(evt) {
    if (evt.target === cy) {
      closePanel();
      resetHighlight();
    }
  });

  // ─── Evento: Hover en nodo ────────────────
  cy.on('mouseover', 'node', function(evt) {
    const node = evt.target;
    const pos = evt.renderedPosition || node.renderedPosition();
    showTooltip(node, pos);
    document.body.style.cursor = 'pointer';
  });

  cy.on('mouseout', 'node', function() {
    hideTooltip();
    document.body.style.cursor = 'default';
  });

  // ─── Layout listo: ocultar loading ────────
  cy.on('layoutstop', function() {
    hideLoading();
  });

  // Fallback si layout ya terminó
  setTimeout(hideLoading, 3000);
}

// ─── Panel de información ──────────────────────
function showPanel(node) {
  const data = node.data();
  const panel = document.getElementById('info-panel');
  const colors = getLevelColor(data.level);

  // Badge nivel
  const badge = document.getElementById('panel-level-badge');
  badge.textContent = colors.text;
  badge.style.background = colors.glow;
  badge.style.color = colors.bg;
  badge.style.border = `1px solid ${colors.bg}`;

  document.getElementById('panel-name').textContent = data.label;
  document.getElementById('panel-fullname').textContent = data.fullName;
  document.getElementById('panel-role-text').textContent = data.role;
  document.getElementById('panel-funcion-text').textContent = data.funcion;
  document.getElementById('panel-dependencia-text').textContent = data.dependencia;
  document.getElementById('panel-activos-text').textContent = data.activos;

  // Barra de importancia
  const pct = Math.round(((data.size - 40) / (80 - 40)) * 100);
  const bar = document.getElementById('importance-bar');
  bar.style.width = Math.max(5, Math.min(100, pct)) + '%';
  bar.style.background = `linear-gradient(90deg, ${colors.bg}, ${colors.border})`;

  // Conexiones
  const connList = document.getElementById('connections-list');
  connList.innerHTML = '';
  const neighbors = node.neighborhood('node');
  if (neighbors.length > 0) {
    neighbors.forEach(nbr => {
      const item = document.createElement('div');
      item.className = 'connection-item';
      item.innerHTML = `
        <span class="connection-dot" style="background:${getLevelColor(nbr.data('level')).bg}"></span>
        <span>${nbr.data('label')}</span>
        <span class="connection-arrow">→</span>
      `;
      item.addEventListener('click', () => {
        cy.nodes().unselect();
        nbr.select();
        showPanel(nbr);
        highlightNeighborhood(nbr);
        cy.animate({ center: { eles: nbr }, zoom: 1.5 }, { duration: 400 });
      });
      connList.appendChild(item);
    });
  } else {
    connList.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Sin conexiones directas.</p>';
  }

  // Enlace externo
  const link = document.getElementById('panel-link');
  link.href = data.url || '#';

  // Abrir panel
  panel.classList.add('open');

  // Marcar nodo seleccionado
  cy.nodes().removeClass('selected');
  node.addClass('selected');
}

function closePanel() {
  document.getElementById('info-panel').classList.remove('open');
  cy.nodes().removeClass('selected');
}

// ─── Resaltar vecindad ─────────────────────────
function highlightNeighborhood(node) {
  cy.elements().removeClass('highlighted dimmed');
  const neighborhood = node.closedNeighborhood();
  cy.elements().not(neighborhood).addClass('dimmed');
  neighborhood.addClass('highlighted');
  neighborhood.nodes().removeClass('dimmed');
}

function resetHighlight() {
  cy.elements().removeClass('highlighted dimmed selected');
}

// ─── Tooltip ──────────────────────────────────
function showTooltip(node, pos) {
  const tooltip = document.getElementById('tooltip');
  tooltip.style.display = 'block';
  document.getElementById('tooltip-name').textContent = node.data('label');
  document.getElementById('tooltip-role').textContent = node.data('role');

  const cyContainer = document.getElementById('cy');
  const rect = cyContainer.getBoundingClientRect();
  const x = rect.left + pos.x + 16;
  const y = rect.top + pos.y - 10;
  tooltip.style.left = Math.min(x, window.innerWidth - 240) + 'px';
  tooltip.style.top = Math.max(8, y) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}

// ─── Filtros por nivel ─────────────────────────
function filterByLevel(level) {
  currentFilter = level;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-filter="${level}"]`).classList.add('active');

  if (level === 'all') {
    cy.elements().removeClass('dimmed').style('display', 'element');
  } else {
    cy.nodes().forEach(n => {
      if (n.data('level') === level) {
        n.style('display', 'element');
        n.removeClass('dimmed');
      } else {
        n.style('display', 'none');
      }
    });
    cy.edges().forEach(e => {
      const srcLevel = cy.getElementById(e.data('source')).data('level');
      const tgtLevel = cy.getElementById(e.data('target')).data('level');
      if (srcLevel === level || tgtLevel === level) {
        e.style('display', 'element');
      } else {
        e.style('display', 'none');
      }
    });
  }

  closePanel();
  resetHighlight();
}

// ─── Zoom ──────────────────────────────────────
function zoomIn() {
  cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width()/2, y: cy.height()/2 } });
}

function zoomOut() {
  cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width()/2, y: cy.height()/2 } });
}

function resetView() {
  cy.fit(cy.elements(), 60);
  cy.zoom(Math.min(cy.zoom(), 1.0));
}

// ─── Helpers ───────────────────────────────────
function getLevelColor(level) {
  return LEVEL_COLORS[level] || { bg: '#666', border: '#999', glow: 'rgba(102,102,102,0.3)', text: level };
}

function getEdgeColor(tipo) {
  return EDGE_COLORS[tipo] || '#555577';
}

function mapSize(val, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function hideLoading() {
  const el = document.getElementById('loading');
  if (el && !el.classList.contains('fade-out')) {
    el.classList.add('fade-out');
    setTimeout(() => { if (el) el.style.display = 'none'; }, 500);
  }
}

// ─── Construir leyenda y filtros dinámicamente ──
function buildLegendAndFilters() {
  const legend = document.getElementById('legend-items');
  const filters = document.getElementById('filter-items');

  Object.entries(LEVEL_COLORS).forEach(([key, val]) => {
    // Leyenda
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot" style="background:${val.bg}"></span>${val.label}`;
    li.addEventListener('click', () => filterByLevel(key));
    legend.appendChild(li);

    // Filtro botón
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = key;
    btn.innerHTML = `<span class="dot" style="background:${val.bg}"></span>${val.text}`;
    btn.addEventListener('click', () => filterByLevel(key));
    filters.appendChild(btn);
  });
}

// ─── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildLegendAndFilters();
  init();

  document.getElementById('panel-close').addEventListener('click', () => {
    closePanel();
    resetHighlight();
  });

  document.getElementById('zoom-in').addEventListener('click', zoomIn);
  document.getElementById('zoom-out').addEventListener('click', zoomOut);
  document.getElementById('zoom-fit').addEventListener('click', resetView);

  // Botón "Todos" en filtros
  document.querySelector('[data-filter="all"]').addEventListener('click', () => filterByLevel('all'));
});
