const SearchBar = () => {
  return (
    <div className="bg-yellow-100 p-6 rounded-lg space-y-4">
      <div className="flex space-x-4">
        <button className="bg-black text-white px-6 py-2 rounded tracking-wide">Buy</button>
        <button className="hover:bg-black hover:text-white px-6 py-2 rounded transition-colors tracking-wide">Rent</button>
        <button className="hover:bg-black hover:text-white px-6 py-2 rounded transition-colors tracking-wide">Sold</button>
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
        <button className="bg-red-200 text-black px-8 py-2 rounded tracking-wide">
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;