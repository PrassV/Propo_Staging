import { useState, useEffect } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react'; 
import api from '../../api'; 
import { Report } from '../../api/types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

// Define report types for filtering/display (match backend or define mapping)
const REPORT_TYPES = [
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'expense_report', label: 'Expense Report' },
  { value: 'occupancy_report', label: 'Occupancy Report' },
  { value: 'rent_roll', label: 'Rent Roll' },
  // Add other report types
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>(''); // For filtering

  const fetchReports = async (reportType?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.reporting.getReports(reportType || undefined);
      setReports(response.reports);
    } catch (err: unknown) {
      console.error('Error fetching reports:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load reports';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedType);
  }, [selectedType]); // Refetch when filter changes

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await api.reporting.deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Report deleted.');
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report.');
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      toast.loading('Regenerating report...');
      await api.reporting.regenerateReport(id);
      toast.dismiss();
      toast.success('Report regeneration started. Refresh list shortly.');
      // Optionally trigger a delayed refetch or rely on status update
      setTimeout(() => fetchReports(selectedType), 3000);
    } catch (err) {
      toast.dismiss();
      console.error('Error regenerating report:', err);
      toast.error('Failed to start report regeneration.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        {/* TODO: Add button/modal for creating/scheduling new reports */}
        <button className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          <span>Generate New Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label htmlFor="reportTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Type:</label>
        <select
          id="reportTypeFilter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="p-2 border rounded-lg focus:outline-none focus:border-black"
        >
          <option value="">All Types</option>
          {REPORT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button onClick={() => fetchReports(selectedType)} className="mt-2 text-sm underline">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {reports.length === 0 ? (
            <p className="p-6 text-center text-gray-500">No reports found matching the criteria.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {REPORT_TYPES.find(rt => rt.value === report.report_type)?.label || report.report_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ 
                        report.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800' 
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {report.file_url && report.status === 'completed' && (
                        <a href={report.file_url} target="_blank" rel="noopener noreferrer" title="Download Report" className="text-indigo-600 hover:text-indigo-900 inline-flex items-center">
                          <Download size={16} />
                        </a>
                      )}
                      {report.status !== 'pending' && (
                        <button onClick={() => handleRegenerate(report.id)} title="Regenerate Report" className="text-blue-600 hover:text-blue-900 inline-flex items-center">
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(report.id)} title="Delete Report" className="text-red-600 hover:text-red-900 inline-flex items-center">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
} 