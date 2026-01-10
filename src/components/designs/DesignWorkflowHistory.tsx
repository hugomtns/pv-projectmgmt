import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { DesignStatusBadge } from './DesignStatusBadge';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import type { DesignWorkflowEvent } from '@/lib/types';

interface DesignWorkflowHistoryProps {
  designId: string;
}

export function DesignWorkflowHistory({ designId }: DesignWorkflowHistoryProps) {
  // Fetch workflow events from IndexedDB
  const events = useLiveQuery(
    () =>
      db.designWorkflowEvents
        .where('designId')
        .equals(designId)
        .toArray()
        .then((events) => events.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )),
    [designId]
  ) || [];

  const getEventIcon = (event: DesignWorkflowEvent) => {
    switch (event.action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'version_uploaded':
        return <Upload className="h-4 w-4 text-purple-500" />;
      case 'status_changed':
        if (event.toStatus === 'approved') {
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        if (event.toStatus === 'rejected') {
          return <XCircle className="h-4 w-4 text-destructive" />;
        }
        return <Activity className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventDescription = (event: DesignWorkflowEvent) => {
    switch (event.action) {
      case 'created':
        return 'created this design';
      case 'version_uploaded':
        return 'uploaded a new version';
      case 'status_changed':
        return (
          <span className="flex items-center gap-2">
            changed status from
            {event.fromStatus && <DesignStatusBadge status={event.fromStatus} />}
            to
            {event.toStatus && <DesignStatusBadge status={event.toStatus} />}
          </span>
        );
      default:
        return event.action;
    }
  };

  return (
    <div className="w-80 border-l border-border bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Workflow History</h3>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No workflow events yet
          </div>
        )}

        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-background border-2 border-border p-1.5">
                  {getEventIcon(event)}
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-full bg-border mt-1" />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 pb-4">
                <div className="text-sm">
                  <span className="font-medium">{event.actor}</span>{' '}
                  {getEventDescription(event)}
                </div>

                {event.note && (
                  <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded border border-border">
                    {event.note}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
