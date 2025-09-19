const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-cyan-400 text-2xl font-bold">MN</h1>
        <div className="flex gap-6">
          <a href="#about" className="text-white hover:text-cyan-400">About</a>
          <a href="#experience" className="text-white hover:text-cyan-400">Experience</a>
          <a href="#skills" className="text-white hover:text-cyan-400">Skills</a>
          <a href="#contact" className="text-white hover:text-cyan-400">Contact</a>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;