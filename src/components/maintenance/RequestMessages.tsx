import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { Send } from 'lucide-react';
import FileUpload from './FileUpload';
import { formatDate } from '../../utils/date';
import toast from 'react-hot-toast';

interface RequestMessagesProps {
  requestId: string;
}

export default function RequestMessages({ requestId }: RequestMessagesProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [requestId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newMessage.trim()) return;

    setLoading(true);
    try {
      // Upload files if any
      const fileUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${requestId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('maintenance-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        fileUrls.push(filePath);
      }

      // Create message
      const { error: messageError } = await supabase
        .from('maintenance_messages')
        .insert({
          request_id: requestId,
          sender_id: user.id,
          sender_type: profile.user_type || 'tenant',
          message: newMessage,
          attachments: fileUrls
        });

      if (messageError) throw messageError;

      setNewMessage('');
      setFiles([]);
      fetchMessages();
      toast.success('Message sent');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Messages</h2>

      <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${
              message.sender_id === user?.id 
                ? 'bg-black text-white' 
                : 'bg-gray-100'
            } rounded-lg p-3`}>
              <p>{message.message}</p>
              <div className="flex items-center justify-between text-xs mt-1 opacity-70">
                <span>{message.sender_type}</span>
                <span>{formatDate(message.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
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