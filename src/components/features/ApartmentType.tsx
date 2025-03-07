interface ApartmentTypeProps {
  icon: JSX.Element;
  title: string;
  count: number;
  circleColor: string;
}

const ApartmentType = ({ icon, title, count, circleColor }: ApartmentTypeProps) => {
  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="relative">
        <div className={`absolute -top-2 -left-2 w-12 h-12 ${circleColor} rounded-full`} />
        <div className="relative z-10 text-white">{icon}</div>
      </div>
      <h3 className="mt-4 font-semibold text-white tracking-wide text-xl">{title}</h3>
      <p className="text-gray-400">{count} Property</p>
    </div>
  );
};

export default ApartmentType;