import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  SelectValue
} from "@/components/ui/select";
import { BLOCK_TYPES, COLOR_OPTIONS } from "@/lib/utils";
import { X, Upload, Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRANITE_DENSITY = 2.7; // g/cm³

const formSchema = z.object({
  blockNumber: z.string().min(1, "Block number is required"),
  marka: z.string().min(1, "Marka is required"),
  length: z.number().min(0.1, "Length must be greater than 0"),
  width: z.number().min(0.1, "Width must be greater than 0"),
  height: z.number().min(0.1, "Height must be greater than 0"),
  blockType: z.string().min(1, "Block type is required"),
  color: z.string().min(1, "Color is required"),
  mineName: z.string().min(1, "Mine name is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  comments: z.string().optional(),
  frontPhoto: z.object({
    url: z.string(),
    name: z.string()
  }).optional(),
  backPhoto: z.object({
    url: z.string(),
    name: z.string()
  }).optional(),
  photoFrontName: z.string().optional(),
  photoBackName: z.string().optional(),
  dateReceived: z.string().default(() => new Date().toISOString()),
  status: z.enum(["in_stock", "processing", "completed", "shipped"]).default("in_stock"),
  blockWeight: z.number().min(0, "Weight must be 0 or greater"),
  density: z.number().default(GRANITE_DENSITY),
});

type BlockFormProps = {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onPhotoUpload: (file: File, side: 'front' | 'back') => Promise<string>;
  initialData?: any;
  isSubmitting?: boolean;
};

export function BlockForm({ onSubmit, onPhotoUpload, initialData, isSubmitting = false }: BlockFormProps) {
  const { toast } = useToast();
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const defaultValues = initialData ? {
    ...initialData,
    blockNumber: initialData.blockNumber || "",
    marka: initialData.marka || "",
    length: Number(initialData.length || 0),
    width: Number(initialData.width || 0),
    height: Number(initialData.height || 0),
    blockType: initialData.blockType || "",
    color: initialData.color || "",
    mineName: initialData.mineName || "",
    vehicleNumber: initialData.vehicleNumber || "",
    vehicleId: initialData.vehicleId || "",
    comments: initialData.comments || "",
    frontPhoto: {
      url: initialData.photoFrontUrl || "",
      name: initialData.photoFrontName || ""
    },
    backPhoto: {
      url: initialData.photoBackUrl || "",
      name: initialData.photoBackName || ""
    },
    photoFrontName: initialData.photoFrontName || "",
    photoBackName: initialData.photoBackName || "",
    dateReceived: initialData.dateReceived || new Date().toISOString(),
    status: initialData.status || "in_stock",
    blockWeight: Number(initialData.blockWeight || 0),
    density: GRANITE_DENSITY,
  } : {
    blockNumber: "",
    marka: "",
    length: 0,
    width: 0,
    height: 0,
    blockType: "",
    color: "",
    mineName: "",
    vehicleNumber: "",
    vehicleId: "",
    comments: "",
    frontPhoto: { url: "", name: "" },
    backPhoto: { url: "", name: "" },
    photoFrontName: "",
    photoBackName: "",
    dateReceived: new Date().toISOString(),
    status: "in_stock",
    blockWeight: 0,
    density: GRANITE_DENSITY,
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handlePhotoUpload = async (file: File, side: 'front' | 'back') => {
    try {
      if (!file) return;

      if (side === 'front') {
        setUploadingFront(true);
      } else {
        setUploadingBack(true);
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();
      const blockNumber = form.getValues('blockNumber');
      const timestamp = new Date().getTime();
      const photoName = `${side}_${blockNumber}_${timestamp}`;

      if (side === 'front') {
        form.setValue('frontPhoto', { url, name: photoName });
        form.setValue('photoFrontName', photoName);
      } else {
        form.setValue('backPhoto', { url, name: photoName });
        form.setValue('photoBackName', photoName);
      }

      toast({
        title: "Success",
        description: `${side.charAt(0).toUpperCase() + side.slice(1)} photo uploaded successfully`,
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (side === 'front') {
        setUploadingFront(false);
      } else {
        setUploadingBack(false);
      }
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const weight = Number(values.blockWeight) || 0;
      const formData = {
        ...values,
        length: Number(values.length),
        width: Number(values.width),
        height: Number(values.height),
        blockWeight: weight,
        netWeight: weight, // Set net weight equal to block weight
        photoFrontUrl: values.frontPhoto?.url || "",
        photoBackUrl: values.backPhoto?.url || "",
        photoFrontName: values.photoFrontName || values.frontPhoto?.name || "",
        photoBackName: values.photoBackName || values.backPhoto?.name || "",
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to save block. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="blockNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Block Number *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="marka"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marka (Company) *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Length (inches) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Width (inches) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (inches) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateReceived"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date and Time Received *</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mineName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mine Name *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Number *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle ID *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="blockWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (Tonnes) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="blockType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Block Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select block type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOCK_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>


        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Front Photo Section */}
            <div>
              <FormLabel>Front Photo</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('front-photo-upload');
                      if (input) input.click();
                    }}
                    disabled={uploadingFront}
                  >
                    {uploadingFront ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Photo
                  </Button>
                </div>
                <input
                  id="front-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handlePhotoUpload(file, 'front');
                    }
                  }}
                />
              </div>
              {form.watch('frontPhoto.url') && (
                <div className="relative mt-2">
                  <img
                    src={form.watch('frontPhoto.url')}
                    alt="Front view"
                    className="rounded-lg object-cover h-48 w-full"
                  />
                  <Input
                    className="mt-2"
                    placeholder="Photo name"
                    value={form.watch('photoFrontName')}
                    onChange={(e) => form.setValue('photoFrontName', e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Back Photo Section */}
            <div>
              <FormLabel>Back Photo</FormLabel>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('back-photo-upload');
                      if (input) input.click();
                    }}
                    disabled={uploadingBack}
                  >
                    {uploadingBack ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Photo
                  </Button>
                </div>
                <input
                  id="back-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handlePhotoUpload(file, 'back');
                    }
                  }}
                />
              </div>
              {form.watch('backPhoto.url') && (
                <div className="relative mt-2">
                  <img
                    src={form.watch('backPhoto.url')}
                    alt="Back view"
                    className="rounded-lg object-cover h-48 w-full"
                  />
                  <Input
                    className="mt-2"
                    placeholder="Photo name"
                    value={form.watch('photoBackName')}
                    onChange={(e) => form.setValue('photoBackName', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialData ? "Updating Block..." : "Adding Block..."}
            </>
          ) : (
            initialData ? "Update Block" : "Add Block"
          )}
        </Button>
      </form>
    </Form>
  );
}