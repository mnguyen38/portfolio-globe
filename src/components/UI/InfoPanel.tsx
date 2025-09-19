import type { Location } from '../../types';

interface InfoPanelProps {
  location: Location | null;
  isVisible: boolean;
}

const InfoPanel = ({ location, isVisible }: InfoPanelProps) => {
  if (!isVisible || !location) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 w-96 bg-black/90 border border-cyan-400 p-6 m-6">
      <h2 className="text-cyan-400 text-2xl mb-2">{location.name}</h2>
      <h3 className="text-white text-lg">{location.role}</h3>
      <p className="text-gray-400">{location.company}</p>
      <p className="text-gray-500 text-sm mt-2">{location.period}</p>
    </div>
  );
};

export default InfoPanel;