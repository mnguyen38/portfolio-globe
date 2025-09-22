import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Plane } from '@react-three/drei';
import * as THREE from 'three';
import type { Location } from '../../types';

interface CityExplorerProps {
  location: Location;
  onBack: () => void;
}

// Animated building component
function Building({ position, height, color }: { position: [number, number, number], height: number, color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
    }
  });

  return (
    <Box
      ref={meshRef}
      position={position}
      scale={[1, height, 1]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} />
    </Box>
  );
}

// Project showcase component
function ProjectShowcase({ position, title, onClick }: {
  position: [number, number, number],
  title: string,
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <Sphere
        scale={hovered ? 1.2 : 1}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={onClick}
      >
        <meshStandardMaterial
          color={hovered ? '#FFD700' : '#4ECDC4'}
          emissive={hovered ? '#333' : '#000'}
        />
      </Sphere>
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
    </group>
  );
}

// 3D City Scene
function CityScene({ location }: { location: Location }) {
  const buildings = [
    { pos: [-5, 1, -5], height: 2, color: '#FF6B6B' },
    { pos: [-2, 1.5, -3], height: 3, color: '#4ECDC4' },
    { pos: [2, 1, -4], height: 2, color: '#45B7D1' },
    { pos: [5, 2, -2], height: 4, color: '#96CEB4' },
    { pos: [-3, 1, 2], height: 2, color: '#FFEAA7' },
    { pos: [1, 1.5, 3], height: 3, color: '#DDA0DD' },
    { pos: [4, 1, 1], height: 2, color: '#98D8C8' },
  ];

  const projects = [
    { pos: [-4, 1, 0], title: 'Project Alpha' },
    { pos: [0, 1, -2], title: 'Project Beta' },
    { pos: [3, 1, 2], title: 'Project Gamma' },
  ];

  return (
    <>
      {/* Ground */}
      <Plane
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        args={[20, 20]}
        receiveShadow
      >
        <meshStandardMaterial color="#90EE90" />
      </Plane>

      {/* Buildings */}
      {buildings.map((building, index) => (
        <Building
          key={index}
          position={building.pos as [number, number, number]}
          height={building.height}
          color={building.color}
        />
      ))}

      {/* Project showcases */}
      {projects.map((project, index) => (
        <ProjectShowcase
          key={index}
          position={project.pos as [number, number, number]}
          title={project.title}
          onClick={() => alert(`Exploring ${project.title} - Coming soon!`)}
        />
      ))}

      {/* City sign */}
      <Text
        position={[0, 5, -8]}
        fontSize={2}
        color="#FF6B6B"
        anchorX="center"
        anchorY="middle"
      >
        Welcome to {location.name}!
      </Text>

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
}

const CityExplorer: React.FC<CityExplorerProps> = ({ location, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏗️</div>
          <div className="text-white text-2xl font-bold">Building {location.name}...</div>
          <div className="text-white/70 text-lg mt-2">Preparing your virtual experience</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      {/* 3D City Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 60 }}
        className="bg-gradient-to-b from-blue-400 to-blue-600"
      >
        <CityScene location={location} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={20}
          minDistance={3}
        />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🏙️ {location.name}</h2>
        <p className="text-gray-600 mb-2">{location.role}</p>
        <p className="text-sm text-gray-500">{location.company}</p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
        <h3 className="font-bold text-gray-800 mb-2">🎮 Controls</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>🖱️ Drag to rotate view</p>
          <p>🔄 Scroll to zoom</p>
          <p>✨ Click glowing orbs to explore projects</p>
        </div>
      </div>

      {/* Back button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          🌍 Back to Globe
        </button>
      </div>

      {/* Skills showcase */}
      <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl max-w-xs">
        <h3 className="font-bold text-gray-800 mb-2">⚡ Skills Used</h3>
        <div className="flex flex-wrap gap-2">
          {location.skills.map((skill) => (
            <span key={skill} className="px-2 py-1 bg-gradient-to-r from-blue-400 to-purple-400 text-white text-xs rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Achievement badge */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-4 shadow-lg animate-pulse">
          <div className="text-3xl">🏆</div>
        </div>
        <div className="text-center mt-2 text-white font-bold text-sm bg-black/50 rounded-lg px-2 py-1">
          Achievement<br/>Unlocked!
        </div>
      </div>
    </div>
  );
};

export default CityExplorer;