import { checkStorageBucket } from './utils/api';
import { findWorkingBucket } from './utils/storage';

// Add debugging tools to window object in development mode
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).supabaseDebug = {
    checkBucket: checkStorageBucket,
    findWorkingBucket
  };
  console.log('💡 Supabase debug tools available at window.supabaseDebug');
} 