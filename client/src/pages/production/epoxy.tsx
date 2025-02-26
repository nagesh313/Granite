import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, PaintBucket, Pencil, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProductionJob, Block } from "@db/schema";
import { NewJobCard } from "@/components/production/epoxy/new-job-card";
import { formatDate, getStatusBadgeColor } from "@/lib/utils";
import { DataTable } from "@/components/ui/data-table";
import {ScrollArea} from "@/components/ui/scroll-area";

export default function EpoxyProduction() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading: jobsLoading } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production-jobs"],
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  const { data: eligibleBlocks, isLoading: eligibleBlocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks/eligible/epoxy"],
  });

  const isLoading = jobsLoading || blocksLoading || eligibleBlocksLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const epoxyJobs = jobs?.filter(job => job.stage === "epoxy") || [];

  // Calculate statistics
  const totalJobs = epoxyJobs.length;
  const completedJobs = epoxyJobs.filter(job => job.status === "completed").length;
  const inProgressJobs = epoxyJobs.filter(job => job.status === "in_progress").length;

  // Calculate average epoxy times
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getAverageEpoxyTime = (jobs: any[], startDate: Date) => {
    const completedJobs = jobs.filter(job => 
      job.status === "completed" && 
      new Date(job.startTime) >= startDate &&
      job.startTime && 
      job.endTime
    );
    if (completedJobs.length === 0) return 0;
    const totalTime = completedJobs.reduce((sum, job) => {
      const start = new Date(job.startTime);
      const end = new Date(job.endTime);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);
    return Math.round(totalTime / completedJobs.length);
  };

  const dailyAvg = getAverageEpoxyTime(epoxyJobs, oneDayAgo);
  const weeklyAvg = getAverageEpoxyTime(epoxyJobs, oneWeekAgo);
  const monthlyAvg = getAverageEpoxyTime(epoxyJobs, oneMonthAgo);

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

  const getJobsInTimeRange = (jobs: any[], startDate: Date, status?: string) => {
    const filteredJobs = jobs.filter(job => new Date(job.startTime) >= startDate);
    if(status){
      return filteredJobs.filter(job => job.status === status).length;
    }
    return filteredJobs.length;
  };

  const dailyJobs = getJobsInTimeRange(epoxyJobs, oneDayAgo);
  const weeklyJobs = getJobsInTimeRange(epoxyJobs, oneWeekAgo);
  const monthlyJobs = getJobsInTimeRange(epoxyJobs, oneMonthAgo);

  const dailyInProgress = getJobsInTimeRange(epoxyJobs, oneDayAgo, "in_progress");
  const weeklyInProgress = getJobsInTimeRange(epoxyJobs, oneWeekAgo, "in_progress");
  const monthlyInProgress = getJobsInTimeRange(epoxyJobs, oneMonthAgo, "in_progress");

  const dailyCompleted = getJobsInTimeRange(epoxyJobs, oneDayAgo, "completed");
  const weeklyCompleted = getJobsInTimeRange(epoxyJobs, oneWeekAgo, "completed");
  const monthlyCompleted = getJobsInTimeRange(epoxyJobs, oneMonthAgo, "completed");

  const stats = [
    {
      title: "Average Epoxy Time",
      value: formatTime(getAverageEpoxyTime(epoxyJobs, new Date(0))),
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
      icon: PaintBucket,
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
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient">
      <div className="relative">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Epoxy Treatment
        </h1>
        <p className="text-muted-foreground">
          Epoxy treatment process for surface finishing
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="absolute top-8 right-8 h-10 md:h-12">
              <PaintBucket className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              New Epoxy Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Epoxy Treatment Job</DialogTitle>
              <DialogDescription>
                Start a new epoxy treatment process
              </DialogDescription>
            </DialogHeader>
            <NewJobCard 
              blocks={eligibleBlocks || []} 
              onSettled={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
                queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
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
          <CardTitle>Epoxy Treatment Jobs</CardTitle>
          <CardDescription>
            Monitor and manage ongoing epoxy treatment processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={epoxyJobs}
            searchable={true}
            searchField="blockNumber"
            searchFunction={(item, searchTerm) => {
              const block = blocks?.find(b => b.id === item.blockId);
              const blockNumber = block?.blockNumber || '';
              return blockNumber.toLowerCase().includes(searchTerm.toLowerCase());
            }}
            columns={[
              {
                key: "blockNumber",
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
                key: "startTime",
                header: "Start Time",
                render: (job) => job.status === "skipped" ? "Skipped" : <span className="font-mono">{formatDate(job.startTime)}</span>
              },
              {
                key: "endTime",
                header: "End Time",
                render: (job) => job.status === "skipped" ? "Skipped" : <span className="font-mono">{job.endTime ? formatDate(job.endTime) : "-"}</span>
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
                key: "epoxyTime",
                header: "Epoxy Time",
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
                key: "chemicalName",
                header: "Chemical Name",
                render: (job) => job.status === "skipped" ? "N/A" : ((job.measurements as any)?.chemicalName || "N/A")
              },
              {
                key: "totalArea",
                header: "Total Area (sqft)",
                render: (job) => {
                  const cuttingJobs = jobs?.filter(j => 
                    j.blockId === job.blockId && 
                    j.stage === "cutting" &&
                    j.status === "completed" &&
                    j.measurements?.totalArea
                  ) || [];
                  const latestCuttingJob = cuttingJobs
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                  const totalArea = latestCuttingJob?.measurements?.totalArea;
                  return job.status === "skipped" ? 
                    "N/A" : 
                    <span className="font-mono">
                      {totalArea ? `${parseFloat(totalArea).toFixed(2)} sqft` : "0.00 sqft"}
                    </span>;
                }
              },
              {
                key: "actions",
                header: "Actions",
                render: (job) => {
                  const editingBlocks = [...(eligibleBlocks || [])];
                  const currentBlock = blocks?.find(b => b.id === job.blockId);
                  if (currentBlock && !editingBlocks.find(b => b.id === currentBlock.id)) {
                    editingBlocks.push(currentBlock);
                  }

                  return (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-primary/5"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit Job
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Epoxy Treatment Job</DialogTitle>
                          <DialogDescription>
                            Update job details and track progress
                          </DialogDescription>
                        </DialogHeader>
                        <NewJobCard 
                          blocks={editingBlocks || []}
                          defaultValues={{
                            ...job,
                            blockId: job.blockId?.toString() || "",
                            stage: "epoxy",
                            status: job.status || "pending",
                            startTime: job.startTime || null,
                            endTime: job.endTime || null,
                            measurements: job.status === "skipped" ? null : {
                              chemicalName: job.measurements?.chemicalName || "",
                              totalArea: job.measurements?.totalArea?.toString() || "0",
                              resinIssueQuantity: Number(job.measurements?.resinIssueQuantity || 0),
                              resinReturnQuantity: Number(job.measurements?.resinReturnQuantity || 0),
                              resinNetQuantity: Number(job.measurements?.resinNetQuantity || 0),
                              hardnerIssueQuantity: Number(job.measurements?.hardnerIssueQuantity || 0),
                              hardnerReturnQuantity: Number(job.measurements?.hardnerReturnQuantity || 0),
                              hardnerNetQuantity: Number(job.measurements?.hardnerNetQuantity || 0),
                              totalNetQuantity: Number(job.measurements?.totalNetQuantity || 0)
                            },
                            comments: job.comments || ""
                          }}
                          onSettled={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  );
                }
              }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}