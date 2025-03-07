interface UserTypeSwitchProps {
  currentType: 'owner' | 'tenant' | null;
  onSwitch: () => void;
}

const UserTypeSwitch = ({ currentType, onSwitch }: UserTypeSwitchProps) => {
  if (!currentType) return null;
  
  return (
    <div className="bg-gray-50 py-4 px-8 mb-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Current Mode:</span>
          <span className="font-semibold tracking-wide capitalize">
            {currentType === 'owner' ? 'Property Owner' : 'Tenant'}
          </span>
        </div>
        <button
          onClick={onSwitch}
          className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors tracking-wide"
        >
          Switch Mode
        </button>
      </div>
    </div>
  );
};

export default UserTypeSwitch;