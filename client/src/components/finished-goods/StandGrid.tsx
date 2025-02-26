import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Stand {
  id: number;
  rowNumber: number;
  position: number;
  maxCapacity: number;
  currentSlabs: number;
  coverage: number;
}

interface StandGridProps {
  onStandClick: (stand: Stand) => void;
}

export function StandGrid({ onStandClick }: StandGridProps) {
  const { data: stands = [], isLoading } = useQuery<Stand[]>({
    queryKey: ["finished-goods-stands"],
    queryFn: async () => {
      const response = await fetch("/api/finished-goods/stands");
      if (!response.ok) {
        throw new Error("Failed to fetch stands");
      }
      return response.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 p-4">
        <div className="h-32 w-full animate-pulse bg-muted rounded-lg" />
      </div>
    );
  }

  // Create a 14x4 grid layout (vertical)
  const rows = Array.from({ length: 14 }, (_, i) => i + 1);
  const positions = [1, 2, 3, 4];

  const getCapacityPercentage = (currentSlabs: number, maxCapacity: number) => {
    if (!currentSlabs || !maxCapacity) return 0;
    const percentage = (Number(currentSlabs) / Number(maxCapacity)) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp between 0-100
  };

  const getProgressClassName = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStandColor = (percentage: number) => {
    if (percentage === 0) return 'bg-green-500/20 border-green-500/30';
    if (percentage < 40) return 'bg-green-500/20 border-green-500/30';
    if (percentage >= 40 && percentage < 70) return 'bg-blue-500/20 border-blue-500/30';
    if (percentage >= 70 && percentage < 90) return 'bg-orange-500/20 border-orange-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
          <span>&lt; 40%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
          <span>40-70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30" />
          <span>70-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
          <span>&gt; 90%</span>
        </div>
      </div>
      <div className="flex gap-4">
        {positions.map((pos) => (
          <div key={pos} className="flex-1">
            <h3 className="text-lg font-semibold pl-4 mb-2">Row {pos}</h3>
            <div className="grid grid-rows-14 gap-2 p-4 bg-background/50 rounded-lg shadow-sm">
              {rows.map((row) => {
                const stand = stands.find(s => s.rowNumber === row && s.position === pos) || {
                  id: 0,
                  rowNumber: row,
                  position: pos,
                  maxCapacity: 200,
                  currentSlabs: 0,
                  coverage: 0
                };

                const capacityPercentage = getCapacityPercentage(stand.currentSlabs, stand.maxCapacity);
                const colorClass = getStandColor(capacityPercentage);

                return (
                  <Card
                    key={`${row}-${pos}`}
                    className={`cursor-pointer transition-all hover:bg-accent hover:scale-105 ${colorClass}`}
                    onClick={() => onStandClick(stand)}
                  >
                    <CardContent className="p-2 text-xs">
                      <div className="font-semibold">
                        {`R${pos}-${row.toString().padStart(2, '0')}`}
                      </div>
                      <Progress 
                        value={capacityPercentage} 
                        className={`h-1 my-1 ${getProgressClassName(capacityPercentage)}`}
                      />
                      <div className="text-right text-muted-foreground">
                        {stand.currentSlabs}/{stand.maxCapacity}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}