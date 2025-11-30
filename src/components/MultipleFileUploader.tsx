import React, { useState } from "react";
import { FileText, X, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NamedFile {
  id: string;
  name: string;
  file: File;
}

interface MultipleFileUploaderProps {
  label: string;
  files: NamedFile[];
  onFilesChange: (files: NamedFile[]) => void;
}

const MultipleFileUploader: React.FC<MultipleFileUploaderProps> = ({
  label,
  files,
  onFilesChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const handleAddFile = (selectedFile: File) => {
    const newFile: NamedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: selectedFile.name.split(".")[0], // Default to filename without extension
      file: selectedFile,
    };
    onFilesChange([...files, newFile]);
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onFilesChange(
        files.map((f) => (f.id === id ? { ...f, name: editingName.trim() } : f))
      );
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Card className="bg-background/60 backdrop-blur-sm">
      <CardContent className="pt-6">
        <Label className="mb-2 block text-accent-foreground font-semibold">
          {label}
        </Label>

        <div className="space-y-3">
          {files.map((namedFile) => (
            <div
              key={namedFile.id}
              className="border border-border rounded-lg p-3 bg-background/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {namedFile.file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(namedFile.file)}
                    alt="Preview"
                    className="h-12 w-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {editingId === namedFile.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(namedFile.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(namedFile.id)}
                        className="h-8"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">
                          {namedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {namedFile.file.name}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleStartEdit(namedFile.id, namedFile.name)
                          }
                          className="h-7 px-2 text-xs"
                        >
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFile(namedFile.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <label
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50",
              "border-muted-foreground/25"
            )}
          >
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleAddFile(e.target.files[0]);
                  e.target.value = ""; // Reset input
                }
              }}
              className="hidden"
              accept="image/*,.pdf"
            />
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Add Reference Document</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultipleFileUploader;
