import { Suspense, useState } from 'react';
import Globe from './components/Globe/Globe';
import EnhancedGlobe from './components/Globe/EnhancedGlobe';
import CartoonGlobe from './components/Globe/CartoonGlobe';
import CityExplorer from './components/City/CityExplorer';
import Navigation from './components/UI/Navigation';
import type { Location } from './types';

type GlobeMode = 'basic' | 'enhanced' | 'cartoon';
type AppMode = 'globe' | 'city';

function App() {
  const [globeMode, setGlobeMode] = useState<GlobeMode>('cartoon');
  const [appMode, setAppMode] = useState<AppMode>('globe');
  const [selectedCity, setSelectedCity] = useState<Location | null>(null);

  const handleCityExploration = (location: Location) => {
    setSelectedCity(location);
    setAppMode('city');
  };

  const handleBackToGlobe = () => {
    setAppMode('globe');
    setSelectedCity(null);
  };

  const cycleGlobeMode = () => {
    const modes: GlobeMode[] = ['basic', 'enhanced', 'cartoon'];
    const currentIndex = modes.indexOf(globeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setGlobeMode(modes[nextIndex]);
  };

  const getModeEmoji = () => {
    switch (globeMode) {
      case 'basic': return '🌎';
      case 'enhanced': return '🌍';
      case 'cartoon': return '🎮';
      default: return '🌍';
    }
  };

  const getModeLabel = () => {
    switch (globeMode) {
      case 'basic': return 'Basic';
      case 'enhanced': return 'HD Realistic';
      case 'cartoon': return 'Game Mode';
      default: return 'Enhanced';
    }
  };

  if (appMode === 'city' && selectedCity) {
    return <CityExplorer location={selectedCity} onBack={handleBackToGlobe} />;
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Navigation />

      {/* Globe Mode Toggle - moved to bottom right */}
      <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
        <button
          onClick={cycleGlobeMode}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-white text-white rounded-xl hover:scale-105 transition-all text-sm font-bold shadow-lg"
        >
          {getModeEmoji()} {getModeLabel()}
        </button>

        {/* Mode description */}
        <div className="bg-black/80 text-white text-xs rounded-lg px-3 py-2 max-w-48 text-center">
          {globeMode === 'cartoon' && '🎮 Game-like experience with city exploration!'}
          {globeMode === 'enhanced' && '🌍 Realistic HD textures with real-time sun positioning'}
          {globeMode === 'basic' && '🌎 Simple, clean globe interface'}
        </div>
      </div>

      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-spin">🌍</div>
            <div className="text-white text-2xl font-bold">Loading Your World...</div>
          </div>
        </div>
      }>
        {globeMode === 'basic' && <Globe />}
        {globeMode === 'enhanced' && <EnhancedGlobe />}
        {globeMode === 'cartoon' && <CartoonGlobe onCityExplore={handleCityExploration} />}
      </Suspense>
    </div>
  );
}

export default App;