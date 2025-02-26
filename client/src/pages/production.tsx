import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Loader2,
  Scissors,
  GalleryVerticalEnd,
  BeakerIcon,
  PaintBucket,
  Sparkles,
  ArrowRight
} from "lucide-react";
import type { ProductionJob } from "@db/schema";

export default function Production() {
  const { data: jobs, isLoading } = useQuery<ProductionJob[]>({
    queryKey: ["/api/production-jobs"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const stages = [
    {
      name: "Cutting",
      path: "/production/cutting",
      icon: Scissors,
      count: jobs?.filter(job => job.stage === "cutting" && job.status === "in_progress").length || 0,
      description: "Block cutting operations and blade management",
      gradient: "from-blue-500/10 via-blue-400/5 to-blue-300/10",
      iconColor: "text-blue-500"
    },
    {
      name: "Grinding",
      path: "/production/grinding",
      icon: GalleryVerticalEnd,
      count: jobs?.filter(job => job.stage === "grinding" && job.status === "in_progress").length || 0,
      description: "Line polishing and surface preparation",
      gradient: "from-green-500/10 via-green-400/5 to-green-300/10",
      iconColor: "text-green-500"
    },
    {
      name: "Chemical Converter",
      path: "/production/chemical",
      icon: BeakerIcon,
      count: jobs?.filter(job => job.stage === "chemical_conversion" && job.status === "in_progress").length || 0,
      description: "Chemical treatment process",
      gradient: "from-purple-500/10 via-purple-400/5 to-purple-300/10",
      iconColor: "text-purple-500"
    },
    {
      name: "Epoxy",
      path: "/production/epoxy",
      icon: PaintBucket,
      count: jobs?.filter(job => job.stage === "epoxy" && job.status === "in_progress").length || 0,
      description: "Surface finishing and coating",
      gradient: "from-orange-500/10 via-orange-400/5 to-orange-300/10",
      iconColor: "text-orange-500"
    },
    {
      name: "Polish",
      path: "/production/polish",
      icon: Sparkles,
      count: jobs?.filter(job => job.stage === "polishing" && job.status === "in_progress").length || 0,
      description: "Final polishing and quality control",
      gradient: "from-cyan-500/10 via-cyan-400/5 to-cyan-300/10",
      iconColor: "text-cyan-500"
    }
  ];

  const totalActiveJobs = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient">
      <div className="relative">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Production Overview
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Monitor and manage production stages across the manufacturing process
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Active Production Summary</CardTitle>
          <CardDescription>
            Currently processing {totalActiveJobs} jobs across all stages
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => (
          <Link key={stage.path} href={stage.path}>
            <Card className={`cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br ${stage.gradient} backdrop-blur supports-[backdrop-filter]:bg-background/60`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center text-base md:text-lg">
                  <div className="flex items-center gap-2">
                    <stage.icon className={`h-5 w-5 ${stage.iconColor}`} />
                    {stage.name}
                  </div>
                  <Badge variant="secondary" className="bg-background/50">
                    {stage.count} active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm">{stage.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span className="text-xs md:text-sm">Manage {stage.name.toLowerCase()} operations</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}