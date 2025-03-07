import { Paperclip } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileUpload({ files, onChange, disabled }: FileUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    onChange([...files, ...selectedFiles]);
  };

  return (
    <div className="relative">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label
        htmlFor="file-upload"
        className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed 
          hover:border-black transition-colors cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Paperclip size={20} />
      </label>
      {files.length > 0 && (
        <div className="absolute -top-8 right-0 bg-black text-white text-xs px-2 py-1 rounded">
          {files.length} file(s)
        </div>
      )}
    </div>
  );
}