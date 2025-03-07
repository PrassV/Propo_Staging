import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', income: 15000, expense: 3000 },
  { month: 'Feb', income: 18000, expense: 2500 },
  { month: 'Mar', income: 22000, expense: 4000 },
  { month: 'Apr', income: 25000, expense: 3500 },
  { month: 'May', income: 21000, expense: 4500 },
  { month: 'Jun', income: 28000, expense: 5000 },
  { month: 'Jul', income: 26000, expense: 4800 }
];

const PropertyRevenue = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Revenue Overview</h3>
          <p className="text-gray-600">Monthly income and expenses</p>
        </div>
        <select className="border rounded-lg px-3 py-1.5">
          <option>Last 7 months</option>
          <option>Last 12 months</option>
          <option>This year</option>
        </select>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Bar dataKey="income" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Total Income</p>
          <p className="text-2xl font-bold">₹1,55,000</p>
          <p className="text-sm text-green-600">+12.5% from last month</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold">₹27,300</p>
          <p className="text-sm text-red-600">+8.2% from last month</p>
        </div>
      </div>
    </div>
  );
};

export default PropertyRevenue;