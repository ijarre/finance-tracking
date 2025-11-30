import { useState, useCallback } from "react";

interface AlertState {
  open: boolean;
  title?: string;
  description: string;
  variant?: "default" | "destructive" | "success";
}

export function useAlertDialog() {
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    description: "",
  });

  const showAlert = useCallback(
    (
      description: string,
      options?: {
        title?: string;
        variant?: "default" | "destructive" | "success";
      }
    ) => {
      setAlertState({
        open: true,
        description,
        title: options?.title,
        variant: options?.variant,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    alertState,
    showAlert,
    hideAlert,
  };
}
