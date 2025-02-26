import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Camera, Video } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Stand {
  id: number;
  rowNumber: number;
  position: number;
  maxCapacity: number;
  currentSlabs: number;
  coverage: number;
}

const formSchema = z.object({
  standId: z.coerce.number(),
  blockId: z.coerce.number(),
  slabCount: z.coerce.number().min(1).max(200),
  stockAddedAt: z.string(),
  photos: z.array(z.object({ url: z.string() })),
  videos: z.array(z.object({ url: z.string() })),
});

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStand: Stand | null;
}

export function AddStockDialog({
  open,
  onOpenChange,
  selectedStand,
}: AddStockDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      standId: selectedStand?.id || 0,
      blockId: 0,
      slabCount: 1,
      stockAddedAt: new Date().toISOString().slice(0, 16),
      photos: [],
      videos: [],
    },
  });

  const { data: stands = [] } = useQuery<Stand[]>({
    queryKey: ["finished-goods-stands"],
    queryFn: async () => {
      const response = await fetch("/api/finished-goods/stands");
      if (!response.ok) throw new Error("Failed to fetch stands");
      return response.json();
    },
  });

  const { data: blocks } = useQuery({
    queryKey: ["available-blocks"],
    queryFn: async () => {
      const response = await fetch("/api/finished-goods/available-blocks");
      if (!response.ok) throw new Error("Failed to fetch available blocks");
      return response.json();
    },
  });

  const selectedStandData = stands.find(s => s.id === form.watch("standId"));
  const remainingCapacity = selectedStandData
    ? selectedStandData.maxCapacity - selectedStandData.currentSlabs
    : 0;

  const addStockMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const response = await fetch("/api/finished-goods/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-goods-stands"] });
      queryClient.invalidateQueries({ queryKey: ["finished-goods-summary"] });
      toast({
        title: "Success",
        description: "Stock added successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedStandData = stands.find(s => s.id === values.standId);
    if (!selectedStandData) return;

    const newTotal = Number(selectedStandData.currentSlabs || 0) + Number(values.slabCount);
    if (newTotal > 200) {
      toast({
        title: "Error",
        description: `Total would exceed maximum capacity of 200. Current: ${selectedStandData.currentSlabs}, Attempting to add: ${values.slabCount}`,
        variant: "destructive",
      });
      return;
    }
    addStockMutation.mutate(values);
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFiles(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const currentFiles = type === 'photo' ? form.getValues("photos") : form.getValues("videos");
        const updatedFiles = [...currentFiles, { url: base64String }];
        form.setValue(type === 'photo' ? "photos" : "videos", updatedFiles);
        setUploadingFiles(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (index: number, type: 'photo' | 'video') => {
    const currentFiles = type === 'photo' ? form.getValues("photos") : form.getValues("videos");
    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    form.setValue(type === 'photo' ? "photos" : "videos", updatedFiles);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="standId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stand</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stand" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stands.map((stand) => (
                        <SelectItem
                          key={stand.id}
                          value={stand.id.toString()}
                          className={selectedStand?.id === stand.id ? "bg-accent" : ""}
                        >
                          Row {stand.rowNumber} - Position {stand.position} ({stand.currentSlabs}/{stand.maxCapacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedStandData && (
                    <FormDescription>
                      Available capacity: {remainingCapacity} slabs
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blockId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Block</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(Number(value));
                      setSelectedBlock(blocks?.find((b: any) => b.id === Number(value)));
                    }}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {blocks?.map((block: any) => (
                        <SelectItem key={block.id} value={block.id.toString()}>
                          {block.blockNumber} - {block.blockType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBlock && (
                    <FormDescription>
                      Quality: {selectedBlock.quality}
                    </FormDescription>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slabCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Slabs</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={remainingCapacity}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum {remainingCapacity} slabs can be added to this stand
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stockAddedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Added Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Photos upload */}
            <FormItem>
              <FormLabel>Photos</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      if (input) {
                        input.capture = '';
                        input.click();
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      if (input) {
                        input.capture = 'environment';
                        input.click();
                      }
                    }}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'photo')}
                  disabled={uploadingFiles}
                />
              </div>
              {form.watch("photos").length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {form.watch("photos").map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Stock photo ${index + 1}`}
                        className="rounded-lg object-cover aspect-video"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index, 'photo')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </FormItem>

            {/* Videos upload */}
            <FormItem>
              <FormLabel>Videos</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('video-upload') as HTMLInputElement;
                      if (input) {
                        input.capture = '';
                        input.click();
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('video-upload') as HTMLInputElement;
                      if (input) {
                        input.capture = 'environment';
                        input.click();
                      }
                    }}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Record Video
                  </Button>
                </div>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                  disabled={uploadingFiles}
                />
              </div>
              {form.watch("videos").length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {form.watch("videos").map((video, index) => (
                    <div key={index} className="relative group">
                      <video
                        src={video.url}
                        controls
                        className="rounded-lg w-full aspect-video"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index, 'video')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </FormItem>

            <div className="space-x-2">
              <Button
                type="submit"
                disabled={addStockMutation.isPending || uploadingFiles}
              >
                {addStockMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}