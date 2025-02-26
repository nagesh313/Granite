import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import type { ProductionJob, Machine, Trolley } from "@db/schema";

interface JobMeasurements {
  segmentHeights?: Array<{ bladeId: number; height: number }>;
  stoppageReason?: "none" | "power_outage" | "maintenance";
  stoppageStartTime?: string;
  stoppageEndTime?: string;
  maintenanceReason?: string;
  trolleyNumber?: number;
  brazingNumber?: number;
  chemicalName?: string;
  coverage?: number;
  polishGrade?: string;
  surfaceQuality?: string;
  polishingTime?: number;
}

interface ExtendedProductionJob extends ProductionJob {
  measurements: JobMeasurements;
  blockId: number;
  machineId: number;
  trolleyId: number;
  stage: "cutting" | "grinding" | "chemical_conversion" | "epoxy" | "polishing";
  startTime: string;
  endTime?: string;
  status: "in_progress" | "completed" | "paused" | "cancelled";
  processedPieces: number;
  qualityCheckStatus?: "pending" | "passed" | "failed";
  operatorNotes?: string;
  comments?: string;
  photos: string[];
}

type Props = {
  job: ExtendedProductionJob;
  machines: Machine[];
  trolleys: Trolley[];
  onClose: () => void;
};

export function EditJobCard({ job, machines, trolleys, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStoppage, setShowStoppage] = useState(
    job.measurements?.stoppageReason !== "none" && job.measurements?.stoppageReason !== undefined
  );

  const defaultSegmentHeights = Array.from({ length: 14 }, (_, i) => ({
    bladeId: i + 1,
    height: (job.measurements?.segmentHeights?.[i]?.height) || 0
  }));

  const { data: blockData } = useQuery({
    queryKey: [`/api/blocks/${job.blockId}`],
    enabled: !!job.blockId,
  });

  useEffect(() => {
    if (job.blockId && blockData) {
      const displayValue = `${blockData.blockNumber} - ${blockData.blockType}${blockData.marka ? ` - ${blockData.marka}` : ''}`;
      setSearchQuery(displayValue);
    }
  }, [job.blockId, blockData]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...job,
      blockId: job.blockId,
      machineId: job.machineId,
      stage: job.stage,
      startTime: job.startTime,
      brazingNumber: job.measurements?.brazingNumber || "",
      measurements: {
        ...job.measurements,
        segmentHeights: defaultSegmentHeights,
        stoppageReason: job.measurements?.stoppageReason || "none",
        stoppageStartTime: job.measurements?.stoppageStartTime,
        stoppageEndTime: job.measurements?.stoppageEndTime,
        maintenanceReason: job.measurements?.maintenanceReason,
        trolleyNumber: job.measurements?.trolleyNumber || ""
      },
    },
    validate: (values) => {
      if (values.status === 'completed' && !values.endTime) {
        return { endTime: 'End time is required when marking as completed' };
      }
      return {};
    },
  });

  const updateJob = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch(`/api/production-jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-jobs"] });
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      onClose();
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);

      const submitValues = {
        ...values,
      };


      if (!submitValues.blockId) {
        throw new Error("Block is required");
      }
      if (!values.startTime) {
        throw new Error("Start time is required");
      }
      if (values.status === 'completed' && !values.endTime) {
        throw new Error("End time is required for completed jobs");
      }

      if (values.stage === 'polishing') {
        const polishGrade = values.measurements?.polishGrade;
        if (!polishGrade || typeof polishGrade !== 'string' || polishGrade.trim() === '') {
          throw new Error("Polish grade is required and cannot be empty");
        }
        if (!values.measurements?.surfaceQuality) {
          throw new Error("Surface quality is required");
        }
        if (typeof values.measurements?.polishingTime !== 'number' || values.measurements.polishingTime <= 0) {
          throw new Error("Valid polishing time is required");
        }
      }
      if (values.stage === 'chemical_conversion' && !values.measurements?.chemicalName) {
        throw new Error("Chemical name is required");
      }
      if (values.stage === 'epoxy' && !values.measurements?.coverage) {
        throw new Error("Coverage is required");
      }

      updateJob.mutate(submitValues);
    } catch (error) {
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Please fill in all required fields",
        variant: "destructive"
      });
    }
  }

  const { data: block } = useQuery({
    queryKey: [`/api/blocks/${job.blockId}`],
    queryFn: async () => {
      console.log("Fetching block data for ID:", job.blockId);
      const response = await fetch(`/api/blocks/${job.blockId}`);
      const data = await response.json();
      console.log("Fetched block data:", data);
      return data;
    },
    enabled: !!job.blockId,
    retry: 3,
    staleTime: 0,
  });

  useEffect(() => {
    console.log("Effect triggered - job.blockId:", job.blockId, "block:", block);
    if (job.blockId && block) {
      const displayValue = `${block.blockNumber} - ${block.blockType}${block.marka ? ` - ${block.marka}` : ''}`;
      console.log("Setting search query to:", displayValue);
      setSearchQuery(displayValue);
      form.setValue("blockId", job.blockId, { shouldValidate: true });
    }
  }, [job.blockId, block, form]);


  const measurementsSchema = z.object({
    segmentHeights: z.array(z.object({
      bladeId: z.number(),
      height: z.number().min(0, "Must be a positive number")
    })).optional(),
    stoppageReason: z.enum(["none", "power_outage", "maintenance"]).optional(),
    stoppageStartTime: z.string().optional(),
    stoppageEndTime: z.string().optional(),
    maintenanceReason: z.string().optional(),
    trolleyNumber: z.number().optional(),
    polishGrade: z.string().optional(),
    surfaceQuality: z.string().optional(),
    polishingTime: z.number().optional(),
    chemicalName: z.string().optional(),
    coverage: z.number().optional(),
    brazingNumber: z.number().min(0, "Must be a positive number").optional(),
  }).default({});

  const formSchema = z.object({
    blockId: z.number().min(1, "Block ID is required"),
    machineId: z.number().min(1, "Machine is required"),
    trolleyId: z.number().min(1, "Trolley is required"),
    status: z.enum(["in_progress", "completed", "paused", "cancelled"]),
    processedPieces: z.number().min(0, "Must be a positive number"),
    qualityCheckStatus: z.enum(["pending", "passed", "failed"]).optional(),
    operatorNotes: z.string().optional(),
    comments: z.string().optional(),
    measurements: measurementsSchema,
    photos: z.array(z.string()),
    startTime: z.string(),
    endTime: z.string().optional(),
    stage: z.enum(["cutting", "grinding", "chemical_conversion", "epoxy", "polishing"]),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="blockId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Block Number</FormLabel>
              <FormControl>
                <div className="bg-gray-100 px-3 py-2 rounded-md text-gray-500">
                  #{block?.blockNumber}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {machines
                    .filter(machine =>
                      (job.stage === "cutting" && machine.type === "cutting") ||
                      (job.stage === "grinding" && machine.type === "Grinder") ||
                      (job.stage === "chemical_conversion" && machine.type === "Chemical") ||
                      (job.stage === "epoxy" && machine.type === "Epoxy") ||
                      (job.stage === "polishing" && machine.type === "Polisher")
                    )
                    .map((machine) => (
                      <SelectItem
                        key={machine.id}
                        value={machine.id.toString()}
                      >
                        {machine.name} ({machine.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="trolleyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trolley</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trolley">
                      {trolleys.find(t => t.id === field.value)?.number ?
                        `Trolley ${trolleys.find(t => t.id === field.value)?.number}` :
                        'Select trolley'}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trolleys.map((trolley) => (
                    <SelectItem
                      key={trolley.id}
                      value={trolley.id.toString()}
                      disabled={trolley.status !== "available" && trolley.id !== job.trolleyId}
                    >
                      Trolley {trolley.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
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
        <FormField
          control={form.control}
          name="processedPieces"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Processed Pieces</FormLabel>
              <Input
                type="number"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {job.stage !== "cutting" && (
          <FormField
            control={form.control}
            name="qualityCheckStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quality Check Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="measurements.stoppageReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Stoppage</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setShowStoppage(value !== "none");
                }}
                defaultValue={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stoppage reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Stoppage</SelectItem>
                  <SelectItem value="power_outage">Power Outage</SelectItem>
                  <SelectItem value="maintenance">Maintenance Required</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {showStoppage && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="measurements.stoppageStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoppage Start Time</FormLabel>
                    <Input type="datetime-local" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="measurements.stoppageEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stoppage End Time</FormLabel>
                    <Input type="datetime-local" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="measurements.maintenanceReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Details</FormLabel>
                  <Textarea
                    placeholder="Describe the maintenance work performed"
                    className="h-20"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {job.stage === "cutting" && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="measurements.brazingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brazing Number</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-32"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <h3 className="text-lg font-semibold">Blade Measurements</h3>
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
                          name={`measurements.segmentHeights.${index}.height`}
                          render={({ field }) => (
                            <FormItem className="m-0">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="Enter height in mm"
                                  className="w-32"
                                  {...field}
                                  onChange={(e) => {
                                    const newHeights = [...form.getValues().measurements?.segmentHeights || []];
                                    newHeights[index] = {
                                      bladeId: bladeNumber,
                                      height: parseFloat(e.target.value) || 0
                                    };
                                    form.setValue("measurements.segmentHeights", newHeights);
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
        )}



        {job.stage !== "grinding" && (
          <FormField
            control={form.control}
            name="operatorNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operator Notes</FormLabel>
                <Textarea
                  placeholder="Add operator notes about the job"
                  className="h-20"
                  {...field}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
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
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <Input
                  type="datetime-local"
                  {...field}
                  disabled={form.watch('status') !== 'completed'}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {job.stage === "cutting" && (
          <FormField
            control={form.control}
            name="measurements.trolleyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trolley Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-32"
                    min="0"
                  />
                </FormControl>
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
                placeholder="Add any additional comments"
                {...field}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {job.stage !== 'chemical_conversion' && job.stage !== 'epoxy' && (
          <FormField
            control={form.control}
            name="photos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Production Photos</FormLabel>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      if (input) {
                        input.value = '';
                        input.click();
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
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
                          const currentPhotos = field.value || [];
                          form.setValue("photos", [...currentPhotos, base64String]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                {field.value && field.value.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {field.value.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Production photo ${index + 1}`}
                          className="rounded-lg object-cover aspect-video"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            const updatedPhotos = field.value.filter((_, i) => i !== index);
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
            )}
          />
        )}

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Job"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}