import { api } from '../client';

export interface AutomationRule {
  id: string;
  name: string;
  type: 'rent_reminder' | 'lease_renewal' | 'maintenance' | 'inspection' | 'document_expiry';
  status: 'active' | 'paused' | 'disabled';
  trigger: string;
  action: string;
  last_run: string | null;
  next_run: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationTask {
  id: string;
  rule_id: string;
  rule_name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  target_entity: string;
  target_entity_id: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

export interface AutomationStats {
  total_rules: number;
  active_rules: number;
  pending_tasks: number;
  completed_today: number;
  failed_today: number;
  success_rate: number;
  avg_completion_time: number;
}

export interface CreateAutomationRuleRequest {
  name: string;
  type: 'rent_reminder' | 'lease_renewal' | 'maintenance' | 'inspection' | 'document_expiry';
  trigger: string;
  action: string;
  status?: 'active' | 'paused';
  configuration?: Record<string, any>;
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  trigger?: string;
  action?: string;
  status?: 'active' | 'paused' | 'disabled';
  configuration?: Record<string, any>;
}

export interface AutomationConfiguration {
  rent_reminder: {
    days_before_due: number;
    notification_methods: ('email' | 'sms' | 'in_app')[];
    template_id?: string;
  };
  lease_renewal: {
    days_before_expiry: number;
    auto_generate_documents: boolean;
    notification_methods: ('email' | 'sms' | 'in_app')[];
  };
  maintenance: {
    auto_assign: boolean;
    priority_threshold: 'low' | 'medium' | 'high';
    vendor_selection_criteria: 'availability' | 'cost' | 'rating';
  };
  inspection: {
    frequency_months: number;
    advance_notice_days: number;
    auto_schedule: boolean;
  };
  document_expiry: {
    days_before_expiry: number;
    document_types: string[];
    notification_methods: ('email' | 'sms' | 'in_app')[];
  };
}

// Get all automation rules
export const getAutomationRules = async (): Promise<AutomationRule[]> => {
  try {
    const response = await api.get('/automation/rules');
    return response.data;
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    // Mock data for development
    return [
      {
        id: '1',
        name: 'Monthly Rent Reminders',
        type: 'rent_reminder',
        status: 'active',
        trigger: '3 days before due date',
        action: 'Send email and in-app notification',
        last_run: '2024-01-15T10:00:00Z',
        next_run: '2024-02-12T10:00:00Z',
        success_count: 45,
        failure_count: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Lease Renewal Notifications',
        type: 'lease_renewal',
        status: 'active',
        trigger: '60 days before expiry',
        action: 'Generate renewal documents and notify tenant',
        last_run: '2024-01-10T09:00:00Z',
        next_run: '2024-02-10T09:00:00Z',
        success_count: 12,
        failure_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-10T09:00:00Z'
      }
    ];
  }
};

// Get automation rule by ID
export const getAutomationRule = async (ruleId: string): Promise<AutomationRule> => {
  try {
    const response = await api.get(`/automation/rules/${ruleId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching automation rule:', error);
    throw error;
  }
};

// Create new automation rule
export const createAutomationRule = async (ruleData: CreateAutomationRuleRequest): Promise<AutomationRule> => {
  try {
    const response = await api.post('/automation/rules', ruleData);
    return response.data;
  } catch (error) {
    console.error('Error creating automation rule:', error);
    throw error;
  }
};

// Update automation rule
export const updateAutomationRule = async (ruleId: string, updates: UpdateAutomationRuleRequest): Promise<AutomationRule> => {
  try {
    const response = await api.patch(`/automation/rules/${ruleId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating automation rule:', error);
    throw error;
  }
};

// Delete automation rule
export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
  try {
    await api.delete(`/automation/rules/${ruleId}`);
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    throw error;
  }
};

// Get automation tasks
export const getAutomationTasks = async (status?: string, ruleId?: string): Promise<AutomationTask[]> => {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (ruleId) params.append('rule_id', ruleId);
    
    const response = await api.get(`/automation/tasks?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching automation tasks:', error);
    // Mock data for development
    return [
      {
        id: '1',
        rule_id: '1',
        rule_name: 'Monthly Rent Reminders',
        type: 'rent_reminder',
        status: 'pending',
        target_entity: 'Tenant: John Doe - Unit 101',
        target_entity_id: 'tenant_123',
        scheduled_at: '2024-01-17T10:00:00Z',
        started_at: null,
        completed_at: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3
      },
      {
        id: '2',
        rule_id: '2',
        rule_name: 'Lease Renewal Notifications',
        type: 'lease_renewal',
        status: 'pending',
        target_entity: 'Lease: Unit 205 - Jane Smith',
        target_entity_id: 'lease_456',
        scheduled_at: '2024-01-17T09:00:00Z',
        started_at: null,
        completed_at: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3
      }
    ];
  }
};

// Get automation statistics
export const getAutomationStats = async (): Promise<AutomationStats> => {
  try {
    const response = await api.get('/automation/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching automation stats:', error);
    // Mock data for development
    return {
      total_rules: 5,
      active_rules: 4,
      pending_tasks: 8,
      completed_today: 12,
      failed_today: 1,
      success_rate: 94.2,
      avg_completion_time: 2.5
    };
  }
};

// Execute automation task manually
export const executeAutomationTask = async (taskId: string): Promise<AutomationTask> => {
  try {
    const response = await api.post(`/automation/tasks/${taskId}/execute`);
    return response.data;
  } catch (error) {
    console.error('Error executing automation task:', error);
    throw error;
  }
};

// Retry failed automation task
export const retryAutomationTask = async (taskId: string): Promise<AutomationTask> => {
  try {
    const response = await api.post(`/automation/tasks/${taskId}/retry`);
    return response.data;
  } catch (error) {
    console.error('Error retrying automation task:', error);
    throw error;
  }
};

// Cancel pending automation task
export const cancelAutomationTask = async (taskId: string): Promise<void> => {
  try {
    await api.post(`/automation/tasks/${taskId}/cancel`);
  } catch (error) {
    console.error('Error canceling automation task:', error);
    throw error;
  }
};

// Get automation logs
export const getAutomationLogs = async (ruleId?: string, taskId?: string, limit = 50): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (ruleId) params.append('rule_id', ruleId);
    if (taskId) params.append('task_id', taskId);
    params.append('limit', limit.toString());
    
    const response = await api.get(`/automation/logs?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching automation logs:', error);
    return [];
  }
};

// Test automation rule
export const testAutomationRule = async (ruleId: string, testData?: any): Promise<any> => {
  try {
    const response = await api.post(`/automation/rules/${ruleId}/test`, testData);
    return response.data;
  } catch (error) {
    console.error('Error testing automation rule:', error);
    throw error;
  }
};

// Get automation rule templates
export const getAutomationTemplates = async (): Promise<any[]> => {
  try {
    const response = await api.get('/automation/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching automation templates:', error);
    // Mock templates for development
    return [
      {
        id: 'rent_reminder_template',
        name: 'Rent Reminder Template',
        type: 'rent_reminder',
        description: 'Automated rent payment reminders',
        default_config: {
          days_before_due: 3,
          notification_methods: ['email', 'in_app'],
          template_id: 'rent_reminder_email'
        }
      },
      {
        id: 'lease_renewal_template',
        name: 'Lease Renewal Template',
        type: 'lease_renewal',
        description: 'Automated lease renewal notifications',
        default_config: {
          days_before_expiry: 60,
          auto_generate_documents: true,
          notification_methods: ['email']
        }
      }
    ];
  }
};

// Bulk update automation rules
export const bulkUpdateAutomationRules = async (ruleIds: string[], updates: UpdateAutomationRuleRequest): Promise<AutomationRule[]> => {
  try {
    const response = await api.patch('/automation/rules/bulk', {
      rule_ids: ruleIds,
      updates
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating automation rules:', error);
    throw error;
  }
};

// Export automation configuration
export const exportAutomationConfig = async (): Promise<Blob> => {
  try {
    const response = await api.get('/automation/export', {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting automation config:', error);
    throw error;
  }
};

// Import automation configuration
export const importAutomationConfig = async (configFile: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('config', configFile);
    
    const response = await api.post('/automation/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error importing automation config:', error);
    throw error;
  }
}; 