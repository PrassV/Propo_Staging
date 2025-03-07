import { Calculator, FileText, UserCheck, Receipt, Wrench, Building2, Eye, ArrowLeftRight } from 'lucide-react';

const Features = () => {
  const features = [
    { icon: Calculator, title: "AI Based Rent Estimation" },
    { icon: UserCheck, title: "Tenant Scouting & Verification" },
    { icon: Receipt, title: "Bill & Tax Payments" },
    { icon: Building2, title: "Rent Collection & Management" },
    { icon: Wrench, title: "Maintenance & Repairs" },
    { icon: Eye, title: "Regular Monitoring & Inspection" },
    { icon: ArrowLeftRight, title: "Hassle-free Advance Return" },
    { icon: Building2, title: "Property Inspection" }
  ];

  const advantages = [
    {
      title: "Local Expertise",
      description: "Deep understanding of the Indian real estate market and local regulations."
    },
    {
      title: "Transparent Communication",
      description: "Regular updates and open communication with property owners."
    },
    {
      title: "Efficient Processes",
      description: "Streamlined systems for rent collection, maintenance, and other key processes."
    },
    {
      title: "Maximized Returns",
      description: "Strategies to optimize rental income and minimize expenses."
    },
    {
      title: "Peace of Mind",
      description: "Enjoy hassle-free property ownership knowing your investment is in capable hands."
    }
  ];

  return (
    <div className="py-20 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <feature.icon className="w-10 h-10 mb-4 text-black" />
                <h3 className="font-semibold">{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Advantages Section */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-12">The Propo Advantage</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {advantages.map((advantage, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-3">{advantage.title}</h3>
                <p className="text-gray-600">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;