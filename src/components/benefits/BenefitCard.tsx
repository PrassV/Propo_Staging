interface BenefitCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

const BenefitCard = ({ icon, title, description }: BenefitCardProps) => {
  return (
    <div className="border p-6 rounded-lg">
      <div className="relative mb-4">
        <div className="absolute -top-2 -left-2 w-12 h-12 bg-yellow-200 rounded-full" />
        <div className="relative z-10">{icon}</div>
      </div>
      <h3 className="text-xl font-semibold mb-2 tracking-wide">{title}</h3>
      <p className="text-gray-600 tracking-wide">{description}</p>
    </div>
  );
};

export default BenefitCard;