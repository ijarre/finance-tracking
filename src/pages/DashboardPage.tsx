import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  FileText,
  List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStatements, getTransactions, type Transaction } from "@/lib/api";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { useTimePeriod } from "@/hooks/useTimePeriod";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { month, year, setTimePeriod, getTimePeriodSearchParams } =
    useTimePeriod();

  const [isLoading, setIsLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [allTransactions, month, year]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const statements = await getStatements();
      let transactions: Transaction[] = [];

      for (const stmt of statements) {
        if (stmt.status === "parsed") {
          const txs = await getTransactions(stmt.id);
          transactions = [...transactions, ...txs];
        }
      }

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

    // Filter by selected month and year (month from URL is 1-12, need to convert to 0-11 for Date)
    const filtered = allTransactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === month - 1 && d.getFullYear() === year;
    });

    filtered.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else if (t.type === "expense") {
        expense += t.amount;
      }
    });

    // Sort by date desc
    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setSummary({
      income,
      expense,
      balance: income - expense,
    });
    setRecentTransactions(filtered.slice(0, 5));
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
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Your financial overview
            </p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate("/statements" + getTimePeriodSearchParams())
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                Statements
              </Button>
              <Button
                onClick={() =>
                  navigate("/transactions" + getTimePeriodSearchParams())
                }
              >
                <List className="mr-2 h-4 w-4" />
                All Transactions
              </Button>
            </div>
            <MonthYearPicker
              selectedMonth={month - 1}
              selectedYear={year}
              onMonthChange={(m) => setTimePeriod(m + 1, year)}
              onYearChange={(y) => setTimePeriod(month, y)}
            />
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Income
              </CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.income)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(year, month - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expense
              </CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.expense)}
              </div>
              <p className="text-xs text-muted-foreground">Excl. Transfers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  summary.balance >= 0 ? "text-primary" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(year, month - 1).toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>
              Recent Transactions (
              {new Date(year, month - 1).toLocaleString("default", {
                month: "long",
              })}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No transactions found for this period.
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {t.transaction_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()} • {t.category}
                        {t.type === "transfer" && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                            Transfer
                          </span>
                        )}
                      </p>
                    </div>
                    <div
                      className={`font-medium ${
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
