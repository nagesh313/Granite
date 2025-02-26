import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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

interface Block {
  id: number;
  blockNumber: string;
  blockType: string;
  quality: string;
}

interface FinishedGood {
  id: number;
  blockId: number;
  quality: string;
  slabCount: number;
  block: Block;
}

const formSchema = z.object({
  standId: z.coerce.number().min(1, "Please select a stand"),
  finishedGoodId: z.coerce.number().min(1, "Please select a block"),
  slabsShipped: z.coerce.number().min(1, "Must ship at least 1 slab"),
  shippingCompany: z.string().min(1, "Please enter the shipping company"),
});

type FormValues = z.infer<typeof formSchema>;

interface ShipGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStand: Stand | null;
}

export function ShipGoodsDialog({
  open,
  onOpenChange,
  selectedStand,
}: ShipGoodsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      standId: selectedStand?.id || 0,
      finishedGoodId: 0,
      slabsShipped: 1,
      shippingCompany: "",
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

  const selectedStandId = form.watch("standId");

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ["finished-goods", selectedStandId],
    queryFn: async () => {
      if (!selectedStandId) return [];
      const response = await fetch(`/api/finished-goods/by-stand/${selectedStandId}`);
      if (!response.ok) throw new Error("Failed to fetch finished goods");
      const data = await response.json();
      return data.filter((fg: FinishedGood) => fg.slabCount > 0);
    },
    enabled: !!selectedStandId,
  });

  const shipGoodsMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch("/api/finished-goods/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedGoodId: values.finishedGoodId,
          slabsShipped: values.slabsShipped,
          shippingDate: new Date().toISOString(),
          shippingCompany: values.shippingCompany,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to ship goods");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-goods-stands"] });
      queryClient.invalidateQueries({ queryKey: ["finished-goods-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finished-goods", selectedStandId] });
      toast({
        title: "Success",
        description: "Goods shipped successfully",
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

  function onSubmit(values: FormValues) {
    shipGoodsMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship Goods</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="standId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Stand</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(Number(value));
                      form.setValue("finishedGoodId", 0);
                    }}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stand" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stands.filter(stand => stand.currentSlabs > 0).map((stand) => (
                        <SelectItem key={stand.id} value={stand.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>Stand {stand.rowNumber}-{stand.position}</span>
                            <span className="text-sm text-muted-foreground">
                              {stand.currentSlabs}/{stand.maxCapacity}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finishedGoodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Block to Ship</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value.toString()}
                    disabled={!selectedStandId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          selectedStandId
                            ? "Select a block"
                            : "Please select a stand first"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {finishedGoods.map((fg) => (
                        <SelectItem key={fg.id} value={fg.id.toString()}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span>Block {fg.block.blockNumber}</span>
                              <span className="text-sm font-medium">{fg.slabCount} slabs</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Quality: {fg.quality}</span>
                              <span>•</span>
                              <span>Type: {fg.block.blockType}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slabsShipped"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Slabs to Ship</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      disabled={!form.getValues("finishedGoodId")}
                    />
                  </FormControl>
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
                    <Input {...field} placeholder="Enter shipping company name" />
                  </FormControl>
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
                disabled={!form.getValues("finishedGoodId")}
              >
                Ship Goods
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}