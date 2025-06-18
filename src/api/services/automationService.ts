import api from '../client';

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
  configuration?: Record<string, unknown>;
}

export interface UpdateAutomationRuleRequest {
  name?: string;
  trigger?: string;
  action?: string;
  status?: 'active' | 'paused' | 'disabled';
  configuration?: Record<string, unknown>;
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
    priority_threshold: 'low' | 'normal' | 'urgent' | 'emergency';
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
export const getAutomationLogs = async (ruleId?: string, taskId?: string, limit = 50): Promise<unknown[]> => {
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
export const testAutomationRule = async (ruleId: string, testData?: unknown): Promise<unknown> => {
  try {
    const response = await api.post(`/automation/rules/${ruleId}/test`, testData);
    return response.data;
  } catch (error) {
    console.error('Error testing automation rule:', error);
    throw error;
  }
};

// Get automation rule templates
export const getAutomationTemplates = async (): Promise<unknown[]> => {
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
export const importAutomationConfig = async (configFile: File): Promise<unknown> => {
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

// ===== UNIT-LEVEL AUTOMATION METHODS =====

export interface UnitAutomationEvent {
  unitId: string;
  eventType: 'lease_created' | 'lease_terminated' | 'tenant_assigned' | 'tenant_removed' | 'maintenance_created' | 'maintenance_completed' | 'payment_due' | 'payment_received' | 'payment_overdue';
  data: Record<string, unknown>;
  propertyId?: string;
  tenantId?: string;
  leaseId?: string;
  maintenanceId?: string;
  paymentId?: string;
}

export interface UnitAutomationStatus {
  unitId: string;
  activeRules: number;
  totalRules: number;
  lastTriggered: string | null;
  automationHealth: 'healthy' | 'warning' | 'error';
  enabledAutomations: string[];
  recentEvents: Array<{
    eventType: string;
    timestamp: string;
    status: 'success' | 'failed';
    message: string;
  }>;
}

export interface UnitAutomationHistory {
  unitId: string;
  events: Array<{
    id: string;
    eventType: string;
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    ruleName: string;
    description: string;
    data: Record<string, unknown>;
  }>;
}

// Trigger automation event for unit operations
export const triggerUnitAutomationEvent = async (event: UnitAutomationEvent): Promise<void> => {
  try {
    await api.post('/automation/unit-events', event);
  } catch (error) {
    console.error('Error triggering unit automation event:', error);
    // Don't throw error to avoid breaking unit operations
    // Log for monitoring but continue with operation
  }
};

// Get automation status for a specific unit
export const getUnitAutomationStatus = async (unitId: string): Promise<UnitAutomationStatus> => {
  try {
    const response = await api.get(`/automation/units/${unitId}/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit automation status:', error);
    // Return mock data for development
    return {
      unitId,
      activeRules: 3,
      totalRules: 5,
      lastTriggered: '2024-01-15T10:30:00Z',
      automationHealth: 'healthy',
      enabledAutomations: ['rent_reminder', 'lease_renewal', 'maintenance_auto_assign'],
      recentEvents: [
        {
          eventType: 'rent_reminder',
          timestamp: '2024-01-15T10:30:00Z',
          status: 'success',
          message: 'Rent reminder sent to tenant'
        },
        {
          eventType: 'maintenance_created',
          timestamp: '2024-01-14T14:20:00Z',
          status: 'success',
          message: 'Maintenance request auto-assigned to vendor'
        }
      ]
    };
  }
};

// Get automation history for a specific unit
export const getUnitAutomationHistory = async (unitId: string, limit = 20): Promise<UnitAutomationHistory> => {
  try {
    const response = await api.get(`/automation/units/${unitId}/history?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit automation history:', error);
    // Return mock data for development
    return {
      unitId,
      events: [
        {
          id: '1',
          eventType: 'lease_created',
          timestamp: '2024-01-10T09:00:00Z',
          status: 'success',
          ruleName: 'Welcome Workflow',
          description: 'Welcome email sent to new tenant',
          data: { tenantName: 'John Doe', leaseStartDate: '2024-01-15' }
        },
        {
          id: '2',
          eventType: 'rent_reminder',
          timestamp: '2024-01-12T10:00:00Z',
          status: 'success',
          ruleName: 'Monthly Rent Reminders',
          description: 'Rent reminder sent 3 days before due date',
          data: { amount: 1200, dueDate: '2024-01-15' }
        },
        {
          id: '3',
          eventType: 'maintenance_created',
          timestamp: '2024-01-14T14:20:00Z',
          status: 'success',
          ruleName: 'Auto-Assign Maintenance',
          description: 'Maintenance request automatically assigned to vendor',
                      data: { category: 'Plumbing', priority: 'normal', vendorName: 'ABC Plumbing' }
        }
      ]
    };
  }
};

// Toggle automation for a specific unit
export const toggleUnitAutomation = async (unitId: string, automationType: string, enabled: boolean): Promise<void> => {
  try {
    await api.patch(`/automation/units/${unitId}/toggle`, {
      automation_type: automationType,
      enabled
    });
  } catch (error) {
    console.error('Error toggling unit automation:', error);
    throw error;
  }
};

// Get available automation types for units
export const getUnitAutomationTypes = async (): Promise<Array<{
  type: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}>> => {
  try {
    const response = await api.get('/automation/unit-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching unit automation types:', error);
    // Return mock data for development
    return [
      {
        type: 'rent_reminder',
        name: 'Rent Reminders',
        description: 'Automatic rent payment reminders',
        defaultEnabled: true
      },
      {
        type: 'lease_renewal',
        name: 'Lease Renewal',
        description: 'Automatic lease renewal notifications',
        defaultEnabled: true
      },
      {
        type: 'maintenance_auto_assign',
        name: 'Maintenance Auto-Assignment',
        description: 'Automatically assign maintenance requests to vendors',
        defaultEnabled: false
      },
      {
        type: 'welcome_workflow',
        name: 'Welcome Workflow',
        description: 'Welcome new tenants with onboarding materials',
        defaultEnabled: true
      },
      {
        type: 'move_out_workflow',
        name: 'Move-Out Workflow',
        description: 'Automate move-out procedures and inspections',
        defaultEnabled: false
      }
    ];
  }
}; 