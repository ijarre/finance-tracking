import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title?: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    description: "",
    onConfirm: () => {},
  });

  const showConfirm = useCallback(
    (
      description: string,
      onConfirm: () => void,
      options?: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "default" | "destructive";
      }
    ) => {
      setConfirmState({
        open: true,
        description,
        onConfirm,
        title: options?.title,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        variant: options?.variant,
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    confirmState,
    showConfirm,
    hideConfirm,
  };
}
