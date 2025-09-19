import { useRef, useEffect, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { locations } from '../../data/locations';
import type { Location } from '../../types';

const GlobeComponent = () => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Create arcs between locations
  const arcs = [
    {
      startLat: locations[2].coordinates[0], // Vietnam
      startLng: locations[2].coordinates[1],
      endLat: locations[1].coordinates[0], // Germany
      endLng: locations[1].coordinates[1],
      color: ['#00ffff', '#ff00ff']
    },
    {
      startLat: locations[1].coordinates[0], // Germany
      startLng: locations[1].coordinates[1],
      endLat: locations[0].coordinates[0], // Boston
      endLng: locations[0].coordinates[1],
      color: ['#ff00ff', '#00ffff']
    }
  ];

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 30, lng: -50, altitude: 2.5 });
    }
  }, []);

  const handleLocationClick = (point: object) => {
    const location = point as Location;
    setSelectedLocation(location);
    if (globeEl.current && location) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({
        lat: location.coordinates[0],
        lng: location.coordinates[1],
        altitude: 1.5
      }, 1000);
    }
  };

  return (
    <div className="w-full h-screen bg-black">
      <Globe
        ref={globeEl}
        globeImageUrl="/textures/globe.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Points (locations)
        pointsData={locations}
        pointLat={(d: object) => (d as Location).coordinates[0]}
        pointLng={(d: object) => (d as Location).coordinates[1]}
        pointColor={() => '#00ffff'}
        pointAltitude={0.01}
        pointRadius={0.3}
        pointLabel={(d: object) => {
          const location = d as Location;
          return `
            <div style="color: white; background: rgba(0,0,0,0.8); padding: 5px; border-radius: 3px;">
              <div style="font-weight: bold;">${location.name}</div>
              <div style="font-size: 12px;">${location.role}</div>
            </div>
          `;
        }}
        onPointClick={handleLocationClick}
        
        // Arcs (connections)
        arcsData={arcs}
        arcColor={'color'}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        
        // Atmosphere
        atmosphereColor="#00ffff"
        atmosphereAltitude={0.15}
        
        animateIn={true}
      />
      
      {/* Info Panel */}
      {selectedLocation && (
        <div className="absolute bottom-10 left-10 bg-black/90 border border-cyan-400 p-6 max-w-md backdrop-blur-sm">
          <button 
            onClick={() => {
              setSelectedLocation(null);
              if (globeEl.current) {
                globeEl.current.controls().autoRotate = true;
              }
            }}
            className="absolute top-2 right-2 text-cyan-400 hover:text-white"
          >
            ✕
          </button>
          <h2 className="text-cyan-400 text-2xl mb-2">{selectedLocation.name}</h2>
          <h3 className="text-white text-lg">{selectedLocation.role}</h3>
          <p className="text-gray-400">{selectedLocation.company}</p>
          <p className="text-gray-500 text-sm mt-2">{selectedLocation.period}</p>
          <p className="text-gray-300 mt-4">{selectedLocation.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {selectedLocation.skills.map((skill: string) => (
              <span key={skill} className="px-2 py-1 bg-cyan-400/20 text-cyan-400 text-xs rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-20 left-10 text-white/60 text-sm">
        <p>🖱️ Click on locations to explore</p>
        <p>🔄 Drag to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
};

export default GlobeComponent;