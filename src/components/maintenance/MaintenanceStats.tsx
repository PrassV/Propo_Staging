import { Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MaintenanceStats() {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600">Total Requests</p>
            <h3 className="text-3xl font-bold mt-2">24</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Wrench className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className="text-green-600">↑ 12%</span> from last month
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600">In Progress</p>
            <h3 className="text-3xl font-bold mt-2">8</h3>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className="text-yellow-600">5 urgent</span>
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600">Completed</p>
            <h3 className="text-3xl font-bold mt-2">156</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className="text-green-600">↑ 8%</span> completion rate
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600">Emergency</p>
            <h3 className="text-3xl font-bold mt-2">2</h3>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-red-600">Requires immediate attention</p>
        </div>
      </div>
    </div>
  );
}