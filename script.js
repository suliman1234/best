// Initialize the map
const map = L.map('map').setView([0, 0], 13); // Change center and zoom as needed

// Add OpenStreetMap basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

// Load population GeoJSON
fetch('data/population.geojson')
    .then(res => res.json())
    .then(geojsonData => {
        L.geoJSON(geojsonData, {
            style: feature => {
                const pop = feature.properties.population || 0;
                return {
                    fillColor: getColor(pop),
                    weight: 1,
                    color: '#999',
                    fillOpacity: 0.6
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`Population: ${feature.properties.population}`);
            }
        }).addTo(map);
    });

// Load facilities from CSV
fetch('data/facilities.csv')
    .then(res => res.text())
    .then(csvText => {
        const rows = csvText.split('\n').slice(1); // skip header
        rows.forEach(row => {
            const [name, type, lat, lon] = row.split(',');
            if (lat && lon) {
                L.marker([parseFloat(lat), parseFloat(lon)])
                    .addTo(map)
                    .bindPopup(`<strong>${name}</strong><br>Type: ${type}`);
            }
        });
    });

// Helper function for coloring
function getColor(pop) {
    return pop > 1000 ? '#800026' :
           pop > 500  ? '#BD0026' :
           pop > 200  ? '#E31A1C' :
           pop > 100  ? '#FC4E2A' :
           pop > 50   ? '#FD8D3C' :
           pop > 20   ? '#FEB24C' :
           pop > 0    ? '#FED976' :
                        '#FFEDA0';
}
