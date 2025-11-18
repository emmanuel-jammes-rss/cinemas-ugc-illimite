// MapBox
var MAPBOX_ID = 'ejammes/cklif5lq51hat18o1q11qb64y';
var MAPBOX_TOKEN = 'pk.eyJ1IjoiZWphbW1lcyIsImEiOiI2OWJlMmMyYzg2YjdkYjE3OTc1Yjk3NGY0Mzc3NTkyOCJ9.XrrwfeOTdKERo85D2D-SxQ';

$(document).ready(function () {

    // Basic map setup
    const map = L.map('map', {
        renderer: L.svg(),
        zoomControl: true
    }).setView([48.868069, 2.340929], 12);

    // map config : mapbox
    var mapbox = L.tileLayer.provider('MapBox', {
        id: MAPBOX_ID,
        accessToken: MAPBOX_TOKEN,
        minZoom: 6,
        maxZoom: 22,
    }).addTo(map);

    var osm = L.tileLayer.provider('OpenStreetMap.Mapnik', {
        minZoom: 6,
        maxZoom: 22
    });

    var baseMaps = {
        "MapBox": mapbox,
        "OpenStreetMap": osm
    };
    
    // Create separate layer groups
    const ugcLayer = L.layerGroup().addTo(map);
    const mk2Layer = L.layerGroup().addTo(map);
    const othersLayer = L.layerGroup().addTo(map);

    var overlayMaps = {
        "UGC": ugcLayer,
        "MK2": mk2Layer,
        "Autres": othersLayer
    };

    var layerControl = L.control.layers(baseMaps, overlayMaps, {
        position: 'topright',
        collapsed: true,
        sortLayers: false
    }).addTo(map);

    // locate control
    L.control.locate({locateOptions: { maxZoom: 15 }}).addTo(map);

    // Helper: build popup HTML from properties
    function propsToHtml(props) {
        if (!props) return '';
        let html = '<div class="info">';
        for (const k of Object.keys(props)) {
            let v = props[k];
            if (v === null || v === undefined) v = '';
            html += `<b>${k}</b>: ${String(v)}<br>`;
        }
        html += '</div>';
        return html;
    }

    // Load GeoJSON (assumes this HTML is in the same folder as the .geojson file)
    fetch('ugc_addresses.geojson')
    .then(resp => {
        if (!resp.ok) throw new Error('Failed to load GeoJSON: ' + resp.status);
        return resp.json();
    })
    .then(data => {
        
        const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        let allMarkers = [];
        for (const feature of (data.features || [])){
            if(!feature || !feature.geometry) continue;
            const coords = feature.geometry.coordinates;
            if(!coords || coords.length < 2) continue;
            const latlng = L.latLng(coords[1], coords[0]);
            const p = feature.properties || {};

            // Name-based rules
            const defaultColor = '#38642c';
            const nameProp = (p.name || p.Name || p.NAME || '').toString().toLowerCase();
            let chosenColor = defaultColor;
            let targetLayer = othersLayer;
            if(nameProp.includes('ugc')){
                chosenColor = '#0000ff';
                targetLayer = ugcLayer;
            } else if(nameProp.includes('mk2')){
                chosenColor = '#ff0000';
                targetLayer = mk2Layer;
            }

            const iconHtml = `<i class="fa-solid fa-film"></i>`;
            const html = `<div class="my-marker" style="background:${esc(chosenColor)}">${iconHtml}</div>`;
            const marker = L.marker(latlng, { icon: L.divIcon({className: '', html, iconSize: [28, 28], iconAnchor: [14, 14] }) });
            marker.bindPopup(propsToHtml(p));
            // add to category layer
            marker.addTo(targetLayer);
            allMarkers.push(marker);
        }

        // Layer control (UGC/MK2/Others)
        // const overlays = { 'UGC': ugcLayer, 'MK2': mk2Layer, 'Others': othersLayer };
        // L.control.layers(null, overlays, { collapsed: false }).addTo(map);

        // Fit map to all markers
        try {
            if(allMarkers.length){
                const group = L.featureGroup(allMarkers);
                map.fitBounds(group.getBounds());
            }
        } catch (e) {
            // fallback
        }

    })
    .catch(err => {
        console.error(err);
        const errDiv = L.control({ position: 'topright' });
        errDiv.onAdd = () => {
            const d = L.DomUtil.create('div', 'info');
            d.style.background = '#fee';
            d.innerHTML = '<b>Error loading GeoJSON</b><br/>' + (err.message || '');
            return d;
        };
        errDiv.addTo(map);
    });
});