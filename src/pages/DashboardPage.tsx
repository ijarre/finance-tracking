import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  FileText,
  List,
  Filter,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTransactionsByDateRange, type Transaction } from "@/lib/api";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { useTimePeriod } from "@/hooks/useTimePeriod";
import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { month, year, setTimePeriod, getTimePeriodSearchParams } =
    useTimePeriod();

  const [isLoading, setIsLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [month, year]);

  useEffect(() => {
    calculateSummary();
    filterTransactions();
  }, [allTransactions, filterType, searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const transactions = await getTransactionsByDateRange(startDate, endDate);
      setAllTransactions(transactions);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    let income = 0;
    let expense = 0;

    allTransactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else if (t.type === "expense") {
        expense += t.amount;
      }
    });

    setSummary({
      income,
      expense,
      balance: income - expense,
    });
  };

  const filterTransactions = () => {
    let result = [...allTransactions];

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

    // Sort by date desc
    result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setFilteredTransactions(result);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-tertiary/20 rounded-full blur-3xl animate-wiggle" />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-wiggle"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="relative">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-tertiary rounded-full opacity-50 -z-10 animate-pop" />
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg font-medium">
              Your financial playground
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate("/duplicates")}
                className="gap-2 bg-white"
              >
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Duplicates
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate("/statements" + getTimePeriodSearchParams())
                }
                className="bg-white"
              >
                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                Statements
              </Button>
              <Button
                onClick={() =>
                  navigate("/transactions" + getTimePeriodSearchParams())
                }
                className="bg-accent text-white"
              >
                <List className="mr-2 h-4 w-4" />
                Audit
              </Button>
            </div>
            <div className="bg-white p-2 rounded-xl border-2 border-foreground shadow-hard-soft">
              <MonthYearPicker
                selectedMonth={month - 1}
                selectedYear={year}
                onMonthChange={(m) => setTimePeriod(m + 1, year)}
                onYearChange={(y) => setTimePeriod(month, y)}
              />
            </div>
          </div>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Summary Cards */}
          <Card className="bg-white border-2 border-foreground shadow-hard-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-2 py-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Total Income
              </CardTitle>
              <div className="p-3 bg-green-100 rounded-full border-2 border-green-500">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="text-3xl font-extrabold text-green-600">
                {formatCurrency(summary.income)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {new Date(year, month - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-foreground shadow-hard-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Total Expense
              </CardTitle>
              <div className="p-3 bg-red-100 rounded-full border-2 border-red-500">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="text-3xl font-extrabold text-red-600">
                {formatCurrency(summary.expense)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {new Date(year, month - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-foreground shadow-hard-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Net Balance
              </CardTitle>
              <div className="p-3 bg-violet-100 rounded-full border-2 border-violet-500">
                <Wallet className="h-5 w-5 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <div
                className={`text-3xl font-extrabold ${
                  summary.balance >= 0 ? "text-violet-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {new Date(year, month - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Squiggle Divider */}
        <div className="w-full h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgNWM1IDAgNS01IDEwLTVzNSA1IDEwIDUgNS01IDEwLTUgNSA1IDEwIDUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0UyRThGMCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')] opacity-50" />

        <Card className="col-span-3 bg-white border-2 border-foreground shadow-hard">
          <CardHeader className="border-b-2 border-muted bg-muted/30">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-400 border border-foreground" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-foreground" />
                <div className="w-3 h-3 rounded-full bg-green-400 border border-foreground" />
                <CardTitle className="ml-2 text-xl">Transactions</CardTitle>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px] bg-white pl-9">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
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
                  placeholder="Search..."
                  className="max-w-xs bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingState text="Loading your financial data..." />
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">
                  Try adjusting your filters or date range.
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-muted">
                {filteredTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full border-2 border-foreground flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${
                          t.type === "income"
                            ? "bg-green-100"
                            : t.type === "expense"
                            ? "bg-red-100"
                            : "bg-blue-100"
                        }`}
                      >
                        {t.type === "income" ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-600" />
                        ) : t.type === "expense" ? (
                          <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Wallet className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">
                          {t.transaction_name}
                        </p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {new Date(t.date).toLocaleDateString()} •{" "}
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs">
                            {t.category}
                          </span>
                          {t.type === "transfer" && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                              Transfer
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-bold text-lg whitespace-nowrap ${
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
