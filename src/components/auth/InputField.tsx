interface InputFieldProps {
  label: string;
  icon?: React.ReactNode;
  type: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  min?: string;
}

const InputField = ({ 
  label, 
  icon, 
  type, 
  placeholder, 
  value, 
  onChange, 
  disabled,
  required,
  error,
  min
}: InputFieldProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder || label}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          min={min}
          className={`w-full ${icon ? 'pl-12' : 'pl-4'} pr-4 py-3 border rounded-lg focus:outline-none focus:border-black transition-colors tracking-wide disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : ''
          }`}
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default InputField;