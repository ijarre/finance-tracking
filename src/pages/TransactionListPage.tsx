import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Edit } from "lucide-react";
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
  getTransactionsByDateRange,
  type Transaction,
  updateTransaction,
} from "@/lib/api";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { useTimePeriod } from "@/hooks/useTimePeriod";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";
import { LoadingState } from "@/components/ui/loading-state";

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
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [month, year]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchQuery]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);

      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const allTransactions = await getTransactionsByDateRange(
        startDate,
        endDate
      );

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

    // Date filtering is handled by API now

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

  const handleSaveTransaction = async (updatedTransaction: Transaction) => {
    if (!updatedTransaction.id) return;
    try {
      await updateTransaction(updatedTransaction.id, updatedTransaction);

      // Optimistic update
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === updatedTransaction.id ? updatedTransaction : t
        )
      );

      setEditingTransaction(null);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      loadTransactions(); // Revert on error
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
                Audit Transactions
              </h1>
              <p className="text-muted-foreground">
                Review and edit transaction details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MonthYearPicker
              selectedMonth={month - 1}
              selectedYear={year}
              onMonthChange={(m) => setTimePeriod(m + 1, year)}
              onYearChange={(y) => setTimePeriod(month, y)}
            />
          </div>
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
                    <SelectItem value="external_transfer">
                      External Transfer
                    </SelectItem>
                    <SelectItem value="internal_transfer">
                      Internal Transfer
                    </SelectItem>
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
          <CardContent className="p-6">
            {isLoading ? (
              <LoadingState text="Loading transactions..." />
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
                        {(t.type === "internal_transfer" ||
                          t.type === "external_transfer") && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                            {t.type === "internal_transfer"
                              ? "Internal"
                              : "External"}
                          </span>
                        )}
                      </p>
                      {t.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {t.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div
                        className={`font-medium min-w-[140px] whitespace-nowrap text-right hidden md:block ${
                          t.type === "income"
                            ? "text-green-600"
                            : t.type === "expense" ||
                              t.type === "external_transfer"
                            ? "text-red-600"
                            : "text-slate-600" // Internal transfer
                        }`}
                      >
                        {t.type === "income"
                          ? "+"
                          : t.type === "internal_transfer"
                          ? ""
                          : "-"}
                        {formatCurrency(t.amount)}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTransaction(t)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <EditTransactionDialog
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />
      </div>
    </div>
  );
}
