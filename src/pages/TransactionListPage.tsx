import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStatements,
  getTransactions,
  type Transaction,
  updateTransaction,
} from "@/lib/api";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { useTimePeriod } from "@/hooks/useTimePeriod";

export default function TransactionListPage() {
  const navigate = useNavigate();
  const { month, year, setTimePeriod, getTimePeriodSearchParams } =
    useTimePeriod();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchQuery, month, year]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const statements = await getStatements();
      let allTransactions: Transaction[] = [];

      for (const stmt of statements) {
        if (stmt.status === "parsed") {
          const txs = await getTransactions(stmt.id);
          allTransactions = [...allTransactions, ...txs];
        }
      }

      // Sort by date desc
      allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let result = [...transactions];

    // Filter by Month/Year (month from URL is 1-12, need to convert to 0-11 for Date)
    result = result.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === month - 1 && d.getFullYear() === year;
    });

    if (filterType !== "all") {
      result = result.filter((t) => t.type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.transaction_name.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          (t.notes && t.notes.toLowerCase().includes(query))
      );
    }

    setFilteredTransactions(result);
  };

  const handleTypeChange = async (
    transactionId: string,
    newType: "expense" | "income" | "transfer"
  ) => {
    try {
      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, type: newType } : t))
      );

      await updateTransaction(transactionId, { type: newType });
    } catch (error) {
      console.error("Failed to update transaction type:", error);
      // Revert on error (could be improved with better state management)
      loadTransactions();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/" + getTimePeriodSearchParams())}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Transactions
              </h1>
              <p className="text-muted-foreground">
                Manage and categorize your transactions
              </p>
            </div>
          </div>
          <MonthYearPicker
            selectedMonth={month - 1}
            selectedYear={year}
            onMonthChange={(m) => setTimePeriod(m + 1, year)}
            onYearChange={(y) => setTimePeriod(month, y)}
          />
        </header>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Search transactions..."
                className="max-w-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for this period matching your filters.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 last:border-0 last:pb-0 gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between md:justify-start gap-2">
                        <p className="font-medium">{t.transaction_name}</p>
                        <span className="md:hidden font-bold">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()} • {t.category}
                      </p>
                      {t.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {t.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <Select
                        value={t.type}
                        onValueChange={(val: any) =>
                          handleTypeChange(t.id!, val)
                        }
                      >
                        <SelectTrigger
                          className={`w-[110px] h-8 text-xs ${
                            t.type === "income"
                              ? "text-green-600 border-green-200 bg-green-50"
                              : t.type === "expense"
                              ? "text-red-600 border-red-200 bg-red-50"
                              : "text-blue-600 border-blue-200 bg-blue-50"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>

                      <div
                        className={`font-medium w-[120px] text-right hidden md:block ${
                          t.type === "income"
                            ? "text-green-600"
                            : t.type === "expense"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
