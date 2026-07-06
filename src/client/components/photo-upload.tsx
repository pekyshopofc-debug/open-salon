import { useState, useRef } from "preact/hooks";
import { Camera, Trash2, Loader } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Avatar } from "./avatar";

interface PhotoUploadProps {
  name: string;
  color?: string;
  url: string;
  onUploaded: (url: string) => void;
  shape?: "circle" | "square";
}

export function PhotoUpload({ name, color, url, onUploaded, shape = "circle" }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Resize on client side: max 512px on longest side, JPEG 0.8
      const resized = await resizeImage(file, 512, 0.8);
      const formData = new FormData();
      formData.append("file", resized, file.name);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onUploaded("");
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {uploading ? (
          <div className={`flex items-center justify-center bg-muted ${shape === "circle" ? "h-16 w-16 rounded-full" : "h-16 w-16 rounded-lg"}`}>
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Avatar name={name} photoUrl={url} color={color} size="lg" className={shape === "square" ? "rounded-lg" : ""} />
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Camera className="mr-1 h-3.5 w-3.5" />
          {url ? "Trocar" : "Adicionar Foto"}
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={handleRemove} disabled={uploading}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function resizeImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
