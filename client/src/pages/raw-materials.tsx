type BlockStatus = "in_stock" | "processing" | "completed";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BlockForm } from "@/components/raw-materials/block-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDimensions, formatWeight } from "@/lib/utils";
import type { Block } from "@db/schema";
import { Plus, Loader2, Package, Scale, Truck, Search, ArrowUpDown, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PhotoData {
  url: string;
  name: string;
}

export default function RawMaterials() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<keyof Block>("dateReceived");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: blocks, isLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
  });

  const handlePhotoUpload = async (file: File, side: 'front' | 'back'): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'photo');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const formattedData = {
        ...data,
        length: Number(data.length),
        width: Number(data.width),
        height: Number(data.height),
        blockWeight: Number(data.blockWeight || 0),
        density: Number(data.density || 2.7),
        photoFrontUrl: data.frontPhoto?.url || "",
        photoBackUrl: data.backPhoto?.url || "",
        photoFrontName: data.photoFrontName || "",
        photoBackName: data.photoBackName || "",
        vehicleNumber: data.vehicleNumber,
        vehicleId: data.vehicleId,
        status: (data.status || "in_stock") as BlockStatus,
        dateReceived: data.dateReceived
          ? new Date(data.dateReceived).toISOString()
          : new Date().toISOString()
      };

      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
      setAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Block added successfully"
      });
    } catch (error) {
      console.error('Error adding block:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add block",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (field: keyof Block) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedBlocks = useMemo(() => {
    if (!blocks) return [];

    let filtered = blocks.filter(block => {
      const matchesSearch =
        block.blockNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.marka.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.mineName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || block.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return sortDirection === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [blocks, searchTerm, filterStatus, sortField, sortDirection]);

  const parsePhotoData = (photoUrl: string | null | any, photoName: string | null): PhotoData | undefined => {
    if (!photoUrl) return undefined;

    try {
      // If photoUrl is a string, return formatted object
      if (typeof photoUrl === 'string') {
        return {
          url: photoUrl,
          name: photoName || ''
        };
      }

      // If photoUrl is an object
      if (typeof photoUrl === 'object' && photoUrl !== null) {
        // Handle nested url property
        if (photoUrl.url) {
          return {
            url: photoUrl.url,
            name: photoName || photoUrl.name || ''
          };
        }
        // Handle stringified object
        try {
          const parsed = JSON.parse(photoUrl);
          return {
            url: parsed.url,
            name: photoName || parsed.name || ''
          };
        } catch {
          console.warn('Failed to parse photo URL:', photoUrl);
          return undefined;
        }
      }

      return undefined;
    } catch (e) {
      console.error('Error parsing photo data:', e);
      return undefined;
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="p-8 h-full space-y-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5 animate-gradient max-w-[1400px] mx-auto">
        <div className="relative">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Raw Materials</h1>
              <p className="text-muted-foreground">Manage and track your raw material inventory</p>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Block
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Block</DialogTitle>
                </DialogHeader>
                <BlockForm
                  onSubmit={handleSubmit}
                  onPhotoUpload={handlePhotoUpload}
                  isSubmitting={isSubmitting}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Total Blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredAndSortedBlocks.length || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Blocks in inventory</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-primary" />
                  Total Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatWeight(filteredAndSortedBlocks.reduce((sum, block) => sum + Number(block.blockWeight || 0), 0))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Combined block weight</p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  Recent Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {filteredAndSortedBlocks.filter(block => {
                    const date = new Date(block.dateReceived);
                    const now = new Date();
                    return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
                  }).length || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Blocks received this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search blocks by number, company, color or mine..."
                className="pl-10 h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px] h-12">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Container with proper scroll handling */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-lg border shadow-sm">
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <div style={{ minWidth: '1000px' }}>
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead onClick={() => handleSort("dateReceived")} className="w-[120px] cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Date
                            {sortField === "dateReceived" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("blockNumber")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Block Number
                            {sortField === "blockNumber" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("blockType")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Block Type
                            {sortField === "blockType" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("blockWeight")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Weight (T)
                            {sortField === "blockWeight" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="font-mono">Dimensions</TableHead>
                        <TableHead onClick={() => handleSort("color")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Color
                            {sortField === "color" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("marka")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Company
                            {sortField === "marka" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Vehicle ID</TableHead>
                        <TableHead onClick={() => handleSort("status")} className="cursor-pointer hover:text-primary transition-colors">
                          <div className="flex items-center gap-2">
                            Status
                            {sortField === "status" && (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedBlocks.map((block) => (
                        <TableRow
                          key={block.id}
                          className="group transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">
                            {block.dateReceived
                              ? new Date(block.dateReceived).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {block.blockNumber}
                          </TableCell>
                          <TableCell>{block.blockType}</TableCell>
                          <TableCell className="font-mono">
                            {block.blockWeight ? `${Number(block.blockWeight).toFixed(2)}T` : '-'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatDimensions(
                              Number(block.length),
                              Number(block.width),
                              Number(block.height)
                            )}
                          </TableCell>
                          <TableCell>{block.color}</TableCell>
                          <TableCell>{block.marka}</TableCell>
                          <TableCell>{block.vehicleId}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                block.status === "in_stock"
                                  ? "default"
                                  : block.status === "processing"
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {block.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog open={selectedBlockId === block.id} onOpenChange={(open) => {
                              setSelectedBlockId(open ? block.id : null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    setSelectedBlockId(block.id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Edit Block</DialogTitle>
                                </DialogHeader>
                                <BlockForm
                                  onSubmit={async (data) => {
                                    try {
                                      const formattedData = {
                                        ...data,
                                        length: Number(data.length),
                                        width: Number(data.width),
                                        height: Number(data.height),
                                        blockWeight: Number(data.blockWeight || 0),
                                        density: Number(data.density || 2.7),
                                        photoFrontUrl: data.frontPhoto?.url || "",
                                        photoBackUrl: data.backPhoto?.url || "",
                                        photoFrontName: data.photoFrontName || data.frontPhoto?.name || "",
                                        photoBackName: data.photoBackName || data.backPhoto?.name || "",
                                        vehicleNumber: data.vehicleNumber,
                                        vehicleId: data.vehicleId,
                                        status: data.status as BlockStatus,
                                        dateReceived: new Date(data.dateReceived).toISOString()
                                      };

                                      const response = await fetch(`/api/blocks/${block.id}`, {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json"
                                        },
                                        body: JSON.stringify(formattedData)
                                      });

                                      if (!response.ok) {
                                        throw new Error(`Failed to update block`);
                                      }

                                      toast({
                                        title: "Success",
                                        description: "Block updated successfully"
                                      });
                                      await queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
                                      setSelectedBlockId(null);
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: error instanceof Error ? error.message : "Failed to update block",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                  onPhotoUpload={handlePhotoUpload}
                                  initialData={{
                                    ...block,
                                    frontPhoto: parsePhotoData(block.photoFrontUrl, block.photoFrontName),
                                    backPhoto: parsePhotoData(block.photoBackUrl, block.photoBackName),
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}