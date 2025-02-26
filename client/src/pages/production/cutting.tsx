import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { Loader2, Plus, Pencil, Clock, CheckCircle2, Scissors } from "lucide-react";
import type { ProductionJob, Machine, Block } from "@db/schema";
import { NewCuttingJobCard } from "@/components/production/cutting/new-job-card";
import { formatDate, getStatusBadgeColor } from "@/lib/utils";
import { useState } from "react";

type ProductionStatus = "in_progress" | "completed" | "paused" | "cancelled";
type StoppageReason = "none" | "power_outage" | "other";

interface Blade {
  id: number;
  name: string;
  serialNumber: string;
  installationDate: string;
  totalCutArea: string | null;
  currentSegmentHeight: string | null;
  segmentsReplaced: number | null;
  lastBrazingDate: string | null;
}

type CuttingMeasurements = {
  segmentHeights: Array<{ bladeId: number; height: number }>;
  stoppageReason: StoppageReason;
  maintenanceReason?: string;
  stoppageStartTime?: string;
  stoppageEndTime?: string;
  brazingNumber?: number;
  trolleyNumber: number;
  totalArea: number;
};

type CuttingJob = {
  id: number;
  blockId: number;
  machineId: number;
  stage: 'cutting';
  status: ProductionStatus;
  startTime: string;
  endTime: string | null;
  measurements: CuttingMeasurements;
  comments: string | null;
  photos: Array<{ url: string; name: string; }>;
  totalSlabs: number;
};

export default function CuttingProduction() {
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CuttingJob | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production-jobs"],
  });

  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const { data: blades = [], isLoading: bladesLoading } = useQuery<Blade[]>({
    queryKey: ["/api/blades"],
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  if (jobsLoading || machinesLoading || bladesLoading || blocksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const cuttingJobs = jobs.filter(job => job.stage === "cutting").map(job => ({
    ...job,
    measurements: {
      ...job.measurements,
      totalArea: job.measurements.totalArea || 0,
    }
  })) as CuttingJob[];

  const cuttingMachines = machines.filter(machine => machine.type === "cutting");

  // Calculate statistics
  const totalJobs = cuttingJobs.length;
  const completedJobs = cuttingJobs.filter(job => job.status === "completed").length;
  const inProgressJobs = cuttingJobs.filter(job => job.status === "in_progress").length;

  // Calculate average cutting times
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getAverageCuttingTime = (jobs: CuttingJob[], startDate: Date): number => {
    const completedJobs = jobs.filter(job =>
      job.status === "completed" &&
      new Date(job.startTime) >= startDate &&
      job.endTime
    );
    if (completedJobs.length === 0) return 0;
    const totalTime = completedJobs.reduce((sum, job) => {
      const start = new Date(job.startTime);
      const end = new Date(job.endTime!);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);
    return Math.round(totalTime / completedJobs.length);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateRange = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getJobsInTimeRange = (jobs: CuttingJob[], startDate: Date, status?: ProductionStatus): number => {
    const filteredJobs = jobs.filter(job => new Date(job.startTime) >= startDate);
    if (status) {
      return filteredJobs.filter(job => job.status === status).length;
    }
    return filteredJobs.length;
  };

  const dailyJobs = getJobsInTimeRange(cuttingJobs, oneDayAgo);
  const weeklyJobs = getJobsInTimeRange(cuttingJobs, oneWeekAgo);
  const monthlyJobs = getJobsInTimeRange(cuttingJobs, oneMonthAgo);

  const dailyCompleted = getJobsInTimeRange(cuttingJobs, oneDayAgo, "completed");
  const weeklyCompleted = getJobsInTimeRange(cuttingJobs, oneWeekAgo, "completed");
  const monthlyCompleted = getJobsInTimeRange(cuttingJobs, oneMonthAgo, "completed");

  const dailyInProgress = getJobsInTimeRange(cuttingJobs, oneDayAgo, "in_progress");
  const weeklyInProgress = getJobsInTimeRange(cuttingJobs, oneWeekAgo, "in_progress");
  const monthlyInProgress = getJobsInTimeRange(cuttingJobs, oneMonthAgo, "in_progress");

  const stats = [
    {
      title: "Average Cutting Time",
      value: formatTime(getAverageCuttingTime(cuttingJobs, new Date(0))),
      icon: Clock,
      description: (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Daily</span>
            <span className="text-xs font-medium">{formatTime(getAverageCuttingTime(cuttingJobs, oneDayAgo))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Weekly</span>
            <span className="text-xs font-medium">{formatTime(getAverageCuttingTime(cuttingJobs, oneWeekAgo))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Monthly</span>
            <span className="text-xs font-medium">{formatTime(getAverageCuttingTime(cuttingJobs, oneMonthAgo))}</span>
          </div>
        </div>
      ),
      gradient: "from-purple-500/10 via-purple-400/5 to-purple-300/10",
      iconColor: "text-purple-500"
    },
    {
      title: "Total Jobs",
      value: totalJobs,
      icon: Scissors,
      description: (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneDayAgo)}</span>
            <span className="text-xs font-medium">{dailyJobs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneWeekAgo)} - {formatDateRange(now)}</span>
            <span className="text-xs font-medium">{weeklyJobs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{now.toLocaleDateString('en-US', { month: 'long' })}</span>
            <span className="text-xs font-medium">{monthlyJobs}</span>
          </div>
        </div>
      ),
      gradient: "from-blue-500/10 via-blue-400/5 to-blue-300/10",
      iconColor: "text-blue-500"
    },
    {
      title: "In Progress",
      value: inProgressJobs,
      icon: Clock,
      description: (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneDayAgo)}</span>
            <span className="text-xs font-medium">{dailyInProgress}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneWeekAgo)} - {formatDateRange(now)}</span>
            <span className="text-xs font-medium">{weeklyInProgress}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{now.toLocaleDateString('en-US', { month: 'long' })}</span>
            <span className="text-xs font-medium">{monthlyInProgress}</span>
          </div>
        </div>
      ),
      gradient: "from-yellow-500/10 via-yellow-400/5 to-yellow-300/10",
      iconColor: "text-yellow-500"
    },
    {
      title: "Completed",
      value: completedJobs,
      icon: CheckCircle2,
      description: (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneDayAgo)}</span>
            <span className="text-xs font-medium">{dailyCompleted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{formatDateRange(oneWeekAgo)} - {formatDateRange(now)}</span>
            <span className="text-xs font-medium">{weeklyCompleted}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">{now.toLocaleDateString('en-US', { month: 'long' })}</span>
            <span className="text-xs font-medium">{monthlyCompleted}</span>
          </div>
        </div>
      ),
      gradient: "from-green-500/10 via-green-400/5 to-green-300/10",
      iconColor: "text-green-500"
    }
  ];

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="relative">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Cutting Production
        </h1>
        <p className="text-muted-foreground">
          Manage cutting operations and blade maintenance
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>

        <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="absolute top-8 right-8 h-10 md:h-12">
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              New Cutting Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Cutting Job</DialogTitle>
              <DialogDescription>
                Set up a new cutting operation for processing blocks
              </DialogDescription>
            </DialogHeader>
            {isNewJobDialogOpen && (
              <NewCuttingJobCard
                machines={cuttingMachines}
                blades={blades}
                defaultValues={{
                  stage: "cutting" as const,
                  status: "in_progress" as ProductionStatus,
                  startTime: new Date().toISOString(),
                  measurements: {
                    segmentHeights: [],
                    stoppageReason: "none" as const,
                    trolleyNumber: 0,
                    totalArea: 0
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={`transition-all duration-300 hover:shadow-lg bg-gradient-to-br ${stat.gradient} backdrop-blur supports-[backdrop-filter]:bg-background/60`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cutting Jobs</CardTitle>
          <CardDescription>
            Monitor and manage ongoing cutting operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={cuttingJobs}
            searchable={true}
            searchFunction={(item, searchTerm) => {
              const block = blocks?.find(b => b.id === item.blockId);
              const blockNumber = block?.blockNumber || '';
              return blockNumber.toLowerCase().includes(searchTerm.toLowerCase());
            }}
            columns={[
              {
                key: "blockId",
                header: "Block Number",
                render: (job) => {
                  const block = blocks?.find(b => b.id === job.blockId);
                  return (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {block?.blockNumber || "N/A"}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          Type: {block?.blockType || 'N/A'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Color: {block?.color || 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                }
              },
              {
                key: "marka",
                header: "Company",
                render: (job) => {
                  const block = blocks?.find(b => b.id === job.blockId);
                  return block?.marka || "N/A";
                }
              },
              {
                key: "machineId",
                header: "Machine",
                render: (job) => machines?.find(m => m.id === job.machineId)?.name
              },
              {
                key: "startTime",
                header: "Start Time",
                render: (job) => (
                  <span className="font-mono text-xs md:text-sm">
                    {formatDate(job.startTime)}
                  </span>
                )
              },
              {
                key: "status",
                header: "Status",
                render: (job) => (
                  <Badge className={getStatusBadgeColor(job.status)}>
                    {job.status.replace(/_/g, ' ')}
                  </Badge>
                )
              },
              {
                key: "cuttingTime",
                header: "Cutting Time",
                render: (job) => {
                  if (!job.startTime || !job.endTime) return "-";
                  const start = new Date(job.startTime);
                  const end = new Date(job.endTime);
                  const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
                  const hours = Math.floor(diffInMinutes / 60);
                  const minutes = diffInMinutes % 60;
                  return `${hours}h ${minutes}m`;
                }
              },
              {
                key: "measurements",
                header: "Machine Stoppage",
                render: (job) => {
                  const measurements = job.measurements;
                  const stoppageReason = measurements.stoppageReason;
                  let stoppageDuration = "";

                  if (stoppageReason && stoppageReason !== "none" && measurements.stoppageStartTime && measurements.stoppageEndTime) {
                    const start = new Date(measurements.stoppageStartTime);
                    const end = new Date(measurements.stoppageEndTime);
                    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
                    stoppageDuration = `${duration} mins`;
                  }

                  return stoppageReason && stoppageReason !== "none" ? (
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {stoppageReason === "power_outage" ? "Power Outage" : "Other"}
                      </Badge>
                      {stoppageDuration && (
                        <span className="text-xs text-muted-foreground">
                          ({stoppageDuration})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs md:text-sm text-muted-foreground">None</span>
                  );
                }
              },
              {
                key: "trolleyNumber",
                header: "Trolley No.",
                render: (job) => (
                  <span className="font-mono text-xs md:text-sm">
                    {job.measurements.trolleyNumber || "N/A"}
                  </span>
                )
              },
              {
                key: "brazingNumber",
                header: "Brazing No.",
                render: (job) => (
                  <span className="font-mono text-xs md:text-sm">
                    {job.measurements.brazingNumber || "N/A"}
                  </span>
                )
              },
              {
                key: "comments",
                header: "Comments",
                render: (job) => job.comments ? (
                  <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[120px] md:max-w-[200px] block">
                    {job.comments}
                  </span>
                ) : (
                  <span className="text-xs md:text-sm text-muted-foreground">No comments</span>
                )
              },
              {
                key: "totalSlabs",
                header: "Total Slabs",
                render: (job) => (
                  <span className="font-mono text-xs md:text-sm">
                    {job.totalSlabs || 0}
                  </span>
                )
              },
              {
                key: "actions",
                header: "Actions",
                render: (job: CuttingJob) => (
                  <Dialog open={isEditDialogOpen && selectedJob?.id === job.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) setSelectedJob(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setIsEditDialogOpen(true);
                        }}
                        className="h-8 px-2 md:px-3 hover:bg-primary/5"
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span className="hidden md:inline">Edit Job</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Cutting Job</DialogTitle>
                        <DialogDescription>
                          Update job details and track progress
                        </DialogDescription>
                      </DialogHeader>
                      <NewCuttingJobCard
                        machines={cuttingMachines}
                        blades={blades}
                        defaultValues={{
                          ...job,
                          stage: 'cutting' as const,
                          measurements: {
                            segmentHeights: job.measurements.segmentHeights,
                            stoppageReason: job.measurements.stoppageReason,
                            maintenanceReason: job.measurements.maintenanceReason,
                            stoppageStartTime: job.measurements.stoppageStartTime,
                            stoppageEndTime: job.measurements.stoppageEndTime,
                            brazingNumber: job.measurements.brazingNumber,
                            trolleyNumber: job.measurements.trolleyNumber,
                            totalArea: job.measurements.totalArea
                          }
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}