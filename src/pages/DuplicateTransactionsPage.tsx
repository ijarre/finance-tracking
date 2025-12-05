import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getDuplicateTransactions,
  getTransactionsByIds,
  updateTransaction,
  deleteTransaction,
  type Transaction,
} from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";

export default function DuplicateTransactionsPage() {
  const navigate = useNavigate();
  const [duplicates, setDuplicates] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<Record<string, Transaction>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    try {
      setIsLoading(true);
      const dups = await getDuplicateTransactions();
      setDuplicates(dups);

      // Fetch matched transactions
      const matchIds = dups
        .map((d) => d.match_id)
        .filter((id): id is string => !!id);

      if (matchIds.length > 0) {
        const matchedTxs = await getTransactionsByIds(matchIds);
        const matchMap: Record<string, Transaction> = {};
        matchedTxs.forEach((t) => {
          if (t.id) matchMap[t.id] = t;
        });
        setMatches(matchMap);
      }
    } catch (error) {
      console.error("Error loading duplicates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepBoth = async (id: string) => {
    try {
      await updateTransaction(id, { status: "verified", match_id: null });
      setDuplicates((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error keeping transaction:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setDuplicates((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Duplicate Management
            </h1>
            <p className="text-muted-foreground">
              Review and manage potential duplicate transactions
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {duplicates.length} Potential Duplicate
              {duplicates.length !== 1 ? "s" : ""} Found
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <LoadingState text="Scanning for duplicates..." />
            ) : duplicates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No duplicate transactions found.
              </div>
            ) : (
              <div className="space-y-6">
                {duplicates.map((dup) => {
                  const match = dup.match_id ? matches[dup.match_id] : null;
                  return (
                    <div
                      key={dup.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Duplicate Transaction (Usually Receipt) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                              New (Duplicate)
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Source: {dup.source || "Unknown"}
                            </span>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-md space-y-1">
                            <p className="font-medium">
                              {dup.transaction_name}
                            </p>
                            <p className="text-lg font-bold">
                              {formatCurrency(dup.amount, dup.currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(dup.date).toLocaleDateString()}
                            </p>
                            {dup.merchant && (
                              <p className="text-sm text-muted-foreground">
                                Merchant: {dup.merchant}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Matched Transaction (Usually Statement) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              Existing Match
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Source: {match?.source || "Unknown"}
                            </span>
                          </div>
                          {match ? (
                            <div className="p-3 bg-muted/50 rounded-md space-y-1">
                              <p className="font-medium">
                                {match.transaction_name}
                              </p>
                              <p className="text-lg font-bold">
                                {formatCurrency(match.amount, match.currency)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(match.date).toLocaleDateString()}
                              </p>
                              {match.merchant && (
                                <p className="text-sm text-muted-foreground">
                                  Merchant: {match.merchant}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-muted/50 rounded-md flex items-center justify-center h-full text-muted-foreground italic">
                              Match details not found
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => dup.id && handleDelete(dup.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dup.id && handleKeepBoth(dup.id)}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Keep Both (Not Duplicate)
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
