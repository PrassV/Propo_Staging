import { useState } from 'react';
import { CreditCard, Smartphone } from 'lucide-react';

interface PaymentPlan {
  type: 'card' | 'mobile';
  status: string;
  number: string;
  lastUsed: string;
  holderName: string;
}

interface PaymentPlansProps {
  tenantData: any;
}

export default function PaymentPlans({ tenantData }: PaymentPlansProps) {
  const [paymentPlans] = useState<PaymentPlan[]>([
    {
      type: 'card',
      status: 'Active',
      number: 'XXXX-XXXX-XXXX',
      lastUsed: new Date().toLocaleDateString(),
      holderName: tenantData.name
    },
    {
      type: 'mobile',
      status: 'Active',
      number: tenantData.phone || 'N/A',
      lastUsed: new Date().toLocaleDateString(),
      holderName: tenantData.name
    }
  ]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Your Payment Plan</h2>
      <p className="text-sm text-gray-600 mb-4">Please Select one during payment</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentPlans.map((plan, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              {plan.type === 'card' ? <CreditCard /> : <Smartphone />}
              <span className={`text-sm ${plan.status === 'Active' ? 'text-green-600' : 'text-gray-600'}`}>
                {plan.status}
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {plan.type === 'card' ? 'Card No:' : 'Phone No:'} {plan.number}
              </p>
              <p className="text-sm text-gray-600">Last Used: {plan.lastUsed}</p>
              <p className="text-sm text-gray-600">Holder's Name: {plan.holderName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}