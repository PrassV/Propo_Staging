import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings,
  Activity,
  Bell,
  Wrench,
  DollarSign,
  Users
} from 'lucide-react';
import { 
  getUnitAutomationStatus,
  getUnitAutomationHistory,
  getUnitAutomationTypes,
  toggleUnitAutomation,
  type UnitAutomationStatus,
  type UnitAutomationHistory
} from '@/api/services/automationService';

interface UnitAutomationControlsProps {
  unitId: string;
  unitNumber: string;
}

export default function UnitAutomationControls({ unitId }: UnitAutomationControlsProps) {
  const [automationStatus, setAutomationStatus] = useState<UnitAutomationStatus | null>(null);
  const [automationHistory, setAutomationHistory] = useState<UnitAutomationHistory | null>(null);
  const [automationTypes, setAutomationTypes] = useState<Array<{
    type: string;
    name: string;
    description: string;
    defaultEnabled: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadAutomationData();
  }, [unitId]);

  const loadAutomationData = async () => {
    try {
      setLoading(true);
      const [status, history, types] = await Promise.all([
        getUnitAutomationStatus(unitId),
        getUnitAutomationHistory(unitId, 10),
        getUnitAutomationTypes()
      ]);

      setAutomationStatus(status);
      setAutomationHistory(history);
      setAutomationTypes(types);
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async (automationType: string, enabled: boolean) => {
    try {
      setToggling(automationType);
      await toggleUnitAutomation(unitId, automationType, enabled);
      
      // Reload automation status
      const updatedStatus = await getUnitAutomationStatus(unitId);
      setAutomationStatus(updatedStatus);
    } catch (error) {
      console.error('Error toggling automation:', error);
    } finally {
      setToggling(null);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAutomationIcon = (type: string) => {
    switch (type) {
      case 'rent_reminder': return <DollarSign className="h-4 w-4" />;
      case 'lease_renewal': return <Users className="h-4 w-4" />;
      case 'maintenance_auto_assign': return <Wrench className="h-4 w-4" />;
      case 'welcome_workflow': return <Bell className="h-4 w-4" />;
      case 'move_out_workflow': return <Activity className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading automation...</p>
        </div>
      </div>
    );
  }

  if (!automationStatus) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load automation data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Automation Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{automationStatus.activeRules}</div>
              <div className="text-sm text-gray-600">Active Rules</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{automationStatus.totalRules}</div>
              <div className="text-sm text-gray-600">Total Rules</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Badge className={getHealthColor(automationStatus.automationHealth)}>
                {automationStatus.automationHealth}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">Health Status</div>
            </div>
          </div>

          {automationStatus.lastTriggered && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Last automation triggered: {formatTimestamp(automationStatus.lastTriggered)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationTypes.map((type) => {
              const isEnabled = automationStatus.enabledAutomations.includes(type.type);
              const isToggling = toggling === type.type;

              return (
                <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getAutomationIcon(type.type)}
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={isEnabled ? 'default' : 'secondary'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleAutomation(type.type, checked)}
                      disabled={isToggling}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Automation Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {automationStatus.recentEvents.length > 0 ? (
            <div className="space-y-3">
              {automationStatus.recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {event.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{event.eventType.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">{event.message}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent automation events</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation History */}
      {automationHistory && automationHistory.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Automation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {automationHistory.events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {event.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                      ) : event.status === 'failed' ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-1" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600 mt-1" />
                      )}
                      <div>
                        <div className="font-medium">{event.ruleName}</div>
                        <div className="text-sm text-gray-600 mb-1">{event.description}</div>
                        <Badge variant="outline" className="text-xs">
                          {event.eventType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 