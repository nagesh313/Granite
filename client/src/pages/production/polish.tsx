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
import { Loader2, Sparkles, Pencil, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProductionJob, Machine, Block } from "@db/schema";
import { JobDetails } from "@/components/production/job-details";
import { NewPolishJobCard } from "@/components/production/polish/new-job-card";
import { formatDate, getStatusBadgeColor } from "@/lib/utils";
import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";

type PolishMeasurements = {
  polishingTime?: number;
  surfaceQuality?: string;
  polishGrade?: string;
  stoppageReason?: string;
  stoppageStartTime?: string | null;
  stoppageEndTime?: string | null;
  maintenanceReason?: string | null;
};

type PolishJob = Omit<ProductionJob, 'measurements'> & {
  measurements: PolishMeasurements;
  totalSlabs?: number; // Added totalSlabs property
};

export default function PolishProduction() {
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);

  const { data: jobs, isLoading: jobsLoading } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production-jobs"],
  });

  const { data: machines, isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  if (jobsLoading || machinesLoading || blocksLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const polishingJobs = (jobs?.filter(job => job.stage === "polishing") || []) as PolishJob[];
  const polishingMachines = machines?.filter(machine => machine.type === "polishing") || [];

  // Calculate statistics
  const totalJobs = polishingJobs.length;
  const completedJobs = polishingJobs.filter(job => job.status === "completed").length;
  const inProgressJobs = polishingJobs.filter(job => job.status === "in_progress").length;


  // Calculate average polishing times
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getAveragePolishingTime = (jobs: PolishJob[], startDate: Date) => {
    const completedJobs = jobs.filter(job => 
      job.status === "completed" && 
      new Date(job.startTime) >= startDate
    );
    if (completedJobs.length === 0) return 0;
    const totalTime = completedJobs.reduce((sum, job) => sum + (job.measurements?.polishingTime || 0), 0);
    return Math.round(totalTime / completedJobs.length);
  };

  const dailyAvg = getAveragePolishingTime(polishingJobs, oneDayAgo);
  const weeklyAvg = getAveragePolishingTime(polishingJobs, oneWeekAgo);
  const monthlyAvg = getAveragePolishingTime(polishingJobs, oneMonthAgo);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateRange = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getJobsInTimeRange = (jobs: PolishJob[], startDate: Date, status?: string) => {
    const filteredJobs = jobs.filter(job => new Date(job.startTime) >= startDate);
    if(status){
      return filteredJobs.filter(job => job.status === status).length;
    }
    return filteredJobs.length;
  };

  const dailyJobs = getJobsInTimeRange(polishingJobs, oneDayAgo);
  const weeklyJobs = getJobsInTimeRange(polishingJobs, oneWeekAgo);
  const monthlyJobs = getJobsInTimeRange(polishingJobs, oneMonthAgo);

  const dailyInProgress = getJobsInTimeRange(polishingJobs, oneDayAgo, "in_progress");
  const weeklyInProgress = getJobsInTimeRange(polishingJobs, oneWeekAgo, "in_progress");
  const monthlyInProgress = getJobsInTimeRange(polishingJobs, oneMonthAgo, "in_progress");

  const dailyCompleted = getJobsInTimeRange(polishingJobs, oneDayAgo, "completed");
  const weeklyCompleted = getJobsInTimeRange(polishingJobs, oneWeekAgo, "completed");
  const monthlyCompleted = getJobsInTimeRange(polishingJobs, oneMonthAgo, "completed");

  const stats = [
    {
      title: "Average Polish Time",
      value: formatTime(getAveragePolishingTime(polishingJobs, new Date(0))),
      icon: Clock,
      description: (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">Daily</span>
            <span className="text-xs font-medium">{formatTime(dailyAvg)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Weekly</span>
            <span className="text-xs font-medium">{formatTime(weeklyAvg)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Monthly</span>
            <span className="text-xs font-medium">{formatTime(monthlyAvg)}</span>
          </div>
        </div>
      ),
      gradient: "from-purple-500/10 via-purple-400/5 to-purple-300/10",
      iconColor: "text-purple-500"
    },
    {
      title: "Total Jobs",
      value: totalJobs,
      icon: Sparkles,
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

  // Get blocks eligible for polishing (completed/skipped grinding and chemical/epoxy)
  const eligibleBlocks = blocks?.filter(block => {
    const grindingJob = jobs?.find(job => job.blockId === block.id && job.stage === "grinding");
    const chemicalJob = jobs?.find(job => job.blockId === block.id && job.stage === "chemical_conversion");
    const epoxyJob = jobs?.find(job => job.blockId === block.id && job.stage === "epoxy");

    // Grinding must be completed or skipped
    const isGrindingDone = grindingJob && (grindingJob.status === "completed" || grindingJob.status === "skipped");

    // Chemical and epoxy must be either not started, completed, or skipped
    const isChemicalDone = !chemicalJob || chemicalJob.status === "completed" || chemicalJob.status === "skipped";
    const isEpoxyDone = !epoxyJob || epoxyJob.status === "completed" || epoxyJob.status === "skipped";

    return isGrindingDone && isChemicalDone && isEpoxyDone;
  }) || [];

  const getBlockProcessInfo = (blockId: number) => {
    const chemicalJob = jobs?.find(job => job.blockId === blockId && job.stage === "chemical_conversion");
    const epoxyJob = jobs?.find(job => job.blockId === blockId && job.stage === "epoxy");

    return {
      chemical: chemicalJob?.status || "pending",
      epoxy: epoxyJob?.status || "pending"
    };
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="relative">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Line Polishing
        </h1>
        <p className="text-muted-foreground">
          Final polishing and surface finishing
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
      <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="absolute top-8 right-8 h-10 md:h-12">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            New Polishing Job
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Polishing Job</DialogTitle>
            <DialogDescription>
              Set up a new polishing operation for final finishing
            </DialogDescription>
          </DialogHeader>
          <NewPolishJobCard 
            machines={polishingMachines} 
            eligibleBlocks={eligibleBlocks}
            defaultValues={{
              blockId: "",
              machineId: "",
              stage: "polishing" as const,
              status: "pending",
              startTime: new Date().toISOString(),
              endTime: "",
              measurements: {
                polishingTime: 0,
                surfaceQuality: "good",
                polishGrade: "",
                stoppageReason: "none",
                stoppageStartTime: null,
                stoppageEndTime: null,
                maintenanceReason: null,
              },
              comments: "",
              photos: [],
              totalSlabs: 0, // Added totalSlabs to defaultValues
            }}
          />
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
              <div className="text-2xl font-bold">{stat.value}</div> {/* Reduced text size here */}
              <p className="text-sm text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>



      <Card>
        <CardHeader>
          <CardTitle>Polishing Jobs</CardTitle>
          <CardDescription>
            Monitor and manage ongoing polishing operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={polishingJobs}
            columns={[
              { 
                key: "blockNumber", 
                header: "Block Number", 
                render: (job: PolishJob) => {
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
                key: "previousStages",
                header: "Previous Stages",
                render: (job: PolishJob) => {
                  const info = getBlockProcessInfo(job.blockId!);
                  return (
                    <div className="flex gap-2">
                      <Badge variant={info.chemical === "skipped" ? "secondary" : "default"}>
                        Chemical: {info.chemical}
                      </Badge>
                      <Badge variant={info.epoxy === "skipped" ? "secondary" : "default"}>
                        Epoxy: {info.epoxy}
                      </Badge>
                    </div>
                  );
                }
              },
              { 
                key: "startTime", 
                header: "Start Time", 
                render: (job: PolishJob) => (
                  <span className="font-mono">
                    {formatDate(job.startTime)}
                  </span>
                )
              },
              { 
                key: "status", 
                header: "Status", 
                render: (job: PolishJob) => (
                  <Badge className={getStatusBadgeColor(job.status)}>{job.status.replace(/_/g, ' ')}</Badge>
                )
              },
              {
                key: "polishingTime",
                header: "Polishing Time",
                render: (job: PolishJob) => {
                  const minutes = job.measurements?.polishingTime || 0;
                  const hours = Math.floor(minutes / 60);
                  const mins = Math.round(minutes % 60);
                  return (
                    <span className="font-mono">
                      {hours}h {mins}m
                    </span>
                  );
                }
              },
              {
                key: "totalSlabs",
                header: "Total Slabs",
                render: (job: PolishJob) => (
                  <span className="font-mono">
                    {job.totalSlabs || 0}
                  </span>
                )
              },
              {
                key: "comments",
                header: "Comments",
                render: (job: PolishJob) => (
                  <span className="text-sm text-muted-foreground">
                    {job.comments || '-'}
                  </span>
                )
              },
              { 
                key: "actions", 
                header: "Actions", 
                render: (job: PolishJob) => {
                  // When editing, include the current block in eligible blocks if it's not already there
                  const editingEligibleBlocks = [...(eligibleBlocks || [])];
                  const currentBlock = blocks?.find(b => b.id === job.blockId);
                  if (currentBlock && !editingEligibleBlocks.find(b => b.id === currentBlock.id)) {
                    editingEligibleBlocks.push(currentBlock);
                  }

                  return (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="hover:bg-primary/5">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Polishing Job</DialogTitle>
                          <DialogDescription>
                            Update job details and track progress
                          </DialogDescription>
                        </DialogHeader>
                        <NewPolishJobCard 
                          machines={polishingMachines}
                          eligibleBlocks={editingEligibleBlocks}
                          defaultValues={job}
                        />
                      </DialogContent>
                    </Dialog>
                  );
                }
              },
            ]}
            searchable={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}