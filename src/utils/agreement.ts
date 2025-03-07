import { supabase } from '../lib/supabase';

export async function generateAgreement(formData: any) {
  try {
    const { data, error } = await supabase.functions.invoke('generate-agreement', {
      body: formData
    });

    if (error) throw error;
    return { success: true, agreement: data.agreement };
  } catch (error) {
    console.error('Error generating agreement:', error);
    throw error;
  }
}