import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Task, User, Feature, Boundary } from '@shared/schema';

// Store legend control reference separately
interface CustomMap extends L.Map {
  _legendControl?: L.Control;
}

// Define status colors
const statusColors = {
  'Unassigned': '#9E9E9E',
  'Assigned': '#2196F3',
  'In Progress': '#9C27B0',
  'Completed': '#4CAF50',
  'In-Complete': '#FFC107',
  'Submit-Review': '#FF9800',
  'Review_Accepted': '#8BC34A',
  'Review_Reject': '#F44336',
  'Review_inprogress': '#03A9F4'
};

const featureColors = {
  'Tower': '#E91E63',
  'Manhole': '#9C27B0',
  'FiberCable': '#3F51B5',
  'Parcel': '#009688'
};

interface MapProps {
  center?: [number, number];
  zoom?: number;
  features?: Feature[];
  teams?: User[];
  boundaries?: Boundary[];
  tasks?: Task[];
  activeFilters?: string[];
  onFeatureClick?: (feature: Feature) => void;
  onTeamClick?: (team: User) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  selectionMode?: boolean;
  className?: string;
}

const LeafletMap = ({
  center = [24.8607, 67.0011], // Default Karachi coordinates
  zoom = 13,
  features = [],
  teams = [],
  boundaries = [],
  tasks = [],
  activeFilters = [],
  onFeatureClick,
  onTeamClick,
  onMapClick,
  selectionMode = false,
  className = 'h-full w-full'
}: MapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const featuresLayerRef = useRef<L.LayerGroup | null>(null);
  const teamsLayerRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerRef = useRef<L.LayerGroup | null>(null);
  const tasksLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('map').setView(center, zoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      featuresLayerRef.current = L.layerGroup().addTo(map);
      teamsLayerRef.current = L.layerGroup().addTo(map);
      boundariesLayerRef.current = L.layerGroup().addTo(map);
      tasksLayerRef.current = L.layerGroup().addTo(map);
      
      mapRef.current = map;
      
      if (onMapClick) {
        map.on('click', (e) => {
          if (selectionMode) {
            onMapClick(e.latlng);
          }
        });
      }
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update map center and zoom if changed
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);
  
  // Update features on the map
  useEffect(() => {
    if (!featuresLayerRef.current) return;
    
    featuresLayerRef.current.clearLayers();
    
    features.forEach(feature => {
      // Skip if filtered out
      if (activeFilters.length > 0 && !activeFilters.includes('All') && 
          !activeFilters.includes(feature.feaStatus)) {
        return;
      }
      
      if (!feature.geometry) return;
      
      try {
        const geometry = typeof feature.geometry === 'string' 
          ? JSON.parse(feature.geometry) 
          : feature.geometry;
        
        let layer: L.Layer | null = null;
        
        if (geometry.type === 'Point') {
          const [lng, lat] = geometry.coordinates;
          
          // Create icon based on feature type
          const color = featureColors[feature.feaType as keyof typeof featureColors] || '#757575';
          const icon = L.divIcon({
            className: 'feature-icon',
            html: `<div style="background-color: ${color}; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">${feature.feaNo}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          
          layer = L.marker([lat, lng], { icon });
        } else if (geometry.type === 'LineString') {
          const points = geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
          layer = L.polyline(points, { 
            color: featureColors[feature.feaType as keyof typeof featureColors] || '#757575',
            weight: 3,
            opacity: 0.8
          });
        } else if (geometry.type === 'Polygon') {
          const points = geometry.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);
          layer = L.polygon(points, { 
            color: featureColors[feature.feaType as keyof typeof featureColors] || '#757575',
            fillOpacity: 0.3,
            weight: 2
          });
        }
        
        if (layer) {
          layer.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${feature.name || `${feature.feaType} #${feature.feaNo}`}</h3>
              <div class="text-xs mt-1">Type: ${feature.specificType}</div>
              <div class="text-xs">Status: ${feature.feaStatus}</div>
            </div>
          `);
          
          if (onFeatureClick) {
            layer.on('click', () => onFeatureClick(feature));
          }
          
          featuresLayerRef.current?.addLayer(layer);
        }
      } catch (error) {
        console.error('Error rendering feature geometry:', error);
      }
    });
  }, [features, activeFilters, onFeatureClick]);
  
  // Update team markers on the map
  useEffect(() => {
    if (!teamsLayerRef.current) return;
    
    teamsLayerRef.current.clearLayers();
    
    teams.forEach(team => {
      if (!team.currentLocation) return;
      
      try {
        const location = typeof team.currentLocation === 'string'
          ? JSON.parse(team.currentLocation)
          : team.currentLocation;
        
        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          
          // Create user marker
          const isActive = team.lastActive && (new Date().getTime() - new Date(team.lastActive).getTime() < 15 * 60 * 1000);
          const statusColor = isActive ? '#4CAF50' : '#F44336';
          
          const icon = L.divIcon({
            className: 'user-marker',
            html: `
              <div class="rounded-full bg-white p-1 shadow-md">
                <div class="rounded-full bg-primary-500 text-white w-8 h-8 flex items-center justify-center font-medium text-sm relative">
                  ${team.name.slice(0, 1)}
                  <span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white flex items-center justify-center">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${statusColor}"></span>
                  </span>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          const marker = L.marker([lat, lng], { icon });
          
          marker.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${team.name}</h3>
              <div class="text-xs mt-1">Role: ${team.role}</div>
              <div class="text-xs">Status: ${isActive ? 'Active' : 'Inactive'}</div>
              ${team.lastActive ? `<div class="text-xs">Last seen: ${new Date(team.lastActive).toLocaleTimeString()}</div>` : ''}
            </div>
          `);
          
          if (onTeamClick) {
            marker.on('click', () => onTeamClick(team));
          }
          
          teamsLayerRef.current?.addLayer(marker);
        }
      } catch (error) {
        console.error('Error rendering team marker:', error);
      }
    });
  }, [teams, onTeamClick]);
  
  // Update boundaries on the map
  useEffect(() => {
    if (!boundariesLayerRef.current) return;
    
    boundariesLayerRef.current.clearLayers();
    
    boundaries.forEach(boundary => {
      if (!boundary.geometry) return;
      
      try {
        const geometry = typeof boundary.geometry === 'string'
          ? JSON.parse(boundary.geometry)
          : boundary.geometry;
        
        if (geometry.type === 'Polygon') {
          const points = geometry.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);
          
          // Get color based on status
          const statusColor = statusColors[boundary.status as keyof typeof statusColors] || '#757575';
          
          const polygon = L.polygon(points, {
            color: statusColor,
            fillOpacity: 0.2,
            weight: 2
          });
          
          polygon.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${boundary.name}</h3>
              <div class="text-xs mt-1">Status: ${boundary.status}</div>
            </div>
          `);
          
          boundariesLayerRef.current?.addLayer(polygon);
        }
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });
  }, [boundaries]);
  
  // Update tasks on the map
  useEffect(() => {
    if (!tasksLayerRef.current) return;
    
    tasksLayerRef.current.clearLayers();
    
    tasks.forEach(task => {
      if (!task.location) return;
      
      try {
        const location = typeof task.location === 'string'
          ? JSON.parse(task.location)
          : task.location;
        
        if (location.type === 'Point') {
          const [lng, lat] = location.coordinates;
          
          // Get color based on status
          const statusColor = statusColors[task.status as keyof typeof statusColors] || '#757575';
          
          const icon = L.divIcon({
            className: 'task-marker',
            html: `
              <div class="rounded-full bg-white p-1 shadow-md">
                <div class="rounded-full flex items-center justify-center text-white w-8 h-8 text-xs font-medium" style="background-color: ${statusColor}">
                  Task
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          
          const marker = L.marker([lat, lng], { icon });
          
          marker.bindPopup(`
            <div class="p-2">
              <h3 class="font-medium">${task.title}</h3>
              <div class="text-xs mt-1">Status: ${task.status}</div>
              ${task.dueDate ? `<div class="text-xs">Due: ${new Date(task.dueDate).toLocaleDateString()}</div>` : ''}
            </div>
          `);
          
          tasksLayerRef.current?.addLayer(marker);
        }
      } catch (error) {
        console.error('Error rendering task marker:', error);
      }
    });
  }, [tasks]);
  
  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], zoom || mapRef.current.getZoom());
    }
  }, []);
  
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 16);
          }
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser');
    }
  }, []);
  
  // Create a legend control
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove existing legend if any
    const map = mapRef.current;
    const existingLegends = document.querySelectorAll('.map-legend-control');
    existingLegends.forEach(el => el.remove());
    
    // Create custom legend control
    const LegendControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function() {
        const container = L.DomUtil.create('div', 'map-legend-control');
        
        // Style the container
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
        container.style.minWidth = '150px';
        container.style.zIndex = '1000';
        
        // Add title
        let content = '<h4 style="margin:0 0 8px; font-weight:bold;">Map Legend</h4>';
        
        // Add feature types
        if (features && features.length > 0) {
          content += '<div style="margin-bottom:8px;"><strong>Feature Types</strong></div>';
          
          Object.entries(featureColors).forEach(([type, color]) => {
            content += `
              <div style="display:flex; align-items:center; margin-bottom:4px;">
                <div style="width:16px; height:16px; background-color:${color}; margin-right:8px; border-radius:50%;"></div>
                <span>${type}</span>
              </div>
            `;
          });
        }
        
        // Add task status
        if (tasks && tasks.length > 0) {
          content += '<div style="margin-top:12px; margin-bottom:8px;"><strong>Task Status</strong></div>';
          
          Object.entries(statusColors).forEach(([status, color]) => {
            content += `
              <div style="display:flex; align-items:center; margin-bottom:4px;">
                <div style="width:16px; height:16px; background-color:${color}; margin-right:8px; border-radius:3px;"></div>
                <span>${status}</span>
              </div>
            `;
          });
        }
        
        container.innerHTML = content;
        return container;
      }
    });
    
    // Add the legend to the map
    new LegendControl().addTo(map);
    
  }, [features, tasks, mapRef.current]);
  
  return (
    <div id="map" className={className}></div>
  );
};

export default LeafletMap;
