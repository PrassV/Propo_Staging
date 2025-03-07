import { Home, Building2, FileText } from 'lucide-react';
import PropertyService from './PropertyService';
import ApartmentType from './ApartmentType';

const Features = () => {
  const services = [
    {
      title: "Secure a property",
      description: "Ideal real estate investment, giving you peace of mind in your property search journey.",
      buttonText: "Find a Home",
      icon: <Home size={32} />,
      circleColor: "bg-yellow-200"
    },
    {
      title: "Convey a Property",
      description: "Empowers you to make strategic decisions that can shape your financial future.",
      buttonText: "Find a Property",
      icon: <Building2 size={32} />,
      circleColor: "bg-red-200"
    },
    {
      title: "Hire a Property",
      description: "Ownership allows tailored flexibility to meet specific needs and preferences.",
      buttonText: "Find a Rental",
      icon: <FileText size={32} />,
      circleColor: "bg-blue-200"
    }
  ];

  const apartmentTypes = [
    { title: "Villa", count: 25, icon: <Home size={32} />, circleColor: "bg-red-200" },
    { title: "Townhome", count: 10, icon: <Building2 size={32} />, circleColor: "bg-yellow-200" },
    { title: "Office", count: 18, icon: <Building2 size={32} />, circleColor: "bg-blue-200" },
    { title: "Factory", count: 22, icon: <Building2 size={32} />, circleColor: "bg-green-200" }
  ];

  return (
    <div className="bg-black text-white py-20 px-8">
      <div className="max-w-6xl mx-auto space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {services.map((service, index) => (
            <PropertyService key={index} {...service} />
          ))}
        </div>

        <div className="text-center space-y-12">
          <h2 className="text-4xl font-bold tracking-wide">Universe of Apartment Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {apartmentTypes.map((type, index) => (
              <ApartmentType key={index} {...type} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;