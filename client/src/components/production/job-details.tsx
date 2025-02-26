import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewGrindingJobCard } from "./grinding/new-job-card";
import { NewCuttingJobCard } from "./cutting/new-job-card";
import { NewJobCard } from "./new-job-card";
import { NewPolishJobCard } from "./polish/new-job-card";
import {
  formatDate,
  getStageColor,
  getStatusBadgeColor,
} from "@/lib/utils";
import type { ProductionJob, Machine, Trolley } from "@db/schema";
import { useState } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type Props = {
  job: ProductionJob;
};

export function JobDetails({ job }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const measurements = job.measurements as any || {};

  // Fetch block data to get block number
  const { data: block } = useQuery({
    queryKey: [`/api/blocks/${job.blockId}`],
    enabled: !!job.blockId,
  });

  // Fetch required data for editing and displaying relationships
  const { data: machines, isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const isLoading = machinesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const machine = machines?.find(m => m.id === job.machineId);
  const blockNumber = block?.blockNumber || "Loading...";

  return (
    <>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          {job.stage === "grinding" && (
            <NewGrindingJobCard
              machines={machines || []}
              defaultValues={job}
            />
          )}
          {job.stage === "cutting" && (
            <NewCuttingJobCard
              machines={machines || []}
              defaultValues={job}
            />
          )}
          {job.stage === "chemical_conversion" && (
            <NewJobCard
              stage="chemical_conversion"
              defaultValues={job}
            />
          )}
          {job.stage === "epoxy" && (
            <NewJobCard
              stage="epoxy"
              defaultValues={job}
            />
          )}
          {job.stage === "polishing" && (
            <NewPolishJobCard
              machines={machines || []}
              defaultValues={job}
            />
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="details" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-[400px] grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Job
          </Button>
        </div>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
              <CardDescription>Detailed job information and specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Block Number</p>
                    <p className="text-sm text-muted-foreground">#{blockNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stage</p>
                    <span className={getStageColor(job.stage)}>{job.stage}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge className={getStatusBadgeColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Equipment and Resources */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Equipment and Resources</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Machine</p>
                    <p className="text-sm text-muted-foreground">
                      {machine ? machine.name : 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Trolley Number</p>
                    <p className="text-sm text-muted-foreground">
                      {job.trolleyId ? `#${job.trolleyId}` : 'Not assigned'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timing Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Timing Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Start Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(job.startTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">End Time</p>
                    <p className="text-sm text-muted-foreground">
                      {job.endTime ? formatDate(job.endTime) : "In Progress"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Production Details */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Production Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Total Slabs</p>
                    <p className="text-sm text-muted-foreground">{job.totalSlabs || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Processed Pieces</p>
                    <p className="text-sm text-muted-foreground">{job.processedPieces || 0}</p>
                  </div>
                  {job.defects && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium">Defects</p>
                      <p className="text-sm text-muted-foreground">{job.defects}</p>
                    </div>
                  )}
                </div>
              </div>

              

              {/* Notes and Comments */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Notes and Comments</h3>
                {job.operatorNotes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Operator Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.operatorNotes}</p>
                  </div>
                )}
                {job.comments && (
                  <div>
                    <p className="text-sm font-medium mb-1">Comments</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.comments}</p>
                  </div>
                )}
                {!job.operatorNotes && !job.comments && (
                  <p className="text-sm text-muted-foreground">No notes or comments available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <CardTitle>Measurements</CardTitle>
              <CardDescription>Blade segment heights and specifications</CardDescription>
            </CardHeader>
            <CardContent>
              {job.stage === "cutting" && measurements.segmentHeights?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm font-medium">Initial Segment Height</p>
                    <p className="text-sm text-muted-foreground">{measurements.initialSegmentHeight} mm</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Blade ID</TableHead>
                        <TableHead>Segment Height (mm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {measurements.segmentHeights.map((height: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>#{height.bladeId}</TableCell>
                          <TableCell>{height.height} mm</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No measurements recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Records</CardTitle>
              <CardDescription>Machine stoppage and maintenance details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {measurements.stoppageReason && measurements.stoppageReason !== "none" ? (
                <>
                  <div className="rounded-md bg-yellow-50 p-4">
                    <p className="text-sm font-medium text-yellow-800">
                      Machine stopped due to: {measurements.stoppageReason === "power_outage" ? "Power Outage" : "Maintenance"}
                    </p>
                    {measurements.stoppageStartTime && (
                      <p className="text-sm text-yellow-800 mt-2">
                        Start Time: {formatDate(measurements.stoppageStartTime)}
                      </p>
                    )}
                    {measurements.stoppageEndTime && (
                      <p className="text-sm text-yellow-800 mt-1">
                        End Time: {formatDate(measurements.stoppageEndTime)}
                      </p>
                    )}
                  </div>

                  {measurements.maintenanceReason && (
                    <div>
                      <p className="text-sm font-medium mb-1">Maintenance Details</p>
                      <p className="text-sm text-muted-foreground">
                        {measurements.maintenanceReason}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No maintenance issues reported</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>Production process documentation</CardDescription>
            </CardHeader>
            <CardContent>
              {job.photos && (job.photos as string[]).length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {(job.photos as string[]).map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Production step ${index + 1}`}
                      className="rounded-lg object-cover aspect-video"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No photos uploaded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}