const Loading = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-cyan-400 mt-4 text-lg">Initializing Globe...</p>
    </div>
  );
};

export default Loading;