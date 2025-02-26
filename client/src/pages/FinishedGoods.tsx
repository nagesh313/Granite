import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { AddStockDialog } from "@/components/finished-goods/AddStockDialog";
import { ShipGoodsDialog } from "@/components/finished-goods/ShipGoodsDialog";
import { StandGrid } from "@/components/finished-goods/StandGrid";
import { StandDetailsDialog } from "@/components/finished-goods/StandDetailsDialog";
import { PlusCircle, Ship, PieChart, BarChart, Layout, LayoutDashboard } from "lucide-react";

interface Stand {
  id: number;
  rowNumber: number;
  position: number;
  maxCapacity: number;
  currentSlabs: number;
  coverage: number;
}

interface QualityDistributionItem {
  color: string;
  count: number;
  block?: {
    id: number;
    length?: number;
    height?: number;
  };
}

interface Summary {
  totalCapacity: number;
  usedCapacity: number;
  qualityDistribution: QualityDistributionItem[];
  totalArea?: number;
  occupiedStands?: number;
  totalStands?: number;
}

export default function FinishedGoods() {
  const [selectedStand, setSelectedStand] = useState<Stand | null>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  const { data: summary } = useQuery<Summary>({
    queryKey: ["finished-goods-summary"],
    queryFn: async () => {
      const response = await fetch("/api/finished-goods/summary");
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      return response.json();
    },
  });

  const capacityPercentage = summary
    ? (summary.usedCapacity / summary.totalCapacity) * 100
    : 0;

  const handleStandClick = (stand: Stand) => {
    setSelectedStand(stand);
    setIsViewingDetails(true);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient">
      <div className="flex justify-between items-start">
        <div className="relative">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Finished Goods
          </h1>
          <p className="text-muted-foreground">Monitor and manage finished goods inventory</p>
          <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddingStock(true)}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Stock
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsShipping(true)}
            className="gap-2"
          >
            <Ship className="h-4 w-4" />
            Ship Goods
          </Button>
        </div>

      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Total Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalArea?.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Square feet across all stands</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Layout className="h-4 w-4 text-primary" />
              Stands Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.occupiedStands || 0}/{summary?.totalStands || 0}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Occupied</span>
                <span className="font-medium">
                  {summary?.totalStands ? Math.round((summary.occupiedStands / summary.totalStands) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={summary?.totalStands ? (summary.occupiedStands / summary.totalStands) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium"> {/* Modification */}
              <PieChart className="h-4 w-4 text-primary" /> {/* Added icon */}
              Color Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary?.qualityDistribution?.map((item: QualityDistributionItem) => (
                <div key={item.color} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.color}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <Progress 
                    value={(item.count / (summary.usedCapacity || 1)) * 100} 
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium"> {/* Modification */}
              <BarChart className="h-4 w-4 text-primary" /> {/* Added icon */}
              Coverage by Color
            </CardTitle>
            <CardDescription className="text-xs">Area covered by each color type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary?.qualityDistribution?.map((colorGroup: QualityDistributionItem) => {
                const totalCoverage = summary?.qualityDistribution
                  ?.filter((item: QualityDistributionItem) => item.color === colorGroup.color)
                  ?.reduce((total: number, item: QualityDistributionItem) => {
                    if (!item?.block?.length || !item?.block?.height) return total;
                    const lengthFt = Math.floor((item.block.length - 6) / 12) + (Math.floor((item.block.length - 6) % 12 / 3) * 0.25);
                    const heightFt = Math.floor((item.block.height - 6) / 12) + (Math.floor((item.block.height - 6) % 12 / 3) * 0.25);
                    return total + (lengthFt * heightFt * item.count);
                  }, 0) || 0;

                return (
                  <div key={colorGroup.color} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{colorGroup.color}</span>
                    <span className="text-sm font-medium">{Math.round(totalCoverage * 100) / 100} sq ft</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Coverage</span>
                  <span className="text-sm font-medium">
                    {Math.round((summary?.qualityDistribution?.reduce((total: number, item: QualityDistributionItem) => {
                      if (!item?.block?.length || !item?.block?.height) return total;
                      const lengthFt = Math.floor((item.block.length - 6) / 12) + (Math.floor((item.block.length - 6) % 12 / 3) * 0.25);
                      const heightFt = Math.floor((item.block.height - 6) / 12) + (Math.floor((item.block.height - 6) % 12 / 3) * 0.25);
                      return total + (lengthFt * heightFt * item.count);
                    }, 0) || 0) * 100) / 100} sq ft</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Storage Layout</CardTitle>
          <CardDescription>
            Click on any stand to view details. Color intensity indicates capacity usage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StandGrid onStandClick={handleStandClick} />
        </CardContent>
      </Card>

      <AddStockDialog
        open={isAddingStock}
        onOpenChange={setIsAddingStock}
        selectedStand={selectedStand}
      />
      <ShipGoodsDialog
        open={isShipping}
        onOpenChange={setIsShipping}
        selectedStand={selectedStand}
      />
      <StandDetailsDialog
        open={isViewingDetails}
        onOpenChange={setIsViewingDetails}
        selectedStand={selectedStand}
      />
    </div>
  );
}