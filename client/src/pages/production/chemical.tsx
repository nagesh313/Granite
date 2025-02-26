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
import { Loader2, BeakerIcon, Pencil, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { ProductionJob, Block } from "@db/schema";
import { formatDate, getStatusBadgeColor } from "@/lib/utils";
import { NewJobCard } from "@/components/production/chemical/new-job-card";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChemicalProduction() {
  const queryClient = useQueryClient();
  const { data: jobs, isLoading: jobsLoading } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production-jobs"],
  });

  const { data: blocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  const isLoading = jobsLoading || blocksLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const chemicalJobs = jobs?.filter(job => job.stage === "chemical_conversion") || [];

  // Calculate statistics
  const totalJobs = chemicalJobs.length;
  const completedJobs = chemicalJobs.filter(job => job.status === "completed").length;
  const inProgressJobs = chemicalJobs.filter(job => job.status === "in_progress").length;

  // Calculate average chemical times
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getAverageChemicalTime = (jobs: any[], startDate: Date) => {
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

  const dailyAvg = getAverageChemicalTime(chemicalJobs, oneDayAgo);
  const weeklyAvg = getAverageChemicalTime(chemicalJobs, oneWeekAgo);
  const monthlyAvg = getAverageChemicalTime(chemicalJobs, oneMonthAgo);

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

  const dailyJobs = getJobsInTimeRange(chemicalJobs, oneDayAgo);
  const weeklyJobs = getJobsInTimeRange(chemicalJobs, oneWeekAgo);
  const monthlyJobs = getJobsInTimeRange(chemicalJobs, oneMonthAgo);

  const dailyInProgress = getJobsInTimeRange(chemicalJobs, oneDayAgo, "in_progress");
  const weeklyInProgress = getJobsInTimeRange(chemicalJobs, oneWeekAgo, "in_progress");
  const monthlyInProgress = getJobsInTimeRange(chemicalJobs, oneMonthAgo, "in_progress");

  const dailyCompleted = getJobsInTimeRange(chemicalJobs, oneDayAgo, "completed");
  const weeklyCompleted = getJobsInTimeRange(chemicalJobs, oneWeekAgo, "completed");
  const monthlyCompleted = getJobsInTimeRange(chemicalJobs, oneMonthAgo, "completed");

  const stats = [
    {
      title: "Average Chemical Time",
      value: formatTime(getAverageChemicalTime(chemicalJobs, new Date(0))),
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
      icon: BeakerIcon,
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
          Chemical Conversion
        </h1>
        <p className="text-muted-foreground">
          Chemical treatment process for surface preparation
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="absolute top-8 right-8 h-10 md:h-12">
              <BeakerIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              New Chemical Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Chemical Treatment Job</DialogTitle>
              <DialogDescription>
                Set up a new chemical treatment process
              </DialogDescription>
            </DialogHeader>
            <NewJobCard 
              onSuccess={() => {
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
          <CardTitle>Chemical Treatment Jobs</CardTitle>
          <CardDescription>
            Monitor and manage ongoing chemical treatment processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={chemicalJobs}
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
                render: (job) => (
                  <span className="font-mono">{formatDate(job.startTime)}</span>
                )
              },
              {
                key: "endTime",
                header: "End Time",
                render: (job) => (
                  <span className="font-mono">
                    {job.endTime ? formatDate(job.endTime) : "-"}
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
                key: "chemicalTime",
                header: "Chemical Time",
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
                render: (job) => job.measurements?.chemicalName || "N/A"
              },
              {
                key: "totalArea", 
                header: "Total Area",
                render: (job) => {
                  const cuttingJobs = jobs?.filter(j => 
                    j.blockId === job.blockId && 
                    j.stage === "cutting" &&
                    j.status === "completed" &&
                    j.measurements?.totalArea
                  ) || [];
                  const latestCuttingJob = cuttingJobs
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
                  const totalArea = latestCuttingJob?.measurements?.totalArea || 0;
                  return job.status === "skipped" ? 
                    "N/A" : 
                    <span className="font-mono">
                      {`${Number(totalArea).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sqft`}
                    </span>;
                }
              },
              {
                key: "actions",
                header: "Actions",
                render: (job) => (
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
                        <DialogTitle>Edit Chemical Treatment Job</DialogTitle>
                        <DialogDescription>
                          Update job details and track progress
                        </DialogDescription>
                      </DialogHeader>
                      <NewJobCard
                        defaultValues={job}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
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