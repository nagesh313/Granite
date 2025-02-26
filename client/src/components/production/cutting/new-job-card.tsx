import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Camera } from "lucide-react";
import type { Machine, Blade, Block } from "@db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";

// Updated types for measurements
type Measurements = {
  segmentHeights: { bladeId: number; height: number }[];
  stoppageReason: "none" | "power_outage" | "other";
  maintenanceReason?: string;
  stoppageStartTime?: string;
  stoppageEndTime?: string;
  brazingNumber?: number;
  trolleyNumber: number;
  totalArea: number;
};

type ProductionJob = {
  id?: number;
  blockId: number;
  machineId: number;
  stage: "cutting";
  status: "in_progress" | "completed" | "paused" | "cancelled";
  processedPieces?: number;
  qualityCheckStatus?: "pending" | "passed" | "failed";
  operatorNotes?: string;
  comments?: string;
  startTime: string;
  endTime?: string;
  measurements: Measurements;
  photos: { url: string; name: string; }[];
  totalSlabs: number;
};

const formSchema = z.object({
  blockId: z.number(),
  machineId: z.number(),
  stage: z.literal("cutting"),
  status: z.enum(["in_progress", "completed", "paused", "cancelled"]).optional(),
  processedPieces: z.number().min(0, "Must be a positive number").optional(),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
  operatorNotes: z.string().optional(),
  comments: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  segmentHeights: z.array(z.object({
    bladeId: z.number(),
    height: z.number().min(0, "Must be a positive number")
  })).length(14, "Must provide segment heights for all 14 blades"),
  trolleyNumber: z.number().int().min(1, "Trolley number must be a positive integer"),
  totalSlabs: z.number().min(1, "Total slabs is required and must be at least 1"),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).default([]),
  stoppageReason: z.enum(["none", "power_outage", "other"]).default("none"),
  maintenanceReason: z.string().optional(),
  stoppageStartTime: z.string().optional(),
  stoppageEndTime: z.string().optional(),
  brazingNumber: z.number().int().min(0, "Brazing number must be a positive integer").optional(),
  measurements: z.object({
    totalArea: z.number()
  }),
  cuttingTime: z.number().optional()
});

type Props = {
  machines: Machine[];
  blades: Blade[];
  defaultValues?: ProductionJob;
};

export function NewCuttingJobCard({ machines, blades, defaultValues }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: blocks, isLoading: isLoadingBlocks } = useQuery<Block[]>({
    queryKey: ["/api/blocks/eligible/cutting", defaultValues?.id],
    queryFn: async () => {
      const url = defaultValues?.id
        ? `/api/blocks/eligible/cutting?jobId=${defaultValues.id}`
        : "/api/blocks/eligible/cutting";
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch blocks');
      return response.json();
    }
  });

  const availableBlocks = blocks || [];

  const defaultSegmentHeights = Array.from({ length: 14 }, (_, i) => ({
    bladeId: i + 1,
    height: defaultValues?.measurements?.segmentHeights?.[i]?.height || 0
  }));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      blockId: defaultValues?.blockId || undefined, // Initialize as undefined if no default value
      machineId: defaultValues?.machineId || machines[0]?.id,
      stage: "cutting",
      status: defaultValues?.status || "in_progress",
      processedPieces: defaultValues?.processedPieces || 0,
      qualityCheckStatus: defaultValues?.qualityCheckStatus || "pending",
      operatorNotes: defaultValues?.operatorNotes || "",
      comments: defaultValues?.comments || "",
      segmentHeights: defaultValues?.measurements?.segmentHeights || defaultSegmentHeights,
      trolleyNumber: defaultValues?.measurements?.trolleyNumber || 1,
      totalSlabs: defaultValues?.totalSlabs || 1,
      photos: defaultValues?.photos || [],
      stoppageReason: defaultValues?.measurements?.stoppageReason || "none",
      maintenanceReason: defaultValues?.measurements?.maintenanceReason || "",
      stoppageStartTime: defaultValues?.measurements?.stoppageStartTime || "",
      stoppageEndTime: defaultValues?.measurements?.stoppageEndTime || "",
      startTime: defaultValues?.startTime ? new Date(defaultValues.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      endTime: defaultValues?.endTime ? new Date(defaultValues.endTime).toISOString().slice(0, 16) : "",
      brazingNumber: defaultValues?.measurements?.brazingNumber,
      measurements: {
        totalArea: defaultValues?.measurements?.totalArea || 0
      },
      cuttingTime: defaultValues?.endTime ? Math.floor((new Date(defaultValues.endTime).getTime() - new Date(defaultValues.startTime).getTime()) / (1000 * 60)) : 0
    }
  });

  // Move useEffect after form initialization and update dependencies
  useEffect(() => {
    if (defaultValues?.blockId && blocks?.length > 0) {
      const selectedBlock = blocks.find(b => b.id === defaultValues.blockId);
      if (selectedBlock) {
        const displayValue = `${selectedBlock.blockNumber} - ${selectedBlock.blockType}${selectedBlock.marka ? ` - ${selectedBlock.marka}` : ''}`;
        setSearchQuery(displayValue);
        // Ensure we're setting both the form value and the search query
        form.setValue("blockId", defaultValues.blockId, { shouldDirty: false });
      }
    }
  }, [defaultValues?.blockId, blocks, form, setSearchQuery]);

  const filteredBlocks = searchQuery
    ? availableBlocks.filter(block =>
        block.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        block.blockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (block.marka || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableBlocks;

  const selectedBlock = availableBlocks.find(b => b.id === form.getValues("blockId"));
  const showNoResults = searchQuery && filteredBlocks.length === 0 && !selectedBlock;

  const createJob = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const endpoint = defaultValues ? `/api/production-jobs/${defaultValues.id}` : "/api/production-jobs";
      const method = defaultValues ? "PATCH" : "POST";

      const payload = {
        ...values,
        startTime: values.startTime ? new Date(values.startTime).toISOString() : null,
        endTime: values.endTime ? new Date(values.endTime).toISOString() : null,
        totalSlabs: values.totalSlabs,
        measurements: {
          segmentHeights: values.segmentHeights,
          stoppageReason: values.stoppageReason || "none",
          maintenanceReason: values.maintenanceReason || "",
          stoppageStartTime: values.stoppageStartTime && values.stoppageReason !== "none" ? new Date(values.stoppageStartTime).toISOString() : null,
          stoppageEndTime: values.stoppageEndTime && values.stoppageReason !== "none" ? new Date(values.stoppageEndTime).toISOString() : null,
          brazingNumber: values.brazingNumber,
          trolleyNumber: values.trolleyNumber,
          totalArea: values.measurements.totalArea
        },
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to save job");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
      toast({
        title: "Success",
        description: defaultValues ? "Job updated successfully" : "Cutting job created successfully",
      });
      if (!defaultValues) {
        form.reset();
      }
      // Close the dialog
      const dialogElement = document.querySelector('[role="dialog"]');
      if (dialogElement) {
        const closeButton = dialogElement.querySelector('button[aria-label="Close"]');
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.click();
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.status === 'completed' && (!values.endTime || values.endTime.trim() === '')) {
      toast({
        title: "Validation Error",
        description: "End time is required when marking job as completed",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    createJob.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="blockId"
          render={({ field }) => {
            const selectedBlock = availableBlocks.find(b => b.id === field.value);
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Block Number *</FormLabel>
                <Command
                  className="border rounded-md overflow-visible"
                  shouldFilter={false}
                  onClick={() => setOpen(true)}
                >
                  <div className="flex items-center border-b px-3">
                    <CommandInput
                      placeholder="Search block number..."
                      className="h-9 flex-1 min-w-[300px]"
                      value={searchQuery}
                      onValueChange={(value) => {
                        setSearchQuery(value);
                        if (!open) setOpen(true);
                      }}
                    />
                  </div>
                  <div>
                    {(filteredBlocks.length > 0 || !searchQuery) ? (
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {filteredBlocks.map((block) => (
                            <CommandItem
                              key={block.id}
                              value={`${block.blockNumber}-${block.blockType}-${block.marka || ''}`}
                              onSelect={() => {
                                field.onChange(block.id);
                                const displayValue = `${block.blockNumber} - ${block.blockType}${block.marka ? ` - ${block.marka}` : ''}`;
                                setSearchQuery(displayValue);
                                setOpen(false);
                              }}
                            >
                              <div className="flex items-center">
                                {block.blockNumber} - {block.blockType}
                                {block.marka && ` - ${block.marka}`}
                              </div>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    ) : (
                      showNoResults && <CommandEmpty>No blocks found.</CommandEmpty>
                    )}
                  </div>
                </Command>
                {selectedBlock && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedBlock.blockNumber} - {selectedBlock.blockType}
                    {selectedBlock.marka && ` - ${selectedBlock.marka}`}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cutting Machine *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value ? field.value.toString() : undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {machines
                    .filter(machine => machine.type.toLowerCase() === 'cutting')
                    .map((machine) => (
                      <SelectItem
                        key={machine.id}
                        value={machine.id.toString()}
                      >
                        {machine.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {defaultValues && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="brazingNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brazing Number</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="Enter brazing number"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Blade Measurements *</h3>
          <div className="border rounded-lg p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blade Number</TableHead>
                  <TableHead>Segment Height (mm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 14 }, (_, i) => i + 1).map((bladeNumber, index) => (
                  <TableRow key={bladeNumber}>
                    <TableCell className="font-medium">Blade {bladeNumber}</TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`segmentHeights.${index}.height`}
                        render={({ field }) => (
                          <FormItem className="m-0">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="Enter height in mm"
                                className="w-32"
                                {...field}
                                onChange={(e) => {
                                  const newHeights = [...form.getValues("segmentHeights")];
                                  newHeights[index] = {
                                    bladeId: bladeNumber,
                                    height: Math.max(0, parseFloat(e.target.value) || 0)
                                  };
                                  form.setValue("segmentHeights", newHeights);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <FormField
          control={form.control}
          name="trolleyNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trolley No. *</FormLabel>
              <Input
                type="number"
                min="1"
                step="1"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalSlabs"
          render={({ field }) => {
            const selectedBlock = blocks?.find(b => b.id === form.getValues("blockId"));

            useEffect(() => {
              if (selectedBlock && field.value) {
                const totalSlabs = parseInt(field.value) || 0;
                if (selectedBlock.length && selectedBlock.height && totalSlabs) {
                  // Calculate adjusted length and height
                  const adjustedLength = (selectedBlock.length - 6) / 12;
                  const adjustedHeight = (selectedBlock.height - 6) / 12;

                  // Round down to nearest quarter
                  const roundedLength = Math.floor(adjustedLength * 4) / 4;
                  const roundedHeight = Math.floor(adjustedHeight * 4) / 4;

                  // Calculate total area
                  const area = roundedLength * roundedHeight * totalSlabs;
                  form.setValue("measurements.totalArea", area);
                }
              }
            }, [selectedBlock, field.value]);

            return (
              <FormItem>
                <FormLabel>Total Number of Slabs *</FormLabel>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  onChange={(e) => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    field.onChange(value);
                  }}
                />
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="measurements.totalArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Area (sqft)</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  value={field.value ? parseFloat(field.value).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : ''} 
                  readOnly 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stoppageReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Stoppage</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stoppage reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Stoppage</SelectItem>
                  <SelectItem value="power_outage">Power Outage</SelectItem>
                  <SelectItem value="other">Other Reason</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("stoppageReason") !== "none" && (
          <>
            <FormField
              control={form.control}
              name="stoppageStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stoppage Start Time *</FormLabel>
                  <Input
                    type="datetime-local"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stoppageEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stoppage End Time *</FormLabel>
                  <Input
                    type="datetime-local"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("stoppageReason") === "other" && (
              <FormField
                control={form.control}
                name="maintenanceReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Details *</FormLabel>
                    <Textarea
                      placeholder="Enter maintenance details"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value || ""}
                    disabled={form.watch('status') !== 'completed'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cuttingTime"
            render={({ field }) => {
              useEffect(() => {
                const startTime = form.watch("startTime");
                const endTime = form.watch("endTime");
                if (startTime && endTime) {
                  const start = new Date(startTime);
                  const end = new Date(endTime);
                  const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
                  if (diffInMinutes >= 0) {
                    field.onChange(diffInMinutes);
                  }
                }
              }, [form.watch("startTime"), form.watch("endTime"), field]);

              const minutes = field.value || 0;
              const hours = Math.floor(minutes / 60);
              const remainingMinutes = minutes % 60;

              return (
                <FormItem>
                  <FormLabel>Cutting Time</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={`${hours} hours ${remainingMinutes} minutes`}
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>




        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <Textarea
                placeholder="Add any additional notes or comments about the cutting process"
                className="h-32"
                {...field}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Post Cutting Photos</FormLabel>
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
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64String = reader.result as string;
                    const currentPhotos = form.getValues("photos") || [];
                    form.setValue("photos", [...currentPhotos, { url: base64String, name: '' }]);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          {form.watch("photos").length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {form.watch("photos").map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.name || `Production photo ${index + 1}`}
                    className="rounded-lg object-cover aspect-video"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
                    <Input
                      placeholder="Enter image name"
                      value={photo.name}
                      onChange={(e) => {
                        const currentPhotos = form.getValues("photos");
                        const updatedPhotos = currentPhotos.map((p, i) =>
                          i === index ? { ...p, name: e.target.value } : p
                        );
                        form.setValue("photos", updatedPhotos);
                      }}
                      className="text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const currentPhotos = form.getValues("photos");
                      const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
                      form.setValue("photos", updatedPhotos);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </FormItem>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || isLoadingBlocks}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {defaultValues ? "Updating..." : "Creating..."}
              </>
            ) : (
              defaultValues ? "Update Job" : "Create Job"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}