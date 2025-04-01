import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Trash2, Upload } from 'lucide-react';
import api from '../../api';
import { Document } from '../../api/types'; // Use Document type
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const tenantId = searchParams.get('tenant'); // Handle tenant docs later if needed

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { property_id?: string; tenant_id?: string } = {};
      if (propertyId) params.property_id = propertyId;
      if (tenantId) params.tenant_id = tenantId;
      
      // Call the service to get documents
      const response = await api.document.getDocuments(params);
      setDocuments(response.documents);
    } catch (err: unknown) {
      console.error('Error fetching documents:', err);
      let errorMessage = 'Failed to fetch documents';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [propertyId, tenantId]); // Refetch if filters change

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.document.deleteDocument(docId);
      toast.success('Document deleted successfully');
      setDocuments(prev => prev.filter(doc => doc.id !== docId)); // Remove from local state
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Failed to delete document.');
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)} // Go back to previous page
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back
      </button>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-gray-600">
            {propertyId ? `Documents for Property ID: ${propertyId}` : tenantId ? `Documents for Tenant ID: ${tenantId}` : 'All Documents'}
          </p>
        </div>
        {/* TODO: Add Upload Button/Component Here */}
        <button className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          <Upload size={20} />
          <span>Upload Document</span>
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button onClick={fetchDocuments} className="mt-2 text-sm underline">Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {documents.length === 0 ? (
            <p className="p-6 text-center text-gray-500">No documents found.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <li key={doc.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText size={20} className="text-gray-500" />
                    <div>
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-black font-medium hover:underline"
                        title={doc.description || doc.title}
                      >
                        {doc.title}
                      </a>
                      <p className="text-sm text-gray-500">
                        Type: {doc.document_type} | Added: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                    title="Delete Document"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 