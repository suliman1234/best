// Initialize the map
const map = L.map('map').setView([40.7128, -74.0060], 13);

// Add OpenStreetMap basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Create layer groups for better organization
const populationLayer = L.layerGroup().addTo(map);
const facilitiesLayer = L.layerGroup().addTo(map);

// Store all bounds for fitting the map
let allBounds = [];

// Load population GeoJSON
fetch('data/population.geojson')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
    })
    .then(geojsonData => {
        const geoLayer = L.geoJSON(geojsonData, {
            style: feature => {
                const pop = feature.properties.population || 0;
                return {
                    fillColor: getColor(pop),
                    weight: 2,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                layer.bindPopup(`
                    <strong>${props.name || 'Unknown Area'}</strong><br>
                    Population: ${props.population?.toLocaleString() || 'Unknown'}<br>
                    Density: ${props.population ? (props.population / 1000).toFixed(1) + 'k' : 'Unknown'}
                `);
                
                // Add hover effects
                layer.on({
                    mouseover: function(e) {
                        const layer = e.target;
                        layer.setStyle({
                            weight: 3,
                            color: '#333',
                            fillOpacity: 0.9
                        });
                    },
                    mouseout: function(e) {
                        geoLayer.resetStyle(e.target);
                    }
                });
            }
        });
        
        geoLayer.addTo(populationLayer);
        
        // Add bounds to our collection
        allBounds.push(geoLayer.getBounds());
        fitMapToData();
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        alert('Error loading population data. Please check if data/population.geojson exists.');
    });

// Load facilities from CSV
fetch('data/facilities.csv')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
    })
    .then(csvText => {
        const rows = csvText.trim().split('\n').slice(1); // skip header and empty lines
        const facilityBounds = [];
        
        rows.forEach((row, index) => {
            if (row.trim()) {
                const columns = row.split(',');
                if (columns.length >= 4) {
                    const [name, type, lat, lon] = columns.map(col => col.trim());
                    const latitude = parseFloat(lat);
                    const longitude = parseFloat(lon);
                    
                    if (!isNaN(latitude) && !isNaN(longitude)) {
                        const marker = L.marker([latitude, longitude], {
                            icon: getMarkerIcon(type)
                        });
                        
                        marker.bindPopup(`
                            <strong>${name}</strong><br>
                            Type: ${type}<br>
                            Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
                        `);
                        
                        marker.addTo(facilitiesLayer);
                        facilityBounds.push([latitude, longitude]);
                    } else {
                        console.warn(`Invalid coordinates for facility "${name}": lat=${lat}, lon=${lon}`);
                    }
                } else {
                    console.warn(`Invalid CSV row ${index + 2}: insufficient columns`);
                }
            }
        });
        
        // Add facility bounds to our collection
        if (facilityBounds.length > 0) {
            allBounds.push(L.latLngBounds(facilityBounds));
            fitMapToData();
        }
    })
    .catch(error => {
        console.error('Error loading CSV:', error);
        alert('Error loading facilities data. Please check if data/facilities.csv exists.');
    });

// Helper function for coloring based on population density
function getColor(pop) {
    return pop > 1000 ? '#800026' :
           pop > 500  ? '#BD0026' :
           pop > 200  ? '#E31A1C' :
           pop > 100  ? '#FC4E2A' :
           pop > 50   ? '#FD8D3C' :
           pop > 20   ? '#FEB24C' :
           pop > 10   ? '#FED976' :
                        '#FFEDA0';
}

// Helper function to create custom markers based on facility type
function getMarkerIcon(type) {
    const iconColors = {
        'Hospital': '#FF0000',
        'Clinic': '#0080FF',
        'Emergency': '#FF4500',
        'Urgent Care': '#FFA500',
        'Specialty': '#9932CC',
        'Rehabilitation': '#32CD32',
        'Mental Health': '#FFB6C1',
        'Dental': '#87CEEB',
        'Pharmacy': '#228B22'
    };
    
    const color = iconColors[type] || '#666666';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
}

// Function to fit map view to all loaded data
function fitMapToData() {
    if (allBounds.length > 0) {
        // Combine all bounds
        let combinedBounds = allBounds[0];
        for (let i = 1; i < allBounds.length; i++) {
            combinedBounds.extend(allBounds[i]);
        }
        
        // Fit map to combined bounds with padding
        map.fitBounds(combinedBounds, {
            padding: [20, 20]
        });
    }
}

// Add a legend for population density
const legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend');
    const grades = [0, 10, 20, 50, 100, 200, 500, 1000];
    
    div.innerHTML = '<h4>Population</h4>';
    
    for (let i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
    
    return div;
};

legend.addTo(map);

// Add layer control
const overlayMaps = {
    "Population Areas": populationLayer,
    "Facilities": facilitiesLayer
};

L.control.layers(null, overlayMaps).addTo(map);
