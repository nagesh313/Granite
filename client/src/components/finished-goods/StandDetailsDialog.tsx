import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { GalleryDialog } from './GalleryDialog';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Image } from "lucide-react";

interface Stand {
  id: number;
  rowNumber: number;
  position: number;
  maxCapacity: number;
  currentSlabs: number;
  coverage: number;
}

interface StandDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStand: Stand | null;
}

interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  length: number;
  width: number;
  height: number;
  color: string;
}

interface FinishedGood {
  id: number;
  blockId: number;
  slabCount: number;
  stock_added_at: string;
  mediaCount: number;
  block: Block;
}

export function StandDetailsDialog({
  open,
  onOpenChange,
  selectedStand,
}: StandDetailsDialogProps) {
  const { data: finishedGoods = [], isLoading } = useQuery<FinishedGood[]>({
    queryKey: ["finished-goods", selectedStand?.id],
    queryFn: async () => {
      if (!selectedStand?.id) return [];
      const response = await fetch(`/api/finished-goods/by-stand/${selectedStand.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch finished goods");
      }
      return response.json();
    },
    enabled: !!selectedStand?.id && open,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [viewingGalleryId, setViewingGalleryId] = useState<number | null>(null);

  if (!selectedStand) return null;

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map((j) => (
                <div key={j}>
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const calculateCoverage = (item: FinishedGood) => {
    if (!item.block?.length || !item.block?.height) return 0;

    const lengthFt = Math.floor((item.block.length - 6) / 12) +
      (Math.floor(((item.block.length - 6) % 12) / 3) * 0.25);
    const heightFt = Math.floor((item.block.height - 6) / 12) +
      (Math.floor(((item.block.height - 6) % 12) / 3) * 0.25);

    return Math.round((lengthFt * heightFt * item.slabCount) * 100) / 100;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Stand Details - Row {selectedStand.rowNumber}, Position {selectedStand.position}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Capacity Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedStand.currentSlabs} / {selectedStand.maxCapacity} slabs
                  </span>
                </div>
                <Progress value={selectedStand.coverage} className="h-2" />
              </CardContent>
            </Card>

            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-4">
                {finishedGoods?.map((item) => (
                  <Card key={item.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-medium">Block Number</div>
                            <div className="text-sm font-semibold">{item.block.blockNumber}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium">Block Type</div>
                            <div className="text-sm">{item.block.blockType}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium">Dimensions (L×W×H)</div>
                            <div className="text-sm">
                              {item.block.length}″ × {item.block.width || '-'}″ × {item.block.height}″
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-medium">Color</div>
                            <div className="text-sm">{item.block.color}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium">Slabs</div>
                            <div className="text-sm">{item.slabCount}</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-medium">Coverage</div>
                            <div className="text-sm">
                              {calculateCoverage(item)} sq ft
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium">Added On</div>
                            <div className="text-sm">
                              {item.stock_added_at
                                ? new Date(item.stock_added_at).toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end border-t pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="transition-opacity"
                          onClick={() => setViewingGalleryId(item.id)}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          View Media {item.mediaCount > 0 ? `(${item.mediaCount})` : ''}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!isLoading && (!finishedGoods || finishedGoods.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    No finished goods in this stand
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {viewingGalleryId !== null && (
        <GalleryDialog
          open={viewingGalleryId !== null}
          onClose={() => setViewingGalleryId(null)}
          itemId={viewingGalleryId}
        />
      )}
    </>
  );
}