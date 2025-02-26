
import { useQuery } from "@tanstack/react-query";
import { Machine } from "@db/schema";
import { Loader2, Settings, AlertCircle, Clock, Activity, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

export default function Machines() {
  const { data: machines, isLoading, error } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load machines</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient">
      <div className="relative">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Machine Management
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">Monitor and manage manufacturing equipment</p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {machines?.map((machine) => (
          <Card 
            key={machine.id} 
            className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-background to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  {machine.name}
                </div>
                <Badge 
                  variant={
                    machine.status === "idle" 
                      ? "outline" 
                      : machine.status === "running" 
                        ? "default" 
                        : "destructive"
                  }
                  className="capitalize"
                >
                  {machine.status}
                </Badge>
              </CardTitle>
              <CardDescription className="capitalize flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {machine.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Last Maintenance
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {machine.lastMaintenanceDate 
                        ? formatDate(machine.lastMaintenanceDate)
                        : 'Not available'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      Next Maintenance
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {machine.nextMaintenanceDate 
                        ? formatDate(machine.nextMaintenanceDate)
                        : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                {machine.type === "cutting" && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Machine Health</span>
                        <Badge variant="outline" className="bg-background/50">
                          {Math.round(Math.random() * 40 + 60)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.random() * 40 + 60}
                        className="h-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
