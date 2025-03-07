import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RentAgreementForm from '../components/rentAgreement/RentAgreementForm';
import { generateAgreement } from '../utils/agreement';
import toast from 'react-hot-toast';

export default function RentAgreement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const result = await generateAgreement(formData);
      
      // Create a text file with the agreement
      const blob = new Blob([result.agreement], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rental-agreement.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Rent agreement generated successfully!');
    } catch (error: any) {
      console.error('Error generating agreement:', error);
      toast.error(error.message || 'Failed to generate agreement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Generate Rent Agreement</h1>
        <RentAgreementForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
}