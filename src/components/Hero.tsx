const Hero = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto">
      <div className="md:w-1/2 space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold leading-tight">
            Simplify Your Property Management with Propo.
          </h1>
          <p className="text-xl text-gray-600">
            Streamline your property operations, manage tenants efficiently, and maximize your real estate investments all in one place.
          </p>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg space-y-4">
          <div className="flex space-x-4">
            <button className="bg-black text-white px-6 py-2 rounded">Buy</button>
            <button className="hover:bg-black hover:text-white px-6 py-2 rounded transition-colors">Rent</button>
            <button className="hover:bg-black hover:text-white px-6 py-2 rounded transition-colors">Sold</button>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Keyword"
              className="flex-1 p-3 border rounded bg-white"
            />
            <input
              type="text"
              placeholder="Type"
              className="flex-1 p-3 border rounded bg-white"
            />
            <button className="bg-red-200 text-black px-8 py-2 rounded">
              Search
            </button>
          </div>
        </div>
      </div>
      
      <div className="md:w-1/2 mt-8 md:mt-0">
        <img
          src="https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1296&q=80"
          alt="House with keys"
          className="rounded-full"
        />
      </div>
    </div>
  );
};

export default Hero;