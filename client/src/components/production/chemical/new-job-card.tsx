import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Block } from "@db/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const formSchema = z.object({
  blockId: z.string().min(1, "Block selection is required"),
  stage: z.literal("chemical_conversion"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "skipped", "defective"]).default("pending"),
  measurements: z.object({
    chemicalName: z.string().optional(),
    issueQuantity: z.number().min(0, "Issue quantity must be non-negative").optional(),
    returnQuantity: z.number().min(0, "Return quantity must be non-negative").optional(),
    netQuantity: z.number().min(0, "Net quantity must be non-negative").optional(),
    totalArea: z.string().optional(),
  }).nullable(),
  comments: z.string().optional(),
  chemicalTime: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  onSuccess?: () => void;
  defaultValues?: any;
};

export function NewJobCard({ onSuccess, defaultValues }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  //open state is not used in the edited code, removing it.

  // Get all blocks
  const { data: blocks } = useQuery<Block[]>({
    queryKey: ["/api/blocks"],
    enabled: !!defaultValues,
  });

  // Get eligible blocks for new jobs
  const { data: eligibleBlocks, isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks/eligible/chemical_conversion"],
    enabled: !defaultValues,
  });

  // Get all jobs for total area calculation
  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/production-jobs"],
  });

  const availableBlocks = defaultValues ? blocks : eligibleBlocks;

  // Get total area from cutting job
  const getTotalArea = (blockId: string) => {
    if (!jobs?.length || !blockId) return "";

    const cuttingJobs = jobs.filter(job =>
      job.blockId === parseInt(blockId, 10) &&
      job.stage === "cutting" &&
      job.status === "completed"
    );

    if (!cuttingJobs.length) return "";

    // Get the most recent completed cutting job
    const latestCuttingJob = cuttingJobs.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];

    const totalArea = latestCuttingJob.measurements?.totalArea?.toString() || "";
    return totalArea;
  };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      blockId: defaultValues?.blockId?.toString() || "",
      stage: "chemical_conversion",
      startTime: defaultValues?.startTime
        ? new Date(defaultValues.startTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      endTime: defaultValues?.endTime
        ? new Date(defaultValues.endTime).toISOString().slice(0, 16)
        : null,
      status: defaultValues?.status || "pending",
      measurements: {
        chemicalName: defaultValues?.measurements?.chemicalName || "",
        issueQuantity: defaultValues?.measurements?.issueQuantity || 0,
        returnQuantity: defaultValues?.measurements?.returnQuantity || 0,
        netQuantity: defaultValues?.measurements?.netQuantity || 0,
        totalArea: defaultValues?.measurements?.totalArea || "",
      },
      comments: defaultValues?.comments || "",
      chemicalTime: defaultValues?.chemicalTime || 0,
    },
  });

  // Update total area when blockId changes or jobs data updates
  useEffect(() => {
    const blockId = form.getValues("blockId");
    if (blockId) {
      const totalArea = getTotalArea(blockId);
      if (totalArea) {
        form.setValue("measurements.totalArea", totalArea.toString());
      }
    }
  }, [form.watch("blockId"), jobs]);

  // Update net quantity when issue or return quantity changes
  useEffect(() => {
    const issueQty = Number(form.getValues("measurements.issueQuantity")) || 0;
    const returnQty = Number(form.getValues("measurements.returnQuantity")) || 0;
    const netQty = issueQty - returnQty;
    form.setValue("measurements.netQuantity", netQty);
  }, [form.watch("measurements.issueQuantity"), form.watch("measurements.returnQuantity")]);

  const filteredBlocks = useMemo(() => {
    if (!availableBlocks?.length) return [];

    return availableBlocks.filter(block =>
      block.blockNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.blockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (block.marka || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableBlocks, searchQuery]);

  const showNoResults = searchQuery && filteredBlocks.length === 0;

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (values.status === "completed" && !values.endTime) {
        throw new Error("End time must be set when marking job as completed");
      }

      const endpoint = defaultValues
        ? `/api/production-jobs/${defaultValues.id}`
        : "/api/production-jobs";

      const payload = {
        ...values,
        blockId: parseInt(values.blockId),
        machineId: undefined,
        measurements: values.status === "skipped" ? null : {
          ...values.measurements,
          issueQuantity: Number(values.measurements?.issueQuantity),
          returnQuantity: Number(values.measurements?.returnQuantity),
          netQuantity: Number(values.measurements?.netQuantity),
        },
      };

      const res = await fetch(endpoint, {
        method: defaultValues ? "PATCH" : "POST",
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
      toast({
        title: "Success",
        description: defaultValues
          ? "Chemical conversion job updated successfully"
          : values.status === "skipped"
            ? "Chemical conversion stage skipped successfully"
            : "New chemical conversion job created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const status = form.watch("status");
  const isSkipped = status === "skipped";
  const values = form.watch();

  if (blocksLoading && !defaultValues) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!availableBlocks?.length && !defaultValues) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">
          No blocks are currently eligible for chemical conversion. Complete the grinding stage for blocks first.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => {
            setIsSubmitting(true);
            mutation.mutate(data);
          })} className="space-y-4">
            <FormField
              control={form.control}
              name="blockId"
              render={({ field }) => {
                const selectedBlock = availableBlocks?.find(b => b.id === parseInt(field.value));
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
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Input
                              placeholder="Search block number..."
                              value={displayValue}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="h-9 w-full min-w-[300px]"
                            />
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {filteredBlocks.map((block) => (
                                <Button
                                  key={block.id}
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    field.onChange(block.id.toString());
                                    const displayValue = `${block.blockNumber} - ${block.blockType}${block.marka ? ` - ${block.marka}` : ''}`;
                                    setSearchQuery(displayValue);
                                  }}
                                >
                                  <div className="flex items-center">
                                    {block.blockNumber} - {block.blockType}
                                    {block.marka && ` - ${block.marka}`}
                                  </div>
                                </Button>
                              ))}
                              {showNoResults && (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No blocks found.
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
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
                        form.setValue("comments", "Add reason for skipping chemical stage");
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
                      <FormLabel>Start Date & Time</FormLabel>
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
                {status === 'completed' && (
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time *</FormLabel>
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
                )}
                <FormField
                  control={form.control}
                  name="chemicalTime"
                  render={({ field }) => {
                    useEffect(() => {
                      const startTime = form.watch("startTime");
                      const endTime = form.watch("endTime");
                      if (startTime && endTime) {
                        const start = new Date(startTime);
                        const end = new Date(endTime);
                        const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
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
                        <FormLabel>Chemical Time</FormLabel>
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
                <FormField
                  control={form.control}
                  name="measurements.issueQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Quantity (L)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            field.onChange(value);
                            const returnQty = Number(form.getValues("measurements.returnQuantity")) || 0;
                            const netQty = value - returnQty;
                            form.setValue("measurements.netQuantity", netQty);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="measurements.returnQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Quantity (L)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            field.onChange(value);
                            const issueQty = Number(form.getValues("measurements.issueQuantity")) || 0;
                            const netQty = issueQty - value;
                            form.setValue("measurements.netQuantity", netQty);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="measurements.netQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Quantity (L)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="measurements.totalArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Area (sqft)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            readOnly
                            className="bg-muted cursor-not-allowed"
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
                          const netQty = form.getValues("measurements.netQuantity") || 0;
                          if (netQty === 0) return '';
                          const coverage = totalArea / netQty;
                          return coverage.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                        })()}
                        readOnly
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Total Area divided by Net Quantity</p>
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
                      placeholder={isSkipped ? "Add reason for skipping chemical stage" : "Add any additional comments"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSkipped ? "Skipping..." : defaultValues ? "Updating..." : "Creating..."}
                </>
              ) : (
                isSkipped ? "Skip Stage" : defaultValues ? "Update Job" : "Create Job"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}