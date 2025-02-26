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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera, Search } from "lucide-react";
import type { Machine, ProductionJob, Block } from "@db/schema";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  machineId: z.number().min(1, "Must select a machine"),
  stage: z.literal("grinding"),
  status: z.enum(["in_progress", "completed", "paused", "cancelled"]).default("in_progress"),
  startTime: z.string(),
  endTime: z.string().optional(),
  stoppageReason: z.enum(["none", "power_outage", "other"]).default("none"),
  maintenanceReason: z.string().optional(),
  stoppageStartTime: z.string().optional(),
  stoppageEndTime: z.string().optional(),
  blockId: z.number().min(1, "Must select a block"),
  pieces: z.number().min(1, "Must have at least 1 piece"),
  qualityCheckStatus: z.enum(["pending", "passed", "failed"]).default("pending"),
  operatorNotes: z.string().optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).default([]),
  measurements: z.object({
    finish: z.enum(["Lappato", "Normal"]),
  }).optional(),
  grindingTime: z.number().optional(), // Added grindingTime field
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  machines: Machine[];
  defaultValues?: Partial<FormValues> & { id?: number };
};

export function NewGrindingJobCard({ machines, defaultValues }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlockSelectOpen, setIsBlockSelectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Update query to include jobId when editing
  const { data: blocks, isLoading: isLoadingBlocks } = useQuery<Block[]>({
    queryKey: ["/api/blocks/eligible/grinding", defaultValues?.id],
    queryFn: async () => {
      const url = defaultValues?.id
        ? `/api/blocks/eligible/grinding?jobId=${defaultValues.id}`
        : "/api/blocks/eligible/grinding";
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch blocks');
      return response.json();
    }
  });

  const availableBlocks = blocks || [];
  const availableMachines = machines.filter(machine => machine.type === 'grinding');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ? {
      machineId: defaultValues.machineId ?? machines[0]?.id ?? 0,
      stage: "grinding",
      status: defaultValues.status || "in_progress",
      startTime: defaultValues.startTime ? new Date(defaultValues.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      endTime: defaultValues.endTime ? new Date(defaultValues.endTime).toISOString().slice(0, 16) : undefined,
      blockId: defaultValues.blockId ?? 0,
      pieces: defaultValues.pieces ?? 1,
      qualityCheckStatus: defaultValues.qualityCheckStatus || "pending",
      operatorNotes: defaultValues.operatorNotes || "",
      comments: defaultValues.comments || "",
      photos: defaultValues.photos || [],
      stoppageReason: defaultValues.stoppageReason || "none",
      maintenanceReason: defaultValues.maintenanceReason || "",
      stoppageStartTime: defaultValues.stoppageStartTime ? new Date(defaultValues.stoppageStartTime).toISOString().slice(0, 16) : undefined,
      stoppageEndTime: defaultValues.stoppageEndTime ? new Date(defaultValues.stoppageEndTime).toISOString().slice(0, 16) : undefined,
      measurements: {
        finish: defaultValues.measurements?.finish || "Lappato",
      },
      grindingTime: defaultValues.grindingTime ?? 0
    } : {
      machineId: machines[0]?.id ?? 0,
      stage: "grinding",
      status: "in_progress",
      startTime: new Date().toISOString().slice(0, 16),
      blockId: 0,
      pieces: 1,
      qualityCheckStatus: "pending",
      operatorNotes: "",
      comments: "",
      photos: [],
      stoppageReason: "none",
      maintenanceReason: "",
      measurements: {
        finish: "Lappato"
      },
      grindingTime: 0
    },
  });

  useEffect(() => {
    if (defaultValues?.blockId && blocks?.length > 0) {
      const selectedBlock = blocks.find(b => b.id === defaultValues.blockId);
      if (selectedBlock) {
        const displayValue = `${selectedBlock.blockNumber} - ${selectedBlock.blockType}${selectedBlock.marka ? ` - ${selectedBlock.marka}` : ''}`;
        setSearchQuery(displayValue);
        form.setValue("blockId", defaultValues.blockId, { shouldDirty: false });
      }
    }
  }, [defaultValues?.blockId, blocks, form, setSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const commandElement = document.querySelector('.command-wrapper');
      if (commandElement && !commandElement.contains(event.target as Node)) {
        setIsBlockSelectOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createJob = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.status === "completed" && !values.endTime) {
        throw new Error("End time must be set when marking job as completed");
      }

      const endpoint = defaultValues ? `/api/production-jobs/${defaultValues.id}` : "/api/production-jobs";
      const method = defaultValues ? "PATCH" : "POST";

      const payload = {
        machineId: values.machineId,
        blockId: values.blockId,
        stage: values.stage,
        status: values.status,
        startTime: new Date(values.startTime).toISOString(),
        endTime: values.endTime ? new Date(values.endTime).toISOString() : null,
        totalSlabs: Number(values.pieces),
        processedPieces: defaultValues?.processedPieces || 0,
        qualityCheckStatus: values.qualityCheckStatus,
        operatorNotes: values.operatorNotes || null,
        comments: values.comments || null,
        photos: values.photos,
        measurements: {
          pieces: values.pieces,
          stoppageReason: values.stoppageReason,
          maintenanceReason: values.maintenanceReason,
          stoppageStartTime: values.stoppageStartTime ? new Date(values.stoppageStartTime).toISOString() : null,
          stoppageEndTime: values.stoppageEndTime ? new Date(values.stoppageEndTime).toISOString() : null,
          photos: values.photos,
          finish: values.measurements?.finish,
          grindingTime: values.grindingTime //Added grindingTime to measurements
        },
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save job");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
      toast({
        title: "Success",
        description: defaultValues ? "Job updated successfully" : "Grinding job created successfully",
      });
      if (!defaultValues) {
        form.reset();
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

  function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    createJob.mutate(values);
  }

  if (isLoadingBlocks && !defaultValues) {
    return (
      <div className="p-4 text-center">
        <p>Loading blocks...</p>
      </div>
    );
  }

  if (availableBlocks?.length === 0 && !defaultValues) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">No blocks are currently eligible for grinding. Complete the cutting stage for blocks first.</p>
      </div>
    );
  }

  if (!availableMachines.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">No available grinding machines found.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grinding Machine *</FormLabel>
              <FormControl>
                <Input
                  value="Grinding-01"
                  disabled
                  onChange={() => { }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="blockId"
          render={({ field }) => {
            const selectedBlock = availableBlocks.find(b => b.id === field.value);
            const filteredBlocks = availableBlocks.filter(block =>
              block.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              block.blockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (block.marka || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <FormItem className="relative">
                <FormLabel>Block Number *</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Command className="border rounded-md w-full command-wrapper">
                      <CommandInput
                        placeholder="Search block number..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        className="h-9 w-full cursor-pointer"
                        onClick={() => setIsBlockSelectOpen(!isBlockSelectOpen)}
                      />
                      {isBlockSelectOpen && availableBlocks.length > 0 && (
                        <div className="absolute left-0 right-0 top-[100%] z-50">
                          <div className="relative mt-1">
                            <div className="absolute w-full bg-popover rounded-md border shadow-md">
                              <ScrollArea className="h-[200px] w-full rounded-md">
                                <CommandGroup>
                                  {filteredBlocks.length > 0 ? (
                                    filteredBlocks.map((block) => (
                                      <CommandItem
                                        key={block.id}
                                        value={`${block.blockNumber}-${block.blockType}-${block.marka || ''}`}
                                        onSelect={() => {
                                          field.onChange(block.id);
                                          setSearchQuery(`${block.blockNumber} - ${block.blockType}${block.marka ? ` - ${block.marka}` : ''}`);
                                          setIsBlockSelectOpen(false);
                                        }}
                                        className="cursor-pointer p-3 hover:bg-accent w-full flex flex-col gap-1"
                                      >
                                        <div className="flex flex-col w-full">
                                          <span className="font-medium">{block.blockNumber}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {block.blockType}{block.marka ? ` - ${block.marka}` : ''}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))
                                  ) : (
                                    <div className="p-3 text-sm text-muted-foreground">
                                      No matching blocks found
                                    </div>
                                  )}
                                </CommandGroup>
                              </ScrollArea>
                            </div>
                          </div>
                        </div>
                      )}
                    </Command>
                  </FormControl>
                </div>
                {selectedBlock && (
                  <p className="text-sm text-muted-foreground mt-2 px-1">
                    Selected: {selectedBlock.blockNumber} - {selectedBlock.blockType}
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
          name="pieces"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Slabs *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => field.onChange(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="measurements.finish"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Finish Type *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select finish type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Lappato">Lappato</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <Input type="datetime-local" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grindingTime"
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
              }, [form.watch("startTime"), form.watch("endTime"), field.onChange]);

              const minutes = field.value || 0;
              const hours = Math.floor(minutes / 60);
              const remainingMinutes = Math.round(minutes % 60);

              return (
                <FormItem>
                  <FormLabel>Grinding Time</FormLabel>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stoppageStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoppage Start Time *</FormLabel>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value || ""}
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
                      value={field.value || ""}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

        {defaultValues && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
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
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <Textarea
                placeholder="Add any additional notes or comments"
                {...field}
                value={field.value || ""}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Grinding Photos</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      if (input) input.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result as string;
                        const currentPhotos = form.getValues("photos") || [];
                        form.setValue("photos", [...currentPhotos, { url: base64String, name: file.name }]);
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
                    </div>
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
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