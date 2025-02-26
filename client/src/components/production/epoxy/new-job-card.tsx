import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Block } from "@db/schema";
import { Upload, X, Loader2, Camera, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

// Add type definition for measurements
type Measurements = {
  chemicalName?: string;
  coverage?: string;
  issueQuantity?: string;
  returnQuantity?: string;
  netQuantity?: string;
  resinIssueQuantity?: number;
  resinReturnQuantity?: number;
  resinNetQuantity?: number;
  hardnerIssueQuantity?: number;
  hardnerReturnQuantity?: number;
  hardnerNetQuantity?: number;
  totalNetQuantity?: number;
  totalArea?: string;
};

const formSchema = z.object({
  blockId: z.string().min(1, "Block is required"),
  stage: z.literal("epoxy"),
  status: z.enum(["pending", "in_progress", "completed", "skipped", "defective"]).default("pending"),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  measurements: z.object({
    chemicalName: z.string().optional(),
    coverage: z.string().optional(),
    issueQuantity: z.string().optional(),
    returnQuantity: z.string().optional(),
    netQuantity: z.string().optional(),
    resinIssueQuantity: z.number().default(0),
    resinReturnQuantity: z.number().default(0),
    resinNetQuantity: z.number().default(0),
    hardnerIssueQuantity: z.number().default(0),
    hardnerReturnQuantity: z.number().default(0),
    hardnerNetQuantity: z.number().default(0),
    totalNetQuantity: z.number().default(0),
    totalArea: z.string().optional(),
  }).nullable(),
  comments: z.string().optional(),
  cuttingTime: z.number().optional(),
  grindingTime: z.number().optional(),
  chemicalTime: z.number().optional(),
  epoxyTime: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  blocks: Block[];
  defaultValues?: any;
  onSettled?: () => void;
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

export function NewJobCard({ blocks, defaultValues, onSettled }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Fetch jobs for getting cutting stage info
  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/production-jobs"],
  });

  // Initialize searchQuery with selected block's details if editing
  useEffect(() => {
    if (defaultValues?.blockId && blocks?.length) {
      const selectedBlock = blocks.find(b => b.id === parseInt(defaultValues.blockId));
      if (selectedBlock) {
        const displayValue = `${selectedBlock.blockNumber} - ${selectedBlock.blockType}${selectedBlock.marka ? ` - ${selectedBlock.marka}` : ''}`;
        setSearchQuery(displayValue);
      }
    }
  }, [defaultValues?.blockId, blocks]);

  // Get initial totalArea from cutting job
  const getInitialTotalArea = () => {
    if (!defaultValues?.blockId || !jobs?.length) return "";

    const cuttingJob = jobs
      .filter((job: any) =>
        job.blockId === parseInt(defaultValues.blockId) &&
        job.stage === "cutting" &&
        job.status === "completed" &&
        job.measurements?.totalArea !== undefined &&
        job.measurements?.totalArea !== null
      )
      .sort((a: any, b: any) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )[0];

    form.setValue("measurements.totalArea", cuttingJob?.measurements?.totalArea || 0);
    return cuttingJob?.measurements?.totalArea?.toString() || "0.00";
  };

  // Initialize form with proper default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: defaultValues ? {
      ...defaultValues,
      blockId: defaultValues.blockId?.toString() || "",
      stage: "epoxy" as const,
      status: defaultValues.status || "pending",
      startTime: formatDateForInput(defaultValues.startTime) || new Date().toISOString().slice(0, 16),
      endTime: formatDateForInput(defaultValues.endTime) || "",
      measurements: defaultValues.status === "skipped" ? null : {
        chemicalName: defaultValues.measurements?.chemicalName || "",
        coverage: defaultValues.measurements?.coverage || "",
        issueQuantity: defaultValues.measurements?.issueQuantity || "",
        returnQuantity: defaultValues.measurements?.returnQuantity || "",
        netQuantity: defaultValues.measurements?.netQuantity || "",
        resinIssueQuantity: Number(defaultValues.measurements?.resinIssueQuantity || 0),
        resinReturnQuantity: Number(defaultValues.measurements?.resinReturnQuantity || 0),
        resinNetQuantity: Number(defaultValues.measurements?.resinNetQuantity || 0),
        hardnerIssueQuantity: Number(defaultValues.measurements?.hardnerIssueQuantity || 0),
        hardnerReturnQuantity: Number(defaultValues.measurements?.hardnerReturnQuantity || 0),
        hardnerNetQuantity: Number(defaultValues.measurements?.hardnerNetQuantity || 0),
        totalNetQuantity: Number(defaultValues.measurements?.totalNetQuantity || 0),
        totalArea: defaultValues.measurements?.totalArea?.toString() || getInitialTotalArea(),
      },
      comments: defaultValues.comments || "",
      cuttingTime: defaultValues.cuttingTime,
      grindingTime: defaultValues.grindingTime,
      chemicalTime: defaultValues.chemicalTime,
      epoxyTime: defaultValues.epoxyTime,
    } : {
      blockId: "",
      stage: "epoxy" as const,
      status: "pending",
      startTime: new Date().toISOString().slice(0, 16),
      endTime: "",
      measurements: {
        chemicalName: "",
        coverage: "",
        issueQuantity: "",
        returnQuantity: "",
        netQuantity: "",
        resinIssueQuantity: 0,
        resinReturnQuantity: 0,
        resinNetQuantity: 0,
        hardnerIssueQuantity: 0,
        hardnerReturnQuantity: 0,
        hardnerNetQuantity: 0,
        totalNetQuantity: 0,
        totalArea: "",
      },
      comments: "",
      cuttingTime: 0,
      grindingTime: 0,
      chemicalTime: 0,
      epoxyTime: 0,
    }
  });

  // Effect to update totalArea when blockId changes
  useEffect(() => {
    const blockId = form.getValues("blockId");
    if (!blockId || !jobs?.length) return;

    const cuttingJob = jobs
      .filter((job: any) =>
        job.blockId === parseInt(blockId) &&
        job.stage === "cutting" &&
        job.measurements?.totalArea
      )
      .sort((a: any, b: any) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )[0];

    if (cuttingJob?.measurements?.totalArea) {
      form.setValue("measurements.totalArea", cuttingJob.measurements.totalArea.toString());
    }
  }, [form.watch("blockId"), jobs]);

  const status = form.watch("status");
  const isSkipped = status === "skipped";

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      try {
        // Validate end time for completed status
        if (values.status === "completed" && !values.endTime) {
          throw new Error("End time must be set when marking job as completed");
        }

        let payload = {
          ...values,
          blockId: parseInt(values.blockId),
          stage: "epoxy" as const,
          status: values.status,
          startTime: isSkipped ? null : values.startTime,
          endTime: values.status === 'completed' ? values.endTime : null,
          measurements: isSkipped ? null : values.measurements,
        };

        console.log('Submitting epoxy job with values:', JSON.stringify(payload, null, 2));

        const endpoint = defaultValues?.id
          ? `/api/production-jobs/${defaultValues.id}`
          : "/api/production-jobs";

        const response = await fetch(endpoint, {
          method: defaultValues?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to save job");
        }

        return await response.json();
      } catch (error) {
        console.error('Job submission error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
      toast({
        title: "Success",
        description: defaultValues?.id
          ? "Epoxy job updated successfully"
          : isSkipped
            ? "Epoxy stage skipped successfully"
            : "New epoxy job created successfully",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
      onSettled && onSettled();
    },
  });

  const handleSubmit = (data: FormValues) => {
    if (isSkipped) {
      // If skipping, ensure required fields are properly nullified
      data = {
        ...data,
        startTime: null,
        endTime: null,
        measurements: null,
        comments: data.comments || "Stage skipped",
      };
    }
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  // Only show error message if we truly have no blocks AND we're not editing an existing job
  if (!blocks?.length && !defaultValues?.id) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">
          No blocks are currently eligible for epoxy treatment.
          <br />
          Chemical conversion stage must be completed or skipped first.
        </p>
      </div>
    );
  }

  const filteredBlocks = blocks.filter(block =>
    `${block.blockNumber}-${block.blockType}-${block.marka || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showNoResults = open && searchQuery && filteredBlocks.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4 pr-4">
            <FormField
              control={form.control}
              name="blockId"
              render={({ field }) => {
                const selectedBlock = blocks?.find(b => b.id === parseInt(field.value));
                const displayValue = selectedBlock
                  ? `${selectedBlock.blockNumber} - ${selectedBlock.blockType}${selectedBlock.marka ? ` - ${selectedBlock.marka}` : ''}`
                  : '';

                return (
                  <FormItem>
                    <FormLabel>Block Number *</FormLabel>
                    {defaultValues ? (
                      <FormControl>
                        <Input
                          value={displayValue}
                          disabled
                        />
                      </FormControl>
                    ) : (
                      <div className="relative">
                        <Command shouldFilter={false}>
                          <div className="flex items-center border-b px-3">
                            <CommandInput
                              placeholder="Search block number..."
                              value={searchQuery}
                              onValueChange={(value) => {
                                setSearchQuery(value);
                                setOpen(true);
                              }}
                              className="h-9 flex-1 min-w-[300px]"
                            />
                          </div>
                          {open && (
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
                          )}
                          {showNoResults && (
                            <CommandEmpty>No blocks found.</CommandEmpty>
                          )}
                        </Command>
                      </div>
                    )}
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
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "skipped") {
                        form.setValue("comments", "Add reason for skipping epoxy stage");
                      } else if (form.getValues("comments") === "Add reason for skipping epoxy stage") {
                        form.setValue("comments", "");
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="skipped">Skipped</SelectItem>
                      <SelectItem value="defective">Defective</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSkipped && (
              <>
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value || new Date().toISOString().slice(0, 16)}
                        />
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
                      <FormLabel>End Time *</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="epoxyTime"
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
                    }, [form.watch("startTime"), form.watch("endTime")]);

                    const minutes = field.value || 0;
                    const hours = Math.floor(minutes / 60);
                    const remainingMinutes = Math.round(minutes % 60);

                    return (
                      <FormItem>
                        <FormLabel>Epoxy Time</FormLabel>
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
                  name="measurements.chemicalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chemical Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="measurements.resinIssueQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resin Issue Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                field.onChange(value);
                                const returnQty = form.getValues("measurements.resinReturnQuantity") || 0;
                                const netQty = value - returnQty;
                                form.setValue("measurements.resinNetQuantity", netQty);
                                const hardnerNet = form.getValues("measurements.hardnerNetQuantity") || 0;
                                form.setValue("measurements.totalNetQuantity", netQty + hardnerNet);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="measurements.resinReturnQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resin Return Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                field.onChange(value);
                                const issueQty = form.getValues("measurements.resinIssueQuantity") || 0;
                                const netQty = issueQty - value;
                                form.setValue("measurements.resinNetQuantity", netQty);
                                const hardnerNet = form.getValues("measurements.hardnerNetQuantity") || 0;
                                form.setValue("measurements.totalNetQuantity", netQty + hardnerNet);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="measurements.resinNetQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resin Net Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="measurements.hardnerIssueQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hardner Issue Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                field.onChange(value);
                                const returnQty = form.getValues("measurements.hardnerReturnQuantity") || 0;
                                const netQty = value - returnQty;
                                form.setValue("measurements.hardnerNetQuantity", netQty);
                                const resinNet = form.getValues("measurements.resinNetQuantity") || 0;
                                form.setValue("measurements.totalNetQuantity", netQty + resinNet);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="measurements.hardnerReturnQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hardner Return Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                field.onChange(value);
                                const issueQty = form.getValues("measurements.hardnerIssueQuantity") || 0;
                                const netQty = issueQty - value;
                                form.setValue("measurements.hardnerNetQuantity", netQty);
                                const resinNet = form.getValues("measurements.resinNetQuantity") || 0;
                                form.setValue("measurements.totalNetQuantity", netQty + resinNet);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="measurements.hardnerNetQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hardner Net Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...field}
                              readOnly
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="measurements.totalNetQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Net Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* New Total Area implementation */}
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="measurements.totalArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Area (sqft)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            value={field.value ? parseFloat(field.value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ''}
                            readOnly
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">Total area from cutting stage</p>
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Coverage (sqft/L)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        value={(() => {
                          const totalArea = parseFloat(form.getValues("measurements.totalArea") || '0');
                          const totalNetQty = form.getValues("measurements.totalNetQuantity") || 0;
                          if (totalNetQty === 0) return '';
                          const coverage = totalArea / totalNetQty;
                          return coverage.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                        })()}
                        readOnly
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Total Area divided by Total Net Quantity</p>
                  </FormItem>
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={isSkipped ? "Add reason for skipping epoxy stage" : "Add any additional comments"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSkipped ? "Skipping..." : "Creating..."}
                </>
              ) : (
                isSkipped ? "Skip Stage" : (defaultValues?.id ? "Update Job" : "Create Job")
              )}
            </Button>
          </div>
        </ScrollArea>
      </form>
    </Form>
  );
}

function calculateCoverage(length: number, height: number, totalSlabs: number): number {
  return Math.round(((length * height * totalSlabs) / 144) * 100) / 100;
}