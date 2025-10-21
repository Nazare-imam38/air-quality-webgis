// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1IjoibmF6YXJpbWFtNCIsImEiOiJjbWdzY3A2dmUwcDE1MmtzMXB3dngyYjdtIn0.Vql7DCpJ_h79oFyW8U1QTw';

// Initialize Map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [0, 20],
  zoom: 2
});

// Add error handling for map initialization
map.on('error', (e) => {
  console.error('Map error:', e);
  updateStatus('Map initialization failed. Please check your internet connection.', 'error');
});

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const tileStatus = document.getElementById('tile-status');
const tileStatusText = document.getElementById('tile-status-text');
const aqiTypeSelect = document.getElementById('aqi-type');
const aqiTokenInput = document.getElementById('aqi-token');
const lastUpdated = document.getElementById('last-updated');

// UI Elements
const panelToggle = document.getElementById('panel-toggle');
const panelContent = document.getElementById('panel-content');
const legendToggle = document.getElementById('legend-toggle');
const legendContent = document.getElementById('legend-content');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const modalClose = document.getElementById('modal-close');
const refreshBtn = document.getElementById('refresh-data');
const resetViewBtn = document.getElementById('reset-view');
const tokenHelpBtn = document.getElementById('token-help');

// Search Elements
const locationSearch = document.getElementById('location-search');
const searchBtn = document.getElementById('search-btn');
const searchSuggestions = document.getElementById('search-suggestions');

// Current Layer State
let currentAqiLayer = null;
let isPanelCollapsed = false;
let isLegendCollapsed = false;

// Test Tile Loading
function testTileLoading(layerType, token) {
  return new Promise((resolve) => {
    const testZoom = 10;
    const testCoords = { x: 500, y: 300 }; // Generic coordinates
    
    const img = new Image();
    img.onload = function() {
      resolve(true);
    };
    img.onerror = function() {
      resolve(false);
    };
    
    img.src = `https://tiles.aqicn.org/tiles/${layerType}/${testZoom}/${testCoords.x}/${testCoords.y}.png?token=${token}`;
  });
}

// Add Air Quality Tile Layer with Error Handling
async function addAqiLayer(layerType) {
  const token = aqiTokenInput.value.trim();
  
  if (!token) {
    updateStatus('Please enter a valid API token', 'error');
    return;
  }

  updateStatus('Testing API connection...', 'loading');
  
  try {
    // Test if tiles are accessible
    const isAccessible = await testTileLoading(layerType, token);
    
    if (!isAccessible) {
      updateStatus('API connection failed. Check token or try later.', 'error');
      return;
    }
    
    // Remove existing layer if it exists
    if (currentAqiLayer) {
      if (map.getLayer('air-quality-layer')) {
        map.removeLayer('air-quality-layer');
      }
      if (map.getSource('air-quality-tiles')) {
        map.removeSource('air-quality-tiles');
      }
    }
    
    // Add new source and layer
    map.addSource('air-quality-tiles', {
      type: 'raster',
      tiles: [
        `https://tiles.aqicn.org/tiles/${layerType}/{z}/{x}/{y}.png?token=${token}`
      ],
      tileSize: 256
    });

    map.addLayer({
      id: 'air-quality-layer',
      type: 'raster',
      source: 'air-quality-tiles',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.8
      }
    });
    
    currentAqiLayer = layerType;
    updateStatus('API connected successfully', 'success');
    tileStatus.style.display = 'block';
    tileStatusText.textContent = `${layerType} loaded`;
    
  } catch (error) {
    console.error('Error loading tiles:', error);
    updateStatus('Error loading tiles. See console for details.', 'error');
  }
}

// Update Status UI
function updateStatus(message, status) {
  const statusLabel = connectionStatus.querySelector('.status-label');
  const statusIndicator = connectionStatus.querySelector('.status-indicator i');
  
  statusLabel.textContent = message;
  connectionStatus.className = `status-item ${status}`;
  
  // Update icon
  statusIndicator.className = `fas fa-${getStatusIcon(status)}`;
  
  function getStatusIcon(status) {
    switch(status) {
      case 'loading': return 'circle-notch fa-spin';
      case 'error': return 'exclamation-circle';
      case 'success': return 'check-circle';
      default: return 'info-circle';
    }
  }
}

// Update Last Updated Time
function updateLastUpdated() {
  const now = new Date();
  const timeString = now.toLocaleTimeString();
  lastUpdated.textContent = timeString;
}

// Toggle Panel Collapse
function togglePanel() {
  isPanelCollapsed = !isPanelCollapsed;
  panelContent.classList.toggle('collapsed', isPanelCollapsed);
  panelToggle.querySelector('i').className = isPanelCollapsed ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
}

// Toggle Legend Collapse
function toggleLegend() {
  isLegendCollapsed = !isLegendCollapsed;
  legendContent.classList.toggle('collapsed', isLegendCollapsed);
  legendToggle.querySelector('i').className = isLegendCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

// Toggle Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Error attempting to enable fullscreen:', err);
    });
    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
  } else {
    document.exitFullscreen();
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
  }
}

// Show Info Modal
function showInfoModal() {
  infoModal.classList.add('show');
  infoModal.style.display = 'flex';
}

// Hide Info Modal
function hideInfoModal() {
  infoModal.classList.remove('show');
  setTimeout(() => {
    infoModal.style.display = 'none';
  }, 300);
}

// Reset Map View
function resetMapView() {
  map.flyTo({
    center: [0, 20],
    zoom: 2,
    duration: 1000
  });
}

// Show Token Help
function showTokenHelp() {
  alert('To get your AQI token:\n\n1. Visit https://aqicn.org/api/\n2. Sign up for a free account\n3. Get your token from the dashboard\n4. Paste it in the API Token field');
}

// Geocoding function to get coordinates from city name
async function geocodeLocation(query) {
  try {
    // Using Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const data = await response.json();
    return data.features;
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

// Search for location and navigate to it
async function searchLocation(query) {
  if (!query.trim()) {
    return;
  }
  
  updateStatus('Searching for location...', 'loading');
  
  try {
    const results = await geocodeLocation(query);
    
    if (results.length === 0) {
      updateStatus('Location not found. Try a different search term.', 'error');
      return;
    }
    
    // Use the first result
    const location = results[0];
    const [lng, lat] = location.center;
    
    // Navigate to the location
    map.flyTo({
      center: [lng, lat],
      zoom: 10,
      duration: 2000
    });
    
    // Add a marker for the searched location
    addSearchMarker(lng, lat, location.place_name);
    
    updateStatus(`Navigated to ${location.place_name}`, 'success');
    updateLastUpdated();
    
  } catch (error) {
    console.error('Search error:', error);
    updateStatus('Search failed. Please try again.', 'error');
  }
}

// Add marker for searched location
function addSearchMarker(lng, lat, placeName) {
  // Remove existing search marker
  if (map.getLayer('search-marker')) {
    map.removeLayer('search-marker');
  }
  if (map.getSource('search-marker')) {
    map.removeSource('search-marker');
  }
  
  // Add new marker
  map.addSource('search-marker', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        title: placeName
      }
    }
  });
  
  map.addLayer({
    id: 'search-marker',
    type: 'circle',
    source: 'search-marker',
    paint: {
      'circle-color': '#ef4444',
      'circle-radius': 8,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff'
    }
  });
  
  // Add popup on click
  map.on('click', 'search-marker', (e) => {
    new mapboxgl.Popup({
      className: 'custom-popup',
      maxWidth: '300px'
    })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-content">
          <h3><i class="fas fa-map-marker-alt"></i> ${placeName}</h3>
          <div class="popup-info">
            <div class="popup-item">
              <i class="fas fa-search"></i>
              <span>Searched Location</span>
            </div>
            <div class="popup-item">
              <i class="fas fa-globe"></i>
              <span>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      `)
      .addTo(map);
  });
  
  // Change cursor on hover
  map.on('mouseenter', 'search-marker', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  map.on('mouseleave', 'search-marker', () => {
    map.getCanvas().style.cursor = '';
  });
}

// Show search suggestions
async function showSuggestions(query) {
  if (query.length < 2) {
    searchSuggestions.style.display = 'none';
    return;
  }
  
  try {
    const results = await geocodeLocation(query);
    
    if (results.length === 0) {
      searchSuggestions.style.display = 'none';
      return;
    }
    
    // Display suggestions
    searchSuggestions.innerHTML = results.map(result => `
      <div class="suggestion-item" data-lng="${result.center[0]}" data-lat="${result.center[1]}" data-name="${result.place_name}">
        <i class="fas fa-map-marker-alt"></i>
        <div class="suggestion-text">
          <div class="suggestion-name">${result.place_name}</div>
          <div class="suggestion-details">${result.context ? result.context.map(c => c.text).join(', ') : ''}</div>
        </div>
      </div>
    `).join('');
    
    searchSuggestions.style.display = 'block';
    
    // Add click handlers to suggestions
    searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const lng = parseFloat(item.dataset.lng);
        const lat = parseFloat(item.dataset.lat);
        const name = item.dataset.name;
        
        locationSearch.value = name;
        searchSuggestions.style.display = 'none';
        
        // Navigate to location
        map.flyTo({
          center: [lng, lat],
          zoom: 10,
          duration: 2000
        });
        
        addSearchMarker(lng, lat, name);
        updateStatus(`Navigated to ${name}`, 'success');
        updateLastUpdated();
      });
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    searchSuggestions.style.display = 'none';
  }
}

// Hide suggestions when clicking outside
function hideSuggestions() {
  searchSuggestions.style.display = 'none';
}

// Event Listeners
aqiTypeSelect.addEventListener('change', () => {
  addAqiLayer(aqiTypeSelect.value);
  updateLastUpdated();
});

aqiTokenInput.addEventListener('change', () => {
  if (aqiTypeSelect.value) {
    addAqiLayer(aqiTypeSelect.value);
    updateLastUpdated();
  }
});

// UI Event Listeners
panelToggle.addEventListener('click', togglePanel);
legendToggle.addEventListener('click', toggleLegend);
fullscreenBtn.addEventListener('click', toggleFullscreen);
infoBtn.addEventListener('click', showInfoModal);
modalClose.addEventListener('click', hideInfoModal);
refreshBtn.addEventListener('click', () => {
  if (aqiTypeSelect.value) {
    addAqiLayer(aqiTypeSelect.value);
    updateLastUpdated();
  }
});
resetViewBtn.addEventListener('click', resetMapView);
tokenHelpBtn.addEventListener('click', showTokenHelp);

// Search Event Listeners
searchBtn.addEventListener('click', () => {
  searchLocation(locationSearch.value);
});

locationSearch.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchLocation(locationSearch.value);
  }
});

locationSearch.addEventListener('input', (e) => {
  showSuggestions(e.target.value);
});

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    hideSuggestions();
  }
});

// Close modal when clicking outside
infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    hideInfoModal();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideInfoModal();
  }
  if (e.key === 'F11') {
    e.preventDefault();
    toggleFullscreen();
  }
});

// Initial Load
map.on('load', () => {
  // Add default layer
  addAqiLayer(aqiTypeSelect.value);
  updateLastUpdated();
  
  // Add click interaction
  map.on('click', (e) => {
    new mapboxgl.Popup({
      className: 'custom-popup',
      maxWidth: '300px'
    })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-content">
          <h3><i class="fas fa-map-marker-alt"></i> Location Details</h3>
          <div class="popup-info">
            <div class="popup-item">
              <i class="fas fa-globe"></i>
              <span>Coordinates: ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}</span>
            </div>
            <div class="popup-item">
              <i class="fas fa-layer-group"></i>
              <span>Layer: ${currentAqiLayer || 'None'}</span>
            </div>
            <div class="popup-item">
              <i class="fas fa-clock"></i>
              <span>Updated: ${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      `)
      .addTo(map);
  });
  
  // Monitor tile loading errors
  map.on('error', (e) => {
    if (e.error && e.error.status === 404) {
      tileStatusText.textContent = 'Tile loading failed';
      tileStatusText.className = 'error-status';
    }
  });
});

// Add custom popup styles
const popupStyles = `
  .custom-popup .mapboxgl-popup-content {
    padding: 0;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    border: 1px solid rgba(255,255,255,0.2);
  }
  .popup-content {
    padding: 1rem;
  }
  .popup-content h3 {
    margin: 0 0 0.75rem 0;
    color: #1e293b;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .popup-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .popup-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
  }
  .popup-item i {
    width: 16px;
    color: #667eea;
  }
`;

const style = document.createElement('style');
style.textContent = popupStyles;
document.head.appendChild(style);