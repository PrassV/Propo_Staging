import { FileText, PiggyBank, Coins, MapPin, Users, RefreshCw } from 'lucide-react';
import BenefitCard from './BenefitCard';

const Benefits = () => {
  const benefits = [
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
    {
      icon: <MapPin />,
      title: "Choice Position",
      description: "We connect exceptional candidates with coveted positions across various industries."
    },
    {
      icon: <Users />,
      title: "The Choice of Many",
      description: "World of options, our service stands as the choice of many. Discover why we're trusted by a diverse clientele for their needs."
    },
    {
      icon: <RefreshCw />,
      title: "Cost-effective",
      description: "Without compromising quality, cost-effective options offer practical and sustainable benefits."
    }
  ];

  return (
    <div className="py-20 px-8">
      <h2 className="text-4xl font-bold text-center mb-12 tracking-wide">
        The Benefits of Choosing Our Real Estate Offerings
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {benefits.map((benefit, index) => (
          <BenefitCard key={index} {...benefit} />
        ))}
      </div>
    </div>
  );
};

export default Benefits;