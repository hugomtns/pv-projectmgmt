/**
 * AlertLog - Alert history and management
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellOff, Check, Trash2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { DigitalTwinAlert, AlertSeverity } from '@/lib/digitaltwin/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertLogProps {
  alerts: DigitalTwinAlert[];
  onAcknowledge: (alertId: string) => void;
  onClear: (alertId: string) => void;
  onClearAll: () => void;
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; badge: string }> = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
};

export function AlertLog({
  alerts,
  onAcknowledge,
  onClear,
  onClearAll,
}: AlertLogProps) {
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  return (
    <Card className="mx-3 mb-3">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] h-5">
                {activeAlerts.length}
              </Badge>
            )}
          </span>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={onClearAll}
            >
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <BellOff className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No alerts</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {/* Active alerts first */}
              {activeAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onClear={onClear}
                />
              ))}

              {/* Acknowledged alerts */}
              {acknowledgedAlerts.length > 0 && activeAlerts.length > 0 && (
                <div className="text-xs text-muted-foreground py-1 border-t">
                  Acknowledged
                </div>
              )}
              {acknowledgedAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onClear={onClear}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AlertItem({
  alert,
  onAcknowledge,
  onClear,
}: {
  alert: DigitalTwinAlert;
  onAcknowledge: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(alert.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        'p-2 rounded-md text-xs border',
        alert.acknowledged && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <SeverityIcon className={cn('h-4 w-4 shrink-0 mt-0.5', config.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={cn('text-[10px] px-1.5 py-0', config.badge)}>
                {alert.title}
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate">
                {timeAgo}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2">
              {alert.message}
            </p>
            {alert.equipmentId && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Equipment: {alert.equipmentId}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!alert.acknowledged && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onAcknowledge(alert.id)}
              title="Acknowledge"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onClear(alert.id)}
            title="Clear"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
