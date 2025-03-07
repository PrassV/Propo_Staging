interface PropertyServiceProps {
  title: string;
  description: string;
  buttonText: string;
  icon: JSX.Element;
  circleColor: string;
}

const PropertyService = ({ title, description, buttonText, icon, circleColor }: PropertyServiceProps) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className={`absolute -top-2 -left-2 w-12 h-12 ${circleColor} rounded-full`} />
        <div className="relative z-10 text-white">{icon}</div>
      </div>
      <h3 className="text-2xl font-semibold tracking-wide text-white">{title}</h3>
      <p className="text-gray-400 tracking-wide">
        {description}
      </p>
      <button className="bg-black text-white border border-white px-6 py-2 rounded tracking-wide hover:bg-white hover:text-black transition-colors">
        {buttonText}
      </button>
    </div>
  );
};

export default PropertyService;