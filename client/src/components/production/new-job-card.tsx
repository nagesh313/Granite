import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Machine, Blade, Trolley } from "@db/schema";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  blockId: z.number(),
  machineId: z.number(),
  trolleyId: z.number(),
  stage: z.enum(["cutting", "grinding", "chemical_conversion", "epoxy", "polishing"]),
  startTime: z.string({
    required_error: "Start time is required"
  }),
  brazingNumber: z.number().min(0, "Must be a positive number").optional(),
});

type Props = {
  machines: Machine[];
  trolleys: Trolley[];
  blades: Blade[];
};

export function NewJobCard({ machines, trolleys, blades }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stage: undefined,
      brazingNumber: undefined,
    }
  });

  const createJob = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/production-jobs", {
        method: "POST",
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
        description: "Production job created successfully",
      });
      form.reset();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
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
    setIsSubmitting(true);
    setError(null);
    createJob.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select machine" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem
                      key={machine.id}
                      value={machine.id.toString()}
                      disabled={machine.status !== "idle"}
                      className="py-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${machine.status === "idle" ? "bg-green-500" : "bg-red-500"}`} />
                        {machine.name} ({machine.type})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select an available machine for this job
              </FormDescription>
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
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select trolley" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trolleys.map((trolley) => (
                    <SelectItem
                      key={trolley.id}
                      value={trolley.id.toString()}
                      disabled={trolley.status !== "available"}
                      className="py-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${trolley.status === "available" ? "bg-green-500" : "bg-red-500"}`} />
                        Trolley {trolley.number}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select an available trolley for transporting materials
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Production Stage</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cutting" className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Cutting
                    </div>
                  </SelectItem>
                  <SelectItem value="grinding" className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Grinding
                    </div>
                  </SelectItem>
                  <SelectItem value="chemical_conversion" className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      Chemical Conversion
                    </div>
                  </SelectItem>
                  <SelectItem value="epoxy" className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      Epoxy
                    </div>
                  </SelectItem>
                  <SelectItem value="polishing" className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      Polishing
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the production stage for this job
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("stage") === "cutting" && (
          <FormField
            control={form.control}
            name="brazingNumber"
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
        )}

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <input
                  type="datetime-local"
                  {...field}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </FormControl>
              <FormDescription>
                Schedule when this job should start
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="h-12 px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Job...
              </>
            ) : (
              "Create Job"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}