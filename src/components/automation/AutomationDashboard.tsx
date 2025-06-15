import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  DollarSign, 
  FileText, 
  Settings,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Home,
  Wrench,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { formatDate } from '@/utils/date';

interface AutomationRule {
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
}

interface AutomationTask {
  id: string;
  rule_id: string;
  rule_name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  target_entity: string;
  scheduled_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface AutomationStats {
  total_rules: number;
  active_rules: number;
  pending_tasks: number;
  completed_today: number;
  failed_today: number;
  success_rate: number;
}

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [pendingTasks, setPendingTasks] = useState<AutomationTask[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, this would fetch from API
      const mockRules: AutomationRule[] = [
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
          failure_count: 2
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
          failure_count: 0
        },
        {
          id: '3',
          name: 'Maintenance Request Auto-Assignment',
          type: 'maintenance',
          status: 'active',
          trigger: 'New maintenance request',
          action: 'Auto-assign to available vendor',
          last_run: '2024-01-16T14:30:00Z',
          next_run: null,
          success_count: 28,
          failure_count: 3
        },
        {
          id: '4',
          name: 'Quarterly Property Inspections',
          type: 'inspection',
          status: 'paused',
          trigger: 'Every 3 months',
          action: 'Schedule inspection and notify tenant',
          last_run: '2023-12-15T11:00:00Z',
          next_run: '2024-03-15T11:00:00Z',
          success_count: 8,
          failure_count: 1
        },
        {
          id: '5',
          name: 'Document Expiry Alerts',
          type: 'document_expiry',
          status: 'active',
          trigger: '30 days before expiry',
          action: 'Alert property manager and tenant',
          last_run: '2024-01-14T08:00:00Z',
          next_run: '2024-02-14T08:00:00Z',
          success_count: 15,
          failure_count: 0
        }
      ];

      const mockTasks: AutomationTask[] = [
        {
          id: '1',
          rule_id: '1',
          rule_name: 'Monthly Rent Reminders',
          type: 'rent_reminder',
          status: 'pending',
          target_entity: 'Tenant: John Doe - Unit 101',
          scheduled_at: '2024-01-17T10:00:00Z',
          completed_at: null,
          error_message: null
        },
        {
          id: '2',
          rule_id: '2',
          rule_name: 'Lease Renewal Notifications',
          type: 'lease_renewal',
          status: 'pending',
          target_entity: 'Lease: Unit 205 - Jane Smith',
          scheduled_at: '2024-01-17T09:00:00Z',
          completed_at: null,
          error_message: null
        },
        {
          id: '3',
          rule_id: '3',
          rule_name: 'Maintenance Request Auto-Assignment',
          type: 'maintenance',
          status: 'completed',
          target_entity: 'Request: Plumbing Issue - Unit 303',
          scheduled_at: '2024-01-16T14:30:00Z',
          completed_at: '2024-01-16T14:35:00Z',
          error_message: null
        }
      ];

      const mockStats: AutomationStats = {
        total_rules: mockRules.length,
        active_rules: mockRules.filter(r => r.status === 'active').length,
        pending_tasks: mockTasks.filter(t => t.status === 'pending').length,
        completed_today: 8,
        failed_today: 1,
        success_rate: 94.2
      };

      setAutomationRules(mockRules);
      setPendingTasks(mockTasks);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, newStatus: 'active' | 'paused') => {
    try {
      setAutomationRules(prev => 
        prev.map(rule => 
          rule.id === ruleId ? { ...rule, status: newStatus } : rule
        )
      );
      // In real implementation, this would call API
    } catch (error) {
      console.error('Error updating rule status:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rent_reminder': return <DollarSign className="h-4 w-4" />;
      case 'lease_renewal': return <FileText className="h-4 w-4" />;
      case 'maintenance': return <Wrench className="h-4 w-4" />;
      case 'inspection': return <Home className="h-4 w-4" />;
      case 'document_expiry': return <FileText className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
      disabled: { color: 'bg-red-100 text-red-800', label: 'Disabled' },
      pending: { color: 'bg-blue-100 text-blue-800', label: 'Pending' },
      running: { color: 'bg-purple-100 text-purple-800', label: 'Running' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', label: 'Failed' }
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Automation Dashboard</h1>
          <p className="text-gray-600">Manage automated workflows and tasks</p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Configure Rules
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rules</p>
                  <p className="text-2xl font-bold">{stats.total_rules}</p>
                </div>
                <Settings className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Rules</p>
                  <p className="text-2xl font-bold">{stats.active_rules}</p>
                </div>
                <Play className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                  <p className="text-2xl font-bold">{stats.pending_tasks}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold">{stats.completed_today}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed Today</p>
                  <p className="text-2xl font-bold">{stats.failed_today}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.success_rate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Automation Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(task.type)}
                      <div>
                        <p className="font-medium">{task.rule_name}</p>
                        <p className="text-sm text-gray-600">{task.target_entity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {task.status === 'completed' && task.completed_at
                          ? formatDate(task.completed_at)
                          : formatDate(task.scheduled_at)
                        }
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(rule.type)}
                        <div>
                          <h3 className="font-medium">{rule.name}</h3>
                          <p className="text-sm text-gray-600">{rule.trigger} → {rule.action}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(rule.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleStatus(
                            rule.id, 
                            rule.status === 'active' ? 'paused' : 'active'
                          )}
                        >
                          {rule.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Last Run</p>
                        <p className="font-medium">
                          {rule.last_run ? formatDate(rule.last_run) : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Next Run</p>
                        <p className="font-medium">
                          {rule.next_run ? formatDate(rule.next_run) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Success Count</p>
                        <p className="font-medium text-green-600">{rule.success_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Failure Count</p>
                        <p className="font-medium text-red-600">{rule.failure_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending & Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getTypeIcon(task.type)}
                        <div>
                          <h3 className="font-medium">{task.rule_name}</h3>
                          <p className="text-sm text-gray-600">{task.target_entity}</p>
                        </div>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Scheduled</p>
                        <p className="font-medium">{formatDate(task.scheduled_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          {task.status === 'completed' ? 'Completed' : 'Status'}
                        </p>
                        <p className="font-medium">
                          {task.completed_at ? formatDate(task.completed_at) : task.status}
                        </p>
                      </div>
                    </div>
                    
                    {task.error_message && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-600">{task.error_message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 