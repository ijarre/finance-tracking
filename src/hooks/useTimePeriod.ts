import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import { startOfMonth, endOfMonth, format, parseISO, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";

export function useTimePeriod() {
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();

  // Get date range from URL or default to current month
  const dateRange = useMemo<DateRange | undefined>(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam && toParam) {
      const from = parseISO(fromParam);
      const to = parseISO(toParam);
      if (isValid(from) && isValid(to)) {
        return { from, to };
      }
    }

    // Default to this month
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  }, [searchParams]);

  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      setSearchParams((prev) => {
         const newParams = new URLSearchParams(prev);
         if (range?.from) {
             newParams.set("from", format(range.from, "yyyy-MM-dd"));
         } else {
             newParams.delete("from");
         }
         
         if (range?.to) {
             newParams.set("to", format(range.to, "yyyy-MM-dd"));
         } else {
             newParams.delete("to");
         }
         
         return newParams;
      });
    },
    [setSearchParams]
  );

  const getTimePeriodSearchParams = useCallback(() => {
    if (dateRange?.from && dateRange?.to) {
        return `?from=${format(dateRange.from, "yyyy-MM-dd")}&to=${format(dateRange.to, "yyyy-MM-dd")}`;
    }
    return "";
  }, [dateRange]);

  return {
    dateRange,
    setDateRange,
    getTimePeriodSearchParams,
  };
}
