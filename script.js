// Global map variables
let currentMapType = 'mapbox'; // 'mapbox' or 'leaflet'
let mapboxMap = null;
let leafletMap = null;
let currentMap = null;

// Check if Mapbox is loaded
if (typeof mapboxgl === 'undefined') {
  console.error('Mapbox GL JS failed to load');
  // Try to fallback to Leaflet
  if (typeof L !== 'undefined') {
    console.log('Falling back to Leaflet map');
    currentMapType = 'leaflet';
  } else {
    document.getElementById('map').innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%); color: white; text-align: center; padding: 2rem;">
        <h2 style="margin-bottom: 1rem;">⚠️ Map Libraries Failed to Load</h2>
        <p style="margin-bottom: 1rem;">Please check your internet connection and try refreshing the page.</p>
        <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Refresh Page</button>
      </div>
    `;
    throw new Error('Both Mapbox and Leaflet failed to load');
  }
}

// Mapbox Token
mapboxgl.accessToken = 'pk.eyJ1IjoibmF6YXJpbWFtNCIsImEiOiJjbWdzY3A2dmUwcDE1MmtzMXB3dngyYjdtIn0.Vql7DCpJ_h79oFyW8U1QTw';

// Initialize Mapbox Map
function initializeMapboxMap() {
  try {
    mapboxMap = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [0, 20],
      zoom: 1.5,
      projection: 'globe',
      pitch: 0,
      bearing: 0,
      antialias: true,
      preserveDrawingBuffer: true
    });

    // Add error handling for map initialization
    mapboxMap.on('error', (e) => {
      console.error('Mapbox error:', e);
      updateStatus('Mapbox initialization failed. Please check your internet connection.', 'error');
    });

    // Add loading error handling
    mapboxMap.on('loaderror', (e) => {
      console.error('Mapbox load error:', e);
      updateStatus('Failed to load Mapbox tiles. Check your connection.', 'error');
    });

    return mapboxMap;
  } catch (error) {
    console.error('Failed to initialize Mapbox:', error);
    return null;
  }
}

// Initialize Leaflet Map
function initializeLeafletMap() {
  try {
    // Clear the map container first
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = '';
    }
    
    // Initialize immediately but add tiles after a short delay
    leafletMap = L.map('map').setView([20, 0], 1.5);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(leafletMap);

    return leafletMap;
  } catch (error) {
    console.error('Failed to initialize Leaflet:', error);
    return null;
  }
}

// Initialize the appropriate map
function initializeMap() {
  if (currentMapType === 'mapbox' && typeof mapboxgl !== 'undefined') {
    currentMap = initializeMapboxMap();
  } else if (currentMapType === 'leaflet' && typeof L !== 'undefined') {
    currentMap = initializeLeafletMap();
  } else {
    console.error('No suitable map library available');
    return null;
  }
  
  return currentMap;
}

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const tileStatus = document.getElementById('tile-status');
const tileStatusText = document.getElementById('tile-status-text');
const aqiTypeSelect = document.getElementById('aqi-type');
const aqiTokenInput = document.getElementById('aqi-token');
const lastUpdated = document.getElementById('last-updated');
const mapToggleBtn = document.getElementById('map-toggle-btn');
const mapToggleText = document.getElementById('map-toggle-text');

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

// Map switching functionality
function switchMap() {
  if (currentMapType === 'mapbox') {
    // Switch to Leaflet
    if (typeof L === 'undefined') {
      updateStatus('Leaflet library not loaded. Cannot switch maps.', 'error');
      return;
    }
    
    // Store current view state
    let center, zoom;
    if (currentMap && currentMapType === 'mapbox') {
      center = currentMap.getCenter();
      zoom = currentMap.getZoom();
    } else {
      center = { lng: 0, lat: 20 };
      zoom = 1.5;
    }
    
    // Clear the map container
    document.getElementById('map').innerHTML = '';
    
    // Switch to Leaflet
    currentMapType = 'leaflet';
    currentMap = initializeLeafletMap();
    
    if (currentMap) {
      // Wait for Leaflet to be ready, then set view
      setTimeout(() => {
        if (currentMap && currentMap.setView) {
          currentMap.setView([center.lat, center.lng], zoom);
        }
        mapToggleText.textContent = 'Mapbox';
        updateStatus('Switched to Leaflet map', 'success');
        
        // Re-add AQI layer if it exists
        if (currentAqiLayer) {
          setTimeout(() => {
            addAqiLayer(currentAqiLayer);
          }, 200);
        }
      }, 200);
    }
  } else {
    // Switch to Mapbox
    if (typeof mapboxgl === 'undefined') {
      updateStatus('Mapbox library not loaded. Cannot switch maps.', 'error');
      return;
    }
    
    // Store current view state
    let center, zoom;
    if (currentMap && currentMapType === 'leaflet') {
      center = currentMap.getCenter();
      zoom = currentMap.getZoom();
    } else {
      center = { lat: 20, lng: 0 };
      zoom = 1.5;
    }
    
    // Clear the map container
    document.getElementById('map').innerHTML = '';
    
    // Switch to Mapbox
    currentMapType = 'mapbox';
    currentMap = initializeMapboxMap();
    
    if (currentMap) {
      // Set the view to match previous map
      currentMap.setCenter([center.lng, center.lat]);
      currentMap.setZoom(zoom);
      mapToggleText.textContent = 'Leaflet';
      updateStatus('Switched to Mapbox map', 'success');
      
      // Re-add AQI layer if it exists
      if (currentAqiLayer) {
        addAqiLayer(currentAqiLayer);
      }
    }
  }
}

// Helper function to add Mapbox layer
function addMapboxLayer(layerType, token) {
  try {
    currentMap.addSource('air-quality-tiles', {
      type: 'raster',
      tiles: [
        `https://tiles.aqicn.org/tiles/${layerType}/{z}/{x}/{y}.png?token=${token}`
      ],
      tileSize: 256
    });

    currentMap.addLayer({
      id: 'air-quality-layer',
      type: 'raster',
      source: 'air-quality-tiles',
      minzoom: 0,
      maxzoom: 22,
      paint: {
        'raster-opacity': 0.8
      }
    });
  } catch (error) {
    console.error('Error adding Mapbox layer:', error);
  }
}

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
  if (!currentMap) {
    updateStatus('Map not initialized. Please refresh the page.', 'error');
    return;
  }
  
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
      if (currentMapType === 'mapbox') {
        if (currentMap.getLayer('air-quality-layer')) {
          currentMap.removeLayer('air-quality-layer');
        }
        if (currentMap.getSource('air-quality-tiles')) {
          currentMap.removeSource('air-quality-tiles');
        }
      } else if (currentMapType === 'leaflet') {
        if (currentMap.airQualityLayer && currentMap.hasLayer(currentMap.airQualityLayer)) {
          currentMap.removeLayer(currentMap.airQualityLayer);
        }
      }
    }
    
    // Add new layer based on map type
    if (currentMapType === 'mapbox') {
      // Check if map is loaded before adding sources
      if (!currentMap.isStyleLoaded()) {
        currentMap.on('style.load', () => {
          addMapboxLayer(layerType, token);
        });
      } else {
        addMapboxLayer(layerType, token);
      }
    } else if (currentMapType === 'leaflet') {
      // Add Leaflet tile layer
      currentMap.airQualityLayer = L.tileLayer(`https://tiles.aqicn.org/tiles/${layerType}/{z}/{x}/{y}.png?token=${token}`, {
        attribution: 'Air Quality Data: AQICN.org',
        opacity: 0.8,
        maxZoom: 22
      }).addTo(currentMap);
    }
    
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
  if (!currentMap) {
    updateStatus('Map not initialized. Please refresh the page.', 'error');
    return;
  }
  
  if (currentMapType === 'mapbox') {
    currentMap.flyTo({
      center: [0, 20],
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      duration: 2000
    });
  } else if (currentMapType === 'leaflet') {
    currentMap.setView([20, 0], 1.5);
  }
}

// Show Token Help
function showTokenHelp() {
  alert('To get your AQI token:\n\n1. Visit https://aqicn.org/api/\n2. Sign up for a free account\n3. Get your token from the dashboard\n4. Paste it in the API Token field');
}

// Geocoding function to get coordinates from city name
async function geocodeLocation(query) {
  try {
    if (currentMapType === 'mapbox' && typeof mapboxgl !== 'undefined') {
      // Using Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Mapbox geocoding request failed');
      }
      
      const data = await response.json();
      return data.features;
    } else {
      // Using OpenStreetMap Nominatim API for Leaflet
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Nominatim geocoding request failed');
      }
      
      const data = await response.json();
      return data.map(item => ({
        center: [parseFloat(item.lon), parseFloat(item.lat)],
        place_name: item.display_name,
        context: item.address ? Object.values(item.address).slice(0, 3) : []
      }));
    }
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
    if (currentMapType === 'mapbox') {
      currentMap.flyTo({
        center: [lng, lat],
        zoom: 8,
        pitch: 45,
        bearing: 0,
        duration: 2500
      });
    } else if (currentMapType === 'leaflet') {
      currentMap.setView([lat, lng], 8);
    }
    
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
  if (currentMapType === 'mapbox') {
    // Remove existing search marker
    if (currentMap.getLayer('search-marker')) {
      currentMap.removeLayer('search-marker');
    }
    if (currentMap.getSource('search-marker')) {
      currentMap.removeSource('search-marker');
    }
    
    // Add new marker
    currentMap.addSource('search-marker', {
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
    
    currentMap.addLayer({
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
    currentMap.on('click', 'search-marker', (e) => {
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
        .addTo(currentMap);
    });
    
    // Change cursor on hover
    currentMap.on('mouseenter', 'search-marker', () => {
      currentMap.getCanvas().style.cursor = 'pointer';
    });
    
    currentMap.on('mouseleave', 'search-marker', () => {
      currentMap.getCanvas().style.cursor = '';
    });
  } else if (currentMapType === 'leaflet') {
    // Remove existing search marker
    if (currentMap.searchMarker) {
      currentMap.removeLayer(currentMap.searchMarker);
    }
    
    // Add new marker
    currentMap.searchMarker = L.marker([lat, lng]).addTo(currentMap);
    
    // Add popup
    currentMap.searchMarker.bindPopup(`
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
    `).openPopup();
  }
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
        if (currentMapType === 'mapbox') {
          currentMap.flyTo({
            center: [lng, lat],
            zoom: 8,
            pitch: 45,
            bearing: 0,
            duration: 2500
          });
        } else if (currentMapType === 'leaflet') {
          currentMap.setView([lat, lng], 8);
        }
        
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
mapToggleBtn.addEventListener('click', switchMap);
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

// Initialize the map
currentMap = initializeMap();

// Initial Load
if (currentMap) {
  if (currentMapType === 'mapbox') {
    currentMap.on('load', () => {
    // Add 3D globe effects
    currentMap.setFog({
      'color': 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6
    });

    // Add atmosphere effect
    currentMap.setFog({
      'color': 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6
    });

    // Add default layer
    addAqiLayer(aqiTypeSelect.value);
    updateLastUpdated();
    
    // Add click interaction
    currentMap.on('click', (e) => {
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
        .addTo(currentMap);
    });
    
    // Monitor tile loading errors
    currentMap.on('error', (e) => {
      if (e.error && e.error.status === 404) {
        tileStatusText.textContent = 'Tile loading failed';
        tileStatusText.className = 'error-status';
      }
    });
    });
  } else if (currentMapType === 'leaflet') {
    // Wait for Leaflet to be ready
    setTimeout(() => {
      // Add default layer for Leaflet
      addAqiLayer(aqiTypeSelect.value);
      updateLastUpdated();
      
      // Add click interaction for Leaflet
      currentMap.on('click', (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      
      L.popup({
        className: 'custom-popup',
        maxWidth: 300
      })
        .setLatLng([lat, lng])
        .setContent(`
          <div class="popup-content">
            <h3><i class="fas fa-map-marker-alt"></i> Location Details</h3>
            <div class="popup-info">
              <div class="popup-item">
                <i class="fas fa-globe"></i>
                <span>Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
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
        .openOn(currentMap);
      });
    }, 300);
  }
}

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