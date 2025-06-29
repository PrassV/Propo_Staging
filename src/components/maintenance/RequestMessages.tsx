import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Send } from 'lucide-react';
import FileUpload from './FileUpload';
import { formatDate } from '../../utils/date';
import toast from 'react-hot-toast';

import { getMaintenanceComments, addMaintenanceComment, MaintenanceComment } from '../../api/services/maintenanceService';
import { uploadFileToBucket } from '../../api/services/storageService';

interface RequestMessagesProps {
  requestId: string;
}

export default function RequestMessages({ requestId }: RequestMessagesProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MaintenanceComment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [requestId]);

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const data = await getMaintenanceComments(requestId);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setLoading(true);
    try {
      const fileUrls: string[] = [];
      
      // Upload files using unified storage system
      for (const file of files) {
        const metadata = {
          maintenanceRequestId: requestId
        };
        
        const uploadResult = await uploadFileToBucket(
          file, 
          'maintenance_files', 
          undefined, 
          metadata
        );
        
        if (uploadResult.success && uploadResult.publicUrl) {
          fileUrls.push(uploadResult.publicUrl);
        } else {
          console.error('Upload failed for file:', file.name, uploadResult.error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      await addMaintenanceComment(requestId, newMessage);

      setNewMessage('');
      setFiles([]);
      fetchMessages();
      toast.success('Message sent');
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      let errorMessage = 'Failed to send message';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Messages</h2>

      <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
        {loadingMessages ? (
          <p className="text-gray-500 text-center p-4">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-center p-4">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${
                message.user_id === user?.id 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100'
              } rounded-lg p-3`}>
                <p>{message.comment}</p>
                <div className="flex items-center justify-between text-xs mt-1 opacity-70">
                  <span>{message.user_name}</span>
                  <span>{formatDate(message.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:border-black"
            rows={3}
            disabled={loading}
          />
        </div>
        
        <FileUpload
          files={files}
          onChange={setFiles}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !newMessage.trim()}
          className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}