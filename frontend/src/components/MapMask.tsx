import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { statesGeoJson } from '../data/statesGeoJsonData';
import { Feature, Polygon, MultiPolygon } from 'geojson';

interface MapMaskProps {
  map: L.Map | null;
}

const MapMask: React.FC<MapMaskProps> = ({ map }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!map) return;

    console.log('Initial statesGeoJson:', statesGeoJson);

    const overlayPane = map.getPanes().overlayPane;
    let svg = overlayPane.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.pointerEvents = 'none';
      overlayPane.appendChild(svg);
    }
    svgRef.current = svg;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', 'india-mask');

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', '-100%');
    background.setAttribute('y', '-100%');
    background.setAttribute('width', '300%');
    background.setAttribute('height', '300%');
    background.setAttribute('fill', 'white');
    mask.appendChild(background);

    const indiaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    indiaPath.setAttribute('fill', 'black');

    const borderPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    borderPath.setAttribute('fill', 'none');
    borderPath.setAttribute('stroke', '#FFD700');
    borderPath.setAttribute('stroke-width', '1');
    borderPath.setAttribute('stroke-opacity', '0.4');

    const updatePath = () => {
      const pathData = statesGeoJson.features
        .filter((feature): feature is Feature<Polygon | MultiPolygon> => 
          feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'
        )
        .map(feature => {
          if (feature.geometry.type === 'Polygon') {
            // Handle single polygon
            return feature.geometry.coordinates.map(ring => {
              return ring.map((coord: number[]) => {
                const point = map.latLngToLayerPoint([coord[1], coord[0]]);
                return `${point.x},${point.y}`;
              }).join(' L ');
            }).map(ring => `M ${ring} Z`).join(' ');
          } else {
            // Handle multi polygon (states with multiple parts)
            return feature.geometry.coordinates.map(polygon => {
              return polygon.map(ring => {
                return ring.map((coord: number[]) => {
                  const point = map.latLngToLayerPoint([coord[1], coord[0]]);
                  return `${point.x},${point.y}`;
                }).join(' L ');
              }).map(ring => `M ${ring} Z`).join(' ');
            }).join(' ');
          }
        })
        .join(' ');

      indiaPath.setAttribute('d', pathData);
      borderPath.setAttribute('d', pathData);
      console.log('Paths updated with new coordinates');
    };

    mask.appendChild(indiaPath);
    defs.appendChild(mask);
    svg.appendChild(defs);
    svg.appendChild(borderPath);

    const maskRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    maskRect.setAttribute('x', '-100%');
    maskRect.setAttribute('y', '-100%');
    maskRect.setAttribute('width', '300%');
    maskRect.setAttribute('height', '300%');
    maskRect.setAttribute('fill', 'rgba(33, 33, 33, 0.85)'); // Changed to dark grey with 0.85 opacity
    maskRect.style.mask = 'url(#india-mask)';
    svg.appendChild(maskRect);

    map.on('moveend zoomend', updatePath);
    updatePath();

    console.log('Mask setup complete');

    return () => {
      map.off('moveend zoomend', updatePath);
      const currentSvg = svgRef.current;
      if (currentSvg && currentSvg.parentNode) {
        currentSvg.parentNode.removeChild(currentSvg);
      }
    };
  }, [map]);

  return null;
};

export default MapMask; 