import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import {
  FileText,
  Upload,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import type { WorkflowEvent } from '@/lib/types';

interface WorkflowHistoryProps {
  documentId: string;
}

export function WorkflowHistory({ documentId }: WorkflowHistoryProps) {
  // Fetch workflow events from IndexedDB
  const events = useLiveQuery(
    () =>
      db.workflowEvents
        .where('documentId')
        .equals(documentId)
        .toArray()
        .then((events) => events.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )),
    [documentId]
  ) || [];

  const getEventIcon = (event: WorkflowEvent) => {
    switch (event.action) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'version_uploaded':
        return <Upload className="h-4 w-4 text-purple-500" />;
      case 'status_changed':
        if (event.toStatus === 'approved') {
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        }
        if (event.toStatus === 'changes_requested') {
          return <XCircle className="h-4 w-4 text-destructive" />;
        }
        return <Activity className="h-4 w-4 text-amber-500" />;
      case 'commented':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventDescription = (event: WorkflowEvent) => {
    switch (event.action) {
      case 'created':
        return 'created this document';
      case 'version_uploaded':
        return 'uploaded a new version';
      case 'status_changed':
        return (
          <span className="flex items-center gap-2">
            changed status from
            {event.fromStatus && <DocumentStatusBadge status={event.fromStatus} />}
            to
            {event.toStatus && <DocumentStatusBadge status={event.toStatus} />}
          </span>
        );
      case 'commented':
        return 'added a comment';
      case 'approved':
        return 'approved this document';
      case 'rejected':
        return 'rejected this document';
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
