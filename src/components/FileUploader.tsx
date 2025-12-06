import React, {
  useState,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { Upload, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  file,
  onFileChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="bg-background/60 backdrop-blur-sm">
      <CardContent className="">
        {label && <Label className="hidden">{label}</Label>}

        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px]",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            file ? "border-solid border-primary/50 bg-background/50" : ""
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf"
          />

          {file ? (
            <div className="w-full relative group">
              <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center gap-2">
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="max-h-[120px] rounded-md shadow-sm object-contain"
                  />
                ) : (
                  <FileText className="h-12 w-12 text-primary" />
                )}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Click or drag file to upload
                </p>
                <p className="text-xs text-muted-foreground/70">
                  SVG, PNG, JPG or PDF
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;
