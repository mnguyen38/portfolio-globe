import { useRef, useEffect, useState, useMemo } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { locations } from '../../data/locations';
import { useSunPosition } from '../../hooks/useSunPosition';
import { fetchCountriesData, type CountryData } from '../../utils/geoData';
import type { Location } from '../../types';

const EnhancedGlobe = () => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [enableHighDetail, setEnableHighDetail] = useState(false);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [showCountries, setShowCountries] = useState(false);
  const sunState = useSunPosition();

  // Create arcs between locations
  const arcs = useMemo(() => [
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
  ], []);

  // Custom material with day/night blending
  const globeMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: null },
        nightTexture: { value: null },
        cloudsTexture: { value: null },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        sunIntensity: { value: sunState.sunIntensity },
        atmosphereStrength: { value: 0.1 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D cloudsTexture;
        uniform vec3 sunDirection;
        uniform float sunIntensity;
        uniform float atmosphereStrength;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          vec3 clouds = texture2D(cloudsTexture, vUv).rgb;

          // Calculate lighting based on sun direction
          float sunDot = dot(vNormal, sunDirection);
          float dayNightMix = smoothstep(-0.1, 0.1, sunDot);

          // Blend day and night textures
          vec3 earthColor = mix(nightColor * 0.3, dayColor, dayNightMix);

          // Add clouds with transparency
          earthColor = mix(earthColor, clouds, 0.4 * dayNightMix);

          // Add atmospheric glow
          float atmosphere = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          earthColor += vec3(0.3, 0.6, 1.0) * atmosphere * atmosphereStrength;

          gl_FragColor = vec4(earthColor, 1.0);
        }
      `
    });

    return material;
  }, [sunState.sunIntensity]);

  // Load textures and country data
  useEffect(() => {
    const loader = new THREE.TextureLoader();

    // Load HD textures
    Promise.all([
      loader.loadAsync('/textures/hd/2k_earth_daymap.jpg'),
      loader.loadAsync('/textures/hd/2k_earth_nightmap.jpg'),
      loader.loadAsync('/textures/hd/2k_earth_clouds.jpg')
    ]).then(([dayTexture, nightTexture, cloudsTexture]) => {
      if (globeMaterial.uniforms) {
        globeMaterial.uniforms.dayTexture.value = dayTexture;
        globeMaterial.uniforms.nightTexture.value = nightTexture;
        globeMaterial.uniforms.cloudsTexture.value = cloudsTexture;
        setEnableHighDetail(true);
      }
    }).catch(error => {
      console.warn('Failed to load HD textures, falling back to standard:', error);
    });

    // Load country boundaries
    fetchCountriesData().then(countryData => {
      setCountries(countryData);
      setShowCountries(true);
    }).catch(error => {
      console.warn('Failed to load country boundaries:', error);
    });
  }, [globeMaterial]);

  // Update sun direction based on real sun position
  useEffect(() => {
    if (sunState.position && globeMaterial.uniforms) {
      const sunDir = new THREE.Vector3();
      sunDir.setFromSphericalCoords(
        1,
        Math.PI / 2 - sunState.position.altitude,
        sunState.position.azimuth
      );
      globeMaterial.uniforms.sunDirection.value = sunDir;
      globeMaterial.uniforms.sunIntensity.value = sunState.sunIntensity;
    }
  }, [sunState, globeMaterial]);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.3;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.controls().minDistance = 120; // Allow closer zoom
      globeEl.current.controls().maxDistance = 800;

      // Set initial view to user's location if available
      if (sunState.userLocation) {
        globeEl.current.pointOfView({
          lat: sunState.userLocation.latitude,
          lng: sunState.userLocation.longitude,
          altitude: 2.5
        });
      } else {
        globeEl.current.pointOfView({ lat: 30, lng: -50, altitude: 2.5 });
      }
    }
  }, [sunState.userLocation]);

  const handleLocationClick = (point: object) => {
    const location = point as Location;
    setSelectedLocation(location);
    if (globeEl.current && location) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({
        lat: location.coordinates[0],
        lng: location.coordinates[1],
        altitude: 1.2 // Closer zoom for detail
      }, 1500);
    }
  };

  const resetView = () => {
    setSelectedLocation(null);
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      const target = sunState.userLocation || { latitude: 30, longitude: -50 };
      globeEl.current.pointOfView({
        lat: target.latitude,
        lng: target.longitude,
        altitude: 2.5
      }, 1500);
    }
  };

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Loading overlay */}
      {sunState.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-cyan-400 text-2xl">Calculating sun position...</div>
        </div>
      )}

      {/* Globe */}
      <Globe
        ref={globeEl}
        globeImageUrl={enableHighDetail ? undefined : "/textures/earth-night.jpg"}
        globeMaterial={enableHighDetail ? globeMaterial : undefined}
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

        // Points (locations)
        pointsData={locations}
        pointLat={(d: object) => (d as Location).coordinates[0]}
        pointLng={(d: object) => (d as Location).coordinates[1]}
        pointColor={() => '#00ffff'}
        pointAltitude={0.01}
        pointRadius={0.2}
        pointLabel={(d: object) => {
          const location = d as Location;
          return `
            <div style="color: white; background: rgba(0,0,0,0.9); padding: 8px; border-radius: 4px; border: 1px solid #00ffff;">
              <div style="font-weight: bold; font-size: 14px;">${location.name}</div>
              <div style="font-size: 12px; color: #00ffff;">${location.role}</div>
              <div style="font-size: 11px; color: #ccc;">${location.company}</div>
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

        // Enhanced atmosphere
        atmosphereColor={sunState.isDay ? "#87CEEB" : "#191970"}
        atmosphereAltitude={0.12}

        // Country boundaries
        polygonsData={showCountries ? countries : []}
        polygonCapColor={() => 'rgba(0, 255, 255, 0.1)'}
        polygonSideColor={() => 'rgba(0, 255, 255, 0.05)'}
        polygonStrokeColor={() => '#00ffff'}
        polygonLabel={(d: CountryData) => `
          <div style="color: white; background: rgba(0,0,0,0.8); padding: 4px; border-radius: 3px;">
            ${d.name || 'Unknown Country'}
          </div>
        `}

        animateIn={true}
      />

      {/* Info Panel */}
      {selectedLocation && (
        <div className="absolute bottom-10 left-10 bg-black/95 border border-cyan-400 p-6 max-w-md backdrop-blur-sm rounded-lg">
          <button
            onClick={resetView}
            className="absolute top-2 right-2 text-cyan-400 hover:text-white text-lg"
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

      {/* Status Panel */}
      <div className="absolute top-20 left-10 text-white/80 text-sm space-y-1">
        <p>🌍 HD Earth Textures: {enableHighDetail ? '✅' : '⏳'}</p>
        <p>🗺️ Country Boundaries: {showCountries ? '✅' : '⏳'}</p>
        <p>📍 Location: {sunState.userLocation ? `${sunState.userLocation.latitude.toFixed(2)}°, ${sunState.userLocation.longitude.toFixed(2)}°` : 'Detecting...'}</p>
        <p>☀️ Sun Intensity: {(sunState.sunIntensity * 100).toFixed(0)}%</p>
        <p>🌅 Time: {sunState.isDay ? 'Day' : 'Night'}</p>
        <p className="mt-3 text-white/60">🖱️ Click locations • Drag to rotate • Scroll to zoom in close</p>
        <p className="text-white/50 text-xs">Zoom close to see country details and realistic lighting</p>
      </div>

      {/* Error display */}
      {sunState.error && (
        <div className="absolute bottom-10 right-10 bg-red-900/80 border border-red-400 p-4 rounded text-red-200 text-sm">
          ⚠️ {sunState.error}
        </div>
      )}
    </div>
  );
};

export default EnhancedGlobe;