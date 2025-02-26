import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Download, Expand, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface GalleryDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: number | null;
}

interface PreviewFile {
  file: File;
  previewUrl: string;
}

export function GalleryDialog({ open, onClose, itemId }: GalleryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);

  // Fetch media
  const { data, isLoading } = useQuery({
    queryKey: ["finished-goods-media", itemId],
    queryFn: async () => {
      if (!itemId) return { media: [] };
      const response = await fetch(`/api/finished-goods/${itemId}/media`);
      if (!response.ok) throw new Error("Failed to fetch media");
      return response.json();
    },
    enabled: !!itemId && open,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!itemId) throw new Error("No item ID provided");

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/finished-goods/${itemId}/media`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload media");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finished-goods-media", itemId] });
      setSelectedFiles([]);
      toast({ title: "Upload successful" });
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Filter invalid files
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive"
        });
        return false;
      }

      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} must be an image or video`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setSelectedFiles(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  // Remove preview
  const removePreview = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Handle upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFiles.map(f => f.file));
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
    };
  }, [selectedFiles]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Media Gallery</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Photo/Video
              </Button>
              {selectedFiles.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                </Button>
              )}
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        {selectedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted relative group">
                  {file.file.type.startsWith('video/') ? (
                    <video
                      src={file.previewUrl}
                      controls
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={file.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePreview(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {data?.media?.map((url: string, i: number) => {
              const isVideo = url.match(/\.(mp4|webm|ogg)$/i) || url.includes('/videos/');

              return (
                <div key={i} className="aspect-video rounded-lg overflow-hidden bg-muted relative group">
                  {isVideo ? (
                    <video
                      src={url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={url}
                      alt="Media item"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Expand className="h-4 w-4" />
                      </Button>
                      <a
                        href={url}
                        download
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="icon" variant="secondary">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!data?.media || data.media.length === 0) && !selectedFiles.length && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No media files yet
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}