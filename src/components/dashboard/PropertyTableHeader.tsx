export default function PropertyTableHeader() {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Property</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Location</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Units</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tenants</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
      </tr>
    </thead>
  );
}