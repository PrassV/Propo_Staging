import SearchBar from './SearchBar';

const Hero = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto">
      <div className="md:w-1/2 space-y-8">
        <h1 className="text-6xl font-bold leading-tight tracking-wide">
          Simplify Your Property Management with Propify.
        </h1>
        <p className="text-gray-600 text-xl tracking-wide">
          Streamline your property operations, manage tenants efficiently, and maximize your real estate investments all in one place.
        </p>
        <SearchBar />
      </div>
      
      <div className="md:w-1/2 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200 rounded-full -z-10 blur-3xl opacity-50"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-green-200 rounded-full -z-10 blur-3xl opacity-50"></div>
        <div className="absolute top-40 right-40 w-64 h-64 bg-yellow-200 rounded-full -z-10 blur-3xl opacity-50"></div>
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"
          alt="Modern building"
          className="rounded-full relative z-10"
        />
      </div>
    </div>
  );
};

export default Hero;