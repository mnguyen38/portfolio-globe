import { Suspense } from 'react';
import Globe from './components/Globe/Globe';
import Navigation from './components/UI/Navigation';

function App() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Navigation />
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-cyan-400 text-2xl">Loading Globe...</div>
        </div>
      }>
        <Globe />
      </Suspense>
    </div>
  );
}

export default App;