import { Vendor, MaintenanceCategory } from '../types/maintenance';
import toast from 'react-hot-toast';

interface ApiError {
  message: string;
  details?: string;
}

export async function getVendors(category?: MaintenanceCategory) {
  try {
    const url = new URL(`${import.meta.env.VITE_API_URL}/maintenance/vendors`);
    if (category) {
      url.searchParams.append('category', category);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error: unknown) {
    const err = error as Error | ApiError;
    console.error('Error fetching vendors:', err);
    toast.error(err.message || 'Failed to fetch vendors');
    return { success: false, error: err };
  }
}

export async function createVendor(data: Partial<Vendor>) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/maintenance/vendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const vendor = await response.json();
    return { success: true, data: vendor };
  } catch (error: unknown) {
    const err = error as Error | ApiError;
    console.error('Error creating vendor:', err);
    toast.error(err.message || 'Failed to create vendor');
    return { success: false, error: err };
  }
}