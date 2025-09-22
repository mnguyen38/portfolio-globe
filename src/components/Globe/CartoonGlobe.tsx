import { useRef, useEffect, useState, useMemo, memo } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { locations } from '../../data/locations';
import type { Location } from '../../types';

interface CityMarker extends Location {
  pulseOffset: number;
  isHovered: boolean;
  bouncePhase: number;
}

interface CartoonGlobeProps {
  onCityExplore?: (location: Location) => void;
}

const CartoonGlobe: React.FC<CartoonGlobeProps> = ({ onCityExplore }) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cityMarkers, setCityMarkers] = useState<CityMarker[]>([]);
  const [globeMaterial, setGlobeMaterial] = useState<THREE.Material | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Memoized sun info to prevent re-renders
  const sunInfo = useMemo(() => ({
    utcTime: currentTime.toUTCString().split(' ')[4],
    dayOfYear: Math.floor((currentTime - new Date(currentTime.getFullYear(), 0, 0)) / 86400000)
  }), [currentTime]);
  // const sunState = useSunPosition(); // Disabled for cartoon mode

  // Initialize city markers with animation properties
  useEffect(() => {
    const markers = locations.map((location, index) => ({
      ...location,
      pulseOffset: index * (Math.PI / 3),
      isHovered: false,
      bouncePhase: Math.random() * Math.PI * 2
    }));
    setCityMarkers(markers);
  }, []);

  // Memoized arcs for performance - computed once
  const arcs = useMemo(() => {
    const viet = locations[2];
    const germany = locations[1];
    const boston = locations[0];

    return [
      {
        startLat: viet.coordinates[0],
        startLng: viet.coordinates[1],
        endLat: germany.coordinates[0],
        endLng: germany.coordinates[1],
        color: ['#FF6B6B', '#4ECDC4'],
        strokeWidth: 3
      },
      {
        startLat: germany.coordinates[0],
        startLng: germany.coordinates[1],
        endLat: boston.coordinates[0],
        endLng: boston.coordinates[1],
        color: ['#45B7D1', '#96CEB4'],
        strokeWidth: 3
      }
    ];
  }, []); // Empty dependency array since locations is static

  // Create cartoon-style material with texture and real-time sun positioning
  useEffect(() => {
    const loader = new THREE.TextureLoader();

    const calculateSunPosition = () => {
      const now = new Date();

      // Calculate solar declination (Earth's tilt effect)
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      const declination = -23.45 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365.25) * Math.PI / 180;

      // Calculate hour angle (longitude where sun is directly overhead)
      const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
      const hourAngle = (hours - 12) * 15 * Math.PI / 180; // Convert to radians

      // Convert to 3D direction vector
      const sunLongitude = -hourAngle; // Negative because we want sun direction, not position
      const sunLatitude = declination;

      // Convert spherical coordinates to Cartesian
      const x = Math.cos(sunLatitude) * Math.cos(sunLongitude);
      const y = Math.sin(sunLatitude);
      const z = Math.cos(sunLatitude) * Math.sin(sunLongitude);

      return new THREE.Vector3(x, y, z).normalize();
    };

    loader.load('/textures/hd/2k_earth_daymap.jpg', (texture) => {
      // Create a cartoon-style material
      const material = new THREE.ShaderMaterial({
        uniforms: {
          earthTexture: { value: texture },
          sunDirection: { value: calculateSunPosition() },
          cartoonLevels: { value: 6.0 }, // Number of color levels for toon shading
          saturation: { value: 1.8 }, // Increase saturation for cartoon look
          brightness: { value: 1.2 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vWorldPosition;
          varying vec3 vLocalPosition;

          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            vLocalPosition = position; // Local sphere position for sun calculation
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D earthTexture;
          uniform vec3 sunDirection;
          uniform float cartoonLevels;
          uniform float saturation;
          uniform float brightness;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vLocalPosition;

          void main() {
            // Sample the earth texture
            vec3 earthColor = texture2D(earthTexture, vUv).rgb;

            // Simplified saturation enhancement - no HSV conversion for performance
            float luminance = dot(earthColor, vec3(0.299, 0.587, 0.114));
            earthColor = mix(vec3(luminance), earthColor, saturation);
            earthColor *= brightness;
            earthColor = clamp(earthColor, 0.0, 1.0);

            // Calculate lighting using local sphere position (so it rotates with the globe)
            vec3 normalizedLocalPos = normalize(vLocalPosition);
            float lightDot = dot(normalizedLocalPos, sunDirection);

            // Simplified toon shading - fewer calculations
            float toonLight = max(0.2, floor((lightDot + 1.0) * 0.5 * cartoonLevels) / cartoonLevels);

            // Apply cartoon lighting
            vec3 finalColor = earthColor * toonLight;

            // Simplified rim lighting
            float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
            finalColor += vec3(0.3, 0.6, 1.0) * rim * rim * 0.3;

            // Simplified posterization
            finalColor = floor(finalColor * cartoonLevels) / cartoonLevels;

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: false
      });

      setGlobeMaterial(material);

      // Update sun position every 5 minutes
      const updateSunPosition = () => {
        const newSunPosition = calculateSunPosition();
        if (material.uniforms && material.uniforms.sunDirection) {
          material.uniforms.sunDirection.value = newSunPosition;
        }
        setCurrentTime(new Date());
      };

      // Set up interval to update sun position every 5 minutes
      const sunUpdateInterval = setInterval(updateSunPosition, 5 * 60 * 1000);

      // Cleanup interval and dispose material when component unmounts
      return () => {
        clearInterval(sunUpdateInterval);
        if (material) {
          material.dispose();
        }
        if (texture) {
          texture.dispose();
        }
      };
    });
  }, []);

  // Optimized city marker animations - reduce frequency to 30fps instead of 60fps
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let frameCounter = 0;

    const animate = () => {
      frameCounter++;

      // Only update every other frame (30fps instead of 60fps)
      if (frameCounter % 2 === 0) {
        setCityMarkers(prev => prev.map(marker => ({
          ...marker,
          bouncePhase: marker.bouncePhase + 0.005 // Even slower bounce for performance
        })));
      }

      // Use setTimeout for lower frequency instead of requestAnimationFrame
      intervalId = setTimeout(animate, 33); // ~30fps
    };

    animate();

    return () => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
    };
  }, []);

  // Initialize globe settings
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false; // Stop auto rotation
      globeEl.current.controls().enableZoom = true;
      globeEl.current.controls().minDistance = 150;
      globeEl.current.controls().maxDistance = 600;

      // Stable initial view
      globeEl.current.pointOfView({
        lat: 20,
        lng: 0,
        altitude: 2.8
      });
    }
  }, []);

  // Handle city selection with transition animation
  const handleCityJump = async (point: object) => {
    const location = point as Location;
    setIsTransitioning(true);

    if (globeEl.current) {
      // Stop auto rotation
      globeEl.current.controls().autoRotate = false;

      // Zoom into the city with dramatic camera movement
      await new Promise(resolve => {
        globeEl.current?.pointOfView({
          lat: location.coordinates[0],
          lng: location.coordinates[1],
          altitude: 0.5 // Very close zoom
        }, 2000);

        setTimeout(resolve, 2000);
      });

      // Set selected location after zoom
      setSelectedLocation(location);
      setIsTransitioning(false);
    }
  };

  // Reset to globe view
  const handleBackToGlobe = () => {
    if (globeEl.current) {
      setSelectedLocation(null);
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({
        lat: 20,
        lng: 0,
        altitude: 2.8
      }, 1500);
    }
  };

  // Optimized city marker rendering - pre-calculate animations and memoize
  const cityMarkerProps = useMemo(() => {
    return cityMarkers.map(marker => {
      const bounce = Math.sin(marker.bouncePhase) * 0.005;
      return {
        lat: marker.coordinates[0],
        lng: marker.coordinates[1],
        altitude: 0.03 + bounce,
        size: 0.48, // Fixed size for better performance
        color: '#FF6B6B',
        marker // Keep reference for click handling
      };
    });
  }, [cityMarkers]);

  // Simplified marker accessors using pre-calculated values
  const getMarkerLat = (d: { lat: number }) => d.lat;
  const getMarkerLng = (d: { lng: number }) => d.lng;
  const getMarkerAltitude = (d: { altitude: number }) => d.altitude;
  const getMarkerSize = (d: { size: number }) => d.size;
  const getMarkerColor = (d: { color: string }) => d.color;

  return (
    <div className="w-full h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Optimized background stars using CSS background pattern */}
      <div
        className="absolute inset-0 overflow-hidden opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 10% 20%, white 1px, transparent 2px),
            radial-gradient(1px 1px at 25% 15%, white 1px, transparent 2px),
            radial-gradient(3px 3px at 80% 30%, white 1px, transparent 2px),
            radial-gradient(1px 1px at 60% 10%, white 1px, transparent 2px),
            radial-gradient(2px 2px at 90% 70%, white 1px, transparent 2px),
            radial-gradient(1px 1px at 5% 80%, white 1px, transparent 2px),
            radial-gradient(2px 2px at 40% 5%, white 1px, transparent 2px),
            radial-gradient(1px 1px at 75% 85%, white 1px, transparent 2px)
          `,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="text-white text-3xl font-bold animate-bounce">
            🚀 Jumping to {selectedLocation?.name}...
          </div>
        </div>
      )}

      {/* Cartoon Globe */}
      <Globe
        ref={globeEl}
        globeMaterial={globeMaterial}
        globeImageUrl={globeMaterial ? undefined : "/textures/hd/2k_earth_daymap.jpg"}
        backgroundImageUrl={undefined}
        backgroundColor="rgba(0,0,0,0)"

        // Optimized city markers
        pointsData={cityMarkerProps}
        pointLat={getMarkerLat}
        pointLng={getMarkerLng}
        pointAltitude={getMarkerAltitude}
        pointRadius={getMarkerSize}
        pointColor={getMarkerColor}
        pointLabel={(d: CityMarkerWithProps) => `
          <div style="
            color: white;
            background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
            padding: 12px;
            border-radius: 12px;
            border: 3px solid white;
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
            font-family: 'Comic Sans MS', cursive;
            text-align: center;
          ">
            <div style="font-size: 18px; font-weight: bold;">🏙️ ${d.marker.name}</div>
            <div style="font-size: 14px; margin: 4px 0;">${d.marker.role}</div>
            <div style="font-size: 12px; color: #FFE066;">${d.marker.company}</div>
            <div style="font-size: 11px; margin-top: 8px; color: #B0E0E6;">
              🎮 Click to explore this city!
            </div>
          </div>
        `}
        onPointClick={(point: CityMarkerWithProps) => handleCityJump(point.marker)}

        // Stylized arcs - elevated above surface
        arcsData={arcs}
        arcColor={'color'}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={(d: { strokeWidth: number }) => d.strokeWidth}
        arcAltitude={0.2} // Lift arcs above globe surface
        arcAltitudeAutoScale={0.5}

        // Enhanced atmosphere with cartoon colors
        atmosphereColor="#FFB6C1"
        atmosphereAltitude={0.15}
      />

      {/* Game-style UI - moved down to avoid nav overlap */}
      <div className="absolute top-20 left-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 border-4 border-white shadow-2xl">
        <h1 className="text-white text-2xl font-bold mb-2">🌍 Career Globe</h1>
        <div className="text-white/90 text-sm space-y-1">
          <p>🎯 Click cities to explore!</p>
          <p>🎮 Drag to rotate • Scroll to zoom</p>
          <p>✨ {cityMarkers.length} Adventures await</p>
        </div>
      </div>

      {/* Real-time sun info */}
      <div className="absolute top-20 right-6 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-4 border-4 border-white shadow-2xl">
        <h2 className="text-white text-lg font-bold mb-2">☀️ Real-time Sun</h2>
        <div className="text-white/90 text-sm space-y-1">
          <p>🕐 UTC: {sunInfo.utcTime}</p>
          <p>📅 Day: {sunInfo.dayOfYear}/365</p>
          <p>🌍 Updates every 5 min</p>
        </div>
      </div>

      {/* City exploration panel */}
      {selectedLocation && !isTransitioning && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-2xl mx-4 shadow-2xl border-4 border-yellow-400">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                🏙️ Welcome to {selectedLocation.name}!
              </h2>
              <div className="text-xl text-gray-600 mb-6">
                {selectedLocation.role} at {selectedLocation.company}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">🎯 Mission</h3>
                  <p className="text-gray-700">{selectedLocation.description}</p>
                </div>

                <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">⚡ Skills Acquired</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLocation.skills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm rounded-full font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleBackToGlobe}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  🌍 Back to Globe
                </button>

                <button
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                  onClick={() => {
                    if (onCityExplore && selectedLocation) {
                      onCityExplore(selectedLocation);
                    }
                  }}
                >
                  🚶‍♂️ Explore City
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fun floating UI elements - moved to left side */}
      <div className="absolute bottom-6 left-6 flex gap-3">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-3 shadow-lg">
          <span className="text-2xl">🎮</span>
        </div>
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-full p-3 shadow-lg">
          <span className="text-2xl">✨</span>
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(CartoonGlobe);