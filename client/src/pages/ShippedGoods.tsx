import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditShipmentDialog } from "../components/finished-goods/EditShipmentDialog";
import { Search, Building2, Calendar, Pencil, Layers, Square as SquareFeet, PieChart, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Block {
  blockNumber: string;
  length: number;
  width: number;
  height: number;
}

interface FinishedGood {
  block: Block;
  color: string;
}

interface ShippedGood {
  id: number;
  slabsShipped: number;
  shippedAt: string;
  shippingCompany: string;
  finishedGood: FinishedGood;
}

export default function ShippedGoods() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString());
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [editingShipment, setEditingShipment] = useState<ShippedGood | null>(null);

  const { data: shipments = [], isLoading } = useQuery<ShippedGood[]>({
    queryKey: ["shipped-goods"],
    queryFn: async () => {
      const response = await fetch("/api/finished-goods/shipments");
      if (!response.ok) {
        throw new Error("Failed to fetch shipments");
      }
      const data = await response.json();
      return data.map((shipment: any) => ({
        ...shipment,
        finishedGood: {
          ...shipment.finishedGood,
          block: shipment.finishedGood?.block || {
            blockNumber: 'N/A',
            length: 0,
            width: 0,
            height: 0
          }
        }
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  const calculateCoverage = (length: number, height: number, slabCount: number) => {
    const lengthFt = Math.floor((length - 6) / 12) + (Math.floor((length - 6) % 12 / 3) * 0.25);
    const heightFt = Math.floor((height - 6) / 12) + (Math.floor((height - 6) % 12 / 3) * 0.25);
    return Math.round((lengthFt * heightFt * slabCount) * 100) / 100;
  };

  // Generate list of last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, 'MMMM yyyy')
    };
  });

  const filteredShipments = shipments.filter((shipment) => {
    if (!shipment || !shipment.finishedGood || !shipment.finishedGood.block) return false;

    const matchesSearch =
      shipment.finishedGood.block.blockNumber.toLowerCase().includes(search.toLowerCase()) ||
      shipment.shippingCompany.toLowerCase().includes(search.toLowerCase());

    const matchesColor =
      !selectedColor || selectedColor === "all" || shipment.finishedGood.color === selectedColor;

    const shipmentDate = new Date(shipment.shippedAt);
    const filterMonth = new Date(selectedMonth);
    const monthStart = startOfMonth(filterMonth);
    const monthEnd = endOfMonth(filterMonth);
    const matchesMonth = shipmentDate >= monthStart && shipmentDate <= monthEnd;

    return matchesSearch && matchesColor && matchesMonth;
  });

  const monthlyTotalSlabs = filteredShipments.reduce((total, shipment) =>
    total + shipment.slabsShipped, 0);

  const monthlyTotalCoverage = filteredShipments.reduce((total, shipment) =>
    total + calculateCoverage(
      shipment.finishedGood.block.length,
      shipment.finishedGood.block.height,
      shipment.slabsShipped
    ), 0);

  const uniqueColors = Array.from(new Set(shipments
    .filter(s => s.finishedGood?.color)
    .map(s => s.finishedGood.color)));

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 min-h-screen">
      <div className="flex justify-between items-start">
        <div className="relative">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Shipped Goods
          </h1>
          <p className="text-muted-foreground">Track and monitor shipped inventory</p>
          <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>
              Showing data for {format(new Date(selectedMonth), 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Box className="h-4 w-4 text-primary" />
                  Total Slabs
                </div>
                <div className="text-2xl font-bold">{monthlyTotalSlabs}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Total Area
                </div>
                <div className="text-2xl font-bold">{monthlyTotalCoverage.toFixed(2)} sq ft</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {format(new Date(selectedMonth), 'MMMM yyyy')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  value={selectedColor}
                  onValueChange={setSelectedColor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {uniqueColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by block number or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredShipments.map((shipment) => (
          <Card key={shipment.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="p-1.5">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">Block {shipment.finishedGood.block.blockNumber}</CardTitle>
                    <Badge variant="secondary" className="text-lg px-2 py-0.5">
                      {shipment.finishedGood.color}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="text-muted-foreground/50 mr-1">(L × W × H):</span>
                    {shipment.finishedGood.block.length}″ × {shipment.finishedGood.block.width}″ × {shipment.finishedGood.block.height}″
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(shipment.shippedAt), 'PPP')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingShipment(shipment)}
                    className="h-7 px-2 hover:bg-primary/5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-1.5 pb-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    Company
                  </div>
                  <div className="text-2xl font-bold">{shipment.shippingCompany}</div>
                </div>
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    Slabs Shipped
                  </div>
                  <div className="text-2xl font-bold">{shipment.slabsShipped}</div>
                </div>
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <SquareFeet className="h-4 w-4" />
                    Area
                  </div>
                  <div className="text-2xl font-bold">
                    {calculateCoverage(
                      shipment.finishedGood.block.length,
                      shipment.finishedGood.block.height,
                      shipment.slabsShipped
                    )} sq ft
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredShipments.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No shipments found for the selected filters
          </div>
        )}
      </div>

      {editingShipment && (
        <EditShipmentDialog
          shipment={editingShipment}
          open={!!editingShipment}
          onOpenChange={(open: boolean) => !open && setEditingShipment(null)}
        />
      )}
    </div>
  );
}