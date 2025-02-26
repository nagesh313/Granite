import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface Block {
  blockNumber: string;
  length: number;
  width: number;
  height: number;
}

interface FinishedGood {
  block: Block;
  color: string;
}

interface ShippedGood {
  id: number;
  slabsShipped: number;
  shippedAt: string;
  shippingCompany: string;
  finishedGood: FinishedGood;
}

const formSchema = z.object({
  shippedAt: z.date({
    required_error: "Shipping date is required",
  }),
  slabsShipped: z.coerce
    .number()
    .min(1, "Must ship at least 1 slab"),
  shippingCompany: z.string().min(1, "Shipping company is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface EditShipmentDialogProps {
  shipment: ShippedGood;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShipmentDialog({
  shipment,
  open,
  onOpenChange,
}: EditShipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shippedAt: new Date(shipment.shippedAt),
      slabsShipped: shipment.slabsShipped,
      shippingCompany: shipment.shippingCompany,
    },
  });

  const editShipmentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log("Updating shipment:", {
        id: shipment.id,
        ...values,
        shippedAt: values.shippedAt.toISOString(),
      });

      const response = await fetch(`/api/finished-goods/shipments/${shipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          shippedAt: values.shippedAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update shipment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipped-goods"] });
      toast({
        title: "Success",
        description: "Shipment updated successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Edit shipment error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: FormValues) {
    editShipmentMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit Shipment - Block {shipment.finishedGood.block.blockNumber}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shippedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Shipping Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slabsShipped"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Slabs Shipped</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shippingCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Company</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editShipmentMutation.isPending}
              >
                {editShipmentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}