import { FileText, PiggyBank, Coins, MapPin, Users, RefreshCw } from 'lucide-react';

const Benefits = () => {
  return (
    <div className="py-20 px-8">
      <h2 className="text-4xl font-bold text-center mb-12">
        The Benefits of Choosing Our Real Estate Offerings
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {[
          {
            icon: <FileText />,
            title: "Policy",
            description: "Satisfaction of our clients trust us to provide a safe and reliable environment for all your real estate needs."
          },
          {
            icon: <PiggyBank />,
            title: "Value for money",
            description: "Getting the best quality or service for your budget, ensuring a smart and economical choice."
          },
          {
            icon: <Coins />,
            title: "Lowest Service Costs",
            description: "Experience unmatched value with our services at the lowest cost. We prioritize affordability without compromising quality."
          },
          // Add more benefits
        ].map((benefit, index) => (
          <div key={index} className="border p-6 rounded-lg">
            <div className="relative mb-4">
              <div className="absolute -top-2 -left-2 w-12 h-12 bg-yellow-200 rounded-full" />
              <div className="relative z-10">{benefit.icon}</div>
            </div>
            <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
            <p className="text-gray-600">{benefit.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Benefits;