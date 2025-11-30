import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";

export function useTimePeriod() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current date as default
  const now = new Date();
  const defaultMonth = now.getMonth() + 1; // 1-12
  const defaultYear = now.getFullYear();

  // Parse month and year from URL, or use defaults
  const month = useMemo(() => {
    const monthParam = searchParams.get("month");
    if (monthParam) {
      const parsed = parseInt(monthParam, 10);
      if (parsed >= 1 && parsed <= 12) {
        return parsed;
      }
    }
    return defaultMonth;
  }, [searchParams, defaultMonth]);

  const year = useMemo(() => {
    const yearParam = searchParams.get("year");
    if (yearParam) {
      const parsed = parseInt(yearParam, 10);
      if (parsed >= 2000 && parsed <= 2100) {
        return parsed;
      }
    }
    return defaultYear;
  }, [searchParams, defaultYear]);

  // Function to update the time period in URL
  const setTimePeriod = useCallback(
    (newMonth: number, newYear: number) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set("month", newMonth.toString());
        newParams.set("year", newYear.toString());
        return newParams;
      });
    },
    [setSearchParams]
  );

  // Helper to get current search params for navigation
  const getTimePeriodSearchParams = useCallback(() => {
    return `?month=${month}&year=${year}`;
  }, [month, year]);

  return {
    month,
    year,
    setTimePeriod,
    getTimePeriodSearchParams,
  };
}
