import { StatsCard } from "@/components/dashboard/stats-card";
import { Box, Factory, Clock, CheckCircle, Scissors, TestTubes, Droplets, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Analytics {
  stages: Array<{
    stage: string;
    averageProcessingTime: number;
    completionRate: number;
    defectRate: number;
    completedJobs: number;
    defectiveJobs: number;
    totalSlabs: number;
    totalArea: number | null;
  }>;
  summary: {
    totalActiveJobs: number;
    totalCompletedToday: number;
    overallCompletionRate: number;
    totalSlabs: number;
  };
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    }
  });

  const { data: analyticsData } = useQuery<Analytics>({
    queryKey: ["/api/analytics/production"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/production");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    }
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient">
      <div className="relative">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Manufacturing Dashboard
        </h1>
        <p className="text-muted-foreground">Monitor and track manufacturing performance metrics</p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Box className="h-5 w-5 text-blue-400 animate-pulse" />
              Raw Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              {stats?.rawMaterials || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total blocks in stock
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="h-5 w-5 text-purple-400" />
              Production Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-500">
              {analyticsData?.summary.totalActiveJobs || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Jobs in progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {analyticsData?.stages.map(stage => (
                <div key={stage.stage} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{stage.stage.replace(/_/g, ' ')}</span>
                  <span>{stage.completedJobs || 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {analyticsData?.stages.map((stage) => (
          <Card key={stage.stage} className="transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-background to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="capitalize">{stage.stage.replace(/_/g, ' ')}</span>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Processing Time</span>
                    <span className="font-medium">
                      {typeof stage.averageProcessingTime === 'number'
                        ? `${stage.averageProcessingTime.toFixed(1)}h`
                        : 'N/A'}
                    </span>
                  </div>
                  {typeof stage.averageProcessingTime === 'number' && (
                    <Progress
                      value={Math.min((stage.averageProcessingTime / 24) * 100, 100)}
                      className="mt-2 bg-primary/20"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                      {stage.completedJobs || 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Completed Jobs</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-purple-500/10">
                    <span className="text-xl font-semibold text-purple-500">
                      {stage.totalSlabs || 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Processed Slabs</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-500/10">
                    <span className="text-xl font-semibold text-green-500">
                      {stage.totalArea && !isNaN(stage.totalArea) ? `${Number(stage.totalArea).toFixed(2)}m²` : '0m²'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Total Area</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}