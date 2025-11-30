import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  variant?: "default" | "destructive" | "success";
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
}: AlertDialogProps) {
  const getTitle = () => {
    if (title) return title;
    switch (variant) {
      case "destructive":
        return "Error";
      case "success":
        return "Success";
      default:
        return "Alert";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
