import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function InputField({ label, error, ...props }: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className={`w-full p-3 border rounded-lg focus:outline-none focus:border-black ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${props.className || ''}`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
} 