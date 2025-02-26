import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";
import type { Block, Machine } from "@db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const formSchema = z.object({
  blockId: z.string().min(1, "Block selection is required"),
  machineId: z.string().min(1, "Machine selection is required"),
  stage: z.literal("polishing"),
  startTime: z.string(),
  endTime: z.string().optional(),
  totalSlabs: z.string().min(1, "At least one slab is required"),
  status: z.enum(["pending", "in_progress", "paused", "completed", "defective"]).default("pending"),
  stoppageReason: z.enum(["none", "power_outage", "maintenance"]).default("none"),
  stoppageStartTime: z.string().optional(),
  stoppageEndTime: z.string().optional(),
  maintenanceReason: z.string().optional(),
  comments: z.string().optional(),
  photos: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).default([]),
  measurements: z.object({
    polishingTime: z.number().min(0),
  }),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  machines: Machine[];
  eligibleBlocks: Block[];
  defaultValues?: any;
};

function formatDateForInput(dateStr: string | undefined | null) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

export function NewPolishJobCard({ machines, eligibleBlocks, defaultValues }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBlockSelect, setShowBlockSelect] = useState(false);

  useEffect(() => {
    if (defaultValues?.blockId && eligibleBlocks?.length > 0) {
      const selectedBlock = eligibleBlocks.find(b => b.id === parseInt(defaultValues.blockId));
      if (selectedBlock) {
        const displayValue = `${selectedBlock.blockNumber} - ${selectedBlock.blockType}${selectedBlock.marka ? ` - ${selectedBlock.marka}` : ''}`;
        setSearchQuery(displayValue);
      }
    }
  }, [defaultValues?.blockId, eligibleBlocks]);

  const filteredBlocks = eligibleBlocks?.filter(block =>
    block.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.blockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (block.marka || "").toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const showNoResults = searchQuery && filteredBlocks.length === 0 && !defaultValues?.blockId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      blockId: defaultValues?.blockId?.toString() || "",
      machineId: defaultValues?.machineId?.toString() || "",
      stage: "polishing",
      startTime: formatDateForInput(defaultValues?.startTime) || new Date().toISOString().slice(0, 16),
      endTime: formatDateForInput(defaultValues?.endTime) || "",
      totalSlabs: defaultValues?.totalSlabs?.toString() || "1",
      status: defaultValues?.status || "pending",
      stoppageReason: defaultValues?.stoppageReason || "none",
      stoppageStartTime: formatDateForInput(defaultValues?.stoppageStartTime),
      stoppageEndTime: formatDateForInput(defaultValues?.stoppageEndTime),
      maintenanceReason: defaultValues?.maintenanceReason || "",
      comments: defaultValues?.comments || "",
      photos: defaultValues?.photos || [],
      measurements: {
        polishingTime: defaultValues?.measurements?.polishingTime || 0,
      },
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const currentPhotos = form.getValues("photos") || [];
      form.setValue("photos", [...currentPhotos, { url: base64String, name: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index: number) => {
    const currentPhotos = form.getValues("photos");
    const newPhotos = [...currentPhotos];
    newPhotos.splice(index, 1);
    form.setValue("photos", newPhotos);
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.status === "completed" && !values.endTime) {
        throw new Error("End time must be set when marking job as completed");
      }

      try {
        const payload = {
          ...values,
          blockId: parseInt(values.blockId),
          machineId: parseInt(values.machineId),
          totalSlabs: parseInt(values.totalSlabs),
          measurements: {
            ...values.measurements,
            polishingTime: Number(values.measurements.polishingTime),
          },
        };

        console.log('Submitting polish job with values:', JSON.stringify(payload, null, 2));

        const endpoint = defaultValues?.id
          ? `/api/production-jobs/${defaultValues.id}`
          : "/api/production-jobs";

        const method = defaultValues?.id ? "PATCH" : "POST";

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to save job");
        }

        return response.json();
      } catch (error) {
        console.error('Job submission error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
      toast({
        title: defaultValues?.id ? "Job updated" : "Job created",
        description: defaultValues?.id
          ? "The polishing job has been updated successfully"
          : "New polishing job has been created successfully",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  if (!eligibleBlocks?.length) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">
          No blocks are currently eligible for polishing. Complete or skip the previous stages first.
        </p>
      </div>
    );
  }

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    mutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="blockId"
          render={({ field }) => {
            const selectedBlock = eligibleBlocks?.find(b => b.id === parseInt(field.value));
            return (
              <FormItem>
                <FormLabel>Block Number *</FormLabel>
                <Popover open={showBlockSelect} onOpenChange={setShowBlockSelect}>
                  <PopoverTrigger asChild>
                    <div className="flex items-center border rounded-md px-3">
                      <Input
                        placeholder="Search block number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search block number..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      {filteredBlocks.length > 0 ? (
                        <CommandGroup>
                          <ScrollArea className="h-[200px]">
                            {filteredBlocks.map((block) => (
                              <CommandItem
                                key={block.id}
                                value={`${block.blockNumber}-${block.blockType}-${block.marka || ''}`}
                                onSelect={() => {
                                  field.onChange(block.id.toString());
                                  const displayValue = `${block.blockNumber} - ${block.blockType}${block.marka ? ` - ${block.marka}` : ''}`;
                                  setSearchQuery(displayValue);
                                  setShowBlockSelect(false);
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
                        searchQuery && <CommandEmpty>No blocks found.</CommandEmpty>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
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
          render={({ field }) => {
            useEffect(() => {
              const lpm1 = machines.find(m => m.name === "Polishing-01");
              if (lpm1 && !field.value) {
                field.onChange(lpm1.id.toString());
              }
            }, [machines]);

            return (
              <FormItem>
                <FormLabel>Polishing Machine *</FormLabel>
                <FormControl>
                  <Input
                    value="LPM 01"
                    disabled
                    onChange={() => {}}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
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
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="totalSlabs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Slabs *</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="measurements.polishingTime"
          render={({ field }) => {
            useEffect(() => {
              const startTime = form.watch("startTime");
              const endTime = form.watch("endTime");

              if (startTime && endTime) {
                const start = new Date(startTime);
                const end = new Date(endTime);
                const diffInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

                if (diffInMinutes > 0) {
                  field.onChange(diffInMinutes);
                }
              }
            }, [form.watch("startTime"), form.watch("endTime")]);

            const minutes = field.value || 0;
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);

            return (
              <FormItem>
                <FormLabel>Polishing Time</FormLabel>
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

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defective">Defective</SelectItem>
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stoppage reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Stoppage</SelectItem>
                  <SelectItem value="power_outage">Power Outage</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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
                    <FormLabel>Stoppage Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stoppageEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoppage End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maintenanceReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Details</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter maintenance details" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="photos"
          render={() => (
            <FormItem>
              <FormLabel>Photos</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
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
                        Upload Photos
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {form.watch("photos").length} photos selected
                    </span>
                  </div>

                  {form.watch("photos").length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {form.watch("photos").map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.name || `Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
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
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Add any additional comments" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.id ? "Update Job" : "Create Job"}
        </Button>
      </form>
    </Form>
  );
}