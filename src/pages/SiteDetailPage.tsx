import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSiteStore } from '@/stores/siteStore';
import { useProjectStore } from '@/stores/projectStore';
import { SiteMapPreview } from '@/components/sites/SiteMapPreview';
import { ScorecardSection } from '@/components/sites/scorecard/ScorecardSection';
import { SiteCommentPanel } from '@/components/sites/SiteCommentPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { squareMetersToAcres } from '@/lib/kml/parser';
import { EXCLUSION_ZONE_LABELS } from '@/lib/types/site';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  MapPin,
  Info,
  ClipboardCheck,
  MessageSquare,
  ChevronLeft,
  User,
  Calendar,
  FileUp,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface LocationState {
  highlightCommentId?: string;
}

export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // State can be used for deep-linking to specific comments in the future
  const _locationState = location.state as LocationState | null;
  void _locationState; // Reserved for future use

  const site = useSiteStore((state) => state.sites.find((s) => s.id === siteId));
  const project = useProjectStore((state) =>
    site ? state.projects.find((p) => p.id === site.projectId) : undefined
  );

  const [activeTab, setActiveTab] = useState<'info' | 'scorecard' | 'comments'>('info');
  const commentCount = site?.comments?.length || 0;

  if (!siteId || !site) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Site not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const totalAcres =
    site.totalArea != null && site.totalArea > 0
      ? squareMetersToAcres(site.totalArea)
      : 0;
  const usableAcres =
    site.usableArea != null ? squareMetersToAcres(site.usableArea) : totalAcres;
  const usablePercent =
    totalAcres > 0 ? ((usableAcres / totalAcres) * 100).toFixed(1) : '100';

  // Group exclusion zones by type
  const exclusionsByType = site.exclusionZones.reduce(
    (acc, zone) => {
      if (!acc[zone.type]) {
        acc[zone.type] = [];
      }
      acc[zone.type].push(zone);
      return acc;
    },
    {} as Record<string, typeof site.exclusionZones>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{site.name}</h1>
          </div>
          {project && (
            <Link
              to={`/projects/${project.id}`}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <span>in {project.name}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3">
        {/* Map view */}
        <div className="lg:col-span-2 min-h-[400px]">
          <SiteMapPreview site={site} />
        </div>

        {/* Sidebar */}
        <div className="border-l flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="w-full justify-start rounded-none border-b h-11 px-2 shrink-0">
              <TabsTrigger value="info" className="gap-1.5">
                <Info className="h-4 w-4" />
                Info
              </TabsTrigger>
              <TabsTrigger value="scorecard" className="gap-1.5">
                <ClipboardCheck className="h-4 w-4" />
                Scorecard
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Comments
                {commentCount > 0 && (
                  <span className="ml-1 text-xs bg-muted px-1.5 rounded-full">
                    {commentCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="info" className="m-0 p-4 space-y-6">
                {/* Description */}
                {site.description && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {site.description}
                    </p>
                  </div>
                )}

                {/* Area summary */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Area Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Area</span>
                      <span className="font-medium">
                        {totalAcres.toFixed(2)} acres
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usable Area</span>
                      <span className="font-medium text-green-600">
                        {usableAcres.toFixed(2)} acres ({usablePercent}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Exclusion Area
                      </span>
                      <span className="font-medium text-amber-600">
                        {(totalAcres - usableAcres).toFixed(2)} acres
                      </span>
                    </div>
                  </div>
                </div>

                {/* Exclusion zones */}
                {site.exclusionZones.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Exclusion Zones ({site.exclusionZones.length})
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(exclusionsByType).map(([type, zones]) => (
                        <div key={type}>
                          <div className="flex items-center gap-2 text-sm font-medium mb-1">
                            <Layers className="h-3.5 w-3.5" />
                            {EXCLUSION_ZONE_LABELS[type as keyof typeof EXCLUSION_ZONE_LABELS] || type}
                            <span className="text-muted-foreground font-normal">
                              ({zones.length})
                            </span>
                          </div>
                          <div className="pl-5 space-y-1">
                            {zones.map((zone) => (
                              <div
                                key={zone.id}
                                className="flex justify-between text-sm text-muted-foreground"
                              >
                                <span className="truncate">{zone.name}</span>
                                <span className="shrink-0">
                                  {zone.area
                                    ? `${squareMetersToAcres(zone.area).toFixed(2)} ac`
                                    : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coordinates */}
                {site.centroid && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Location</h3>
                    <div className="text-sm text-muted-foreground">
                      <div>Lat: {site.centroid.latitude.toFixed(6)}</div>
                      <div>Lng: {site.centroid.longitude.toFixed(6)}</div>
                    </div>
                  </div>
                )}

                {/* KML file info */}
                {site.kmlFileName && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Source File</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileUp className="h-4 w-4" />
                      <span>{site.kmlFileName}</span>
                      {site.kmlFileSize && (
                        <span className="text-xs">
                          ({(site.kmlFileSize / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Created by {site.createdBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Updated{' '}
                        {formatDistanceToNow(new Date(site.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scorecard" className="m-0 p-4">
                <ScorecardSection site={site} defaultExpanded={true} />
              </TabsContent>

              <TabsContent value="comments" className="m-0 h-full">
                <SiteCommentPanel siteId={site.id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
