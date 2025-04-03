export const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Formats a date string into a locale-specific date string.
 * Returns 'N/A' if the input is undefined, null, or invalid.
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    // Check for invalid date string explicitly
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString(); // Use locale-specific format
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date'; // Return 'Invalid Date' on error
  }
};