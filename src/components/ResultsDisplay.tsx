import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";

import { type Transaction } from "@/lib/api";

interface ResultsDisplayProps {
  results: Transaction[] | null;
  isLoading: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  isLoading,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [merchantFilter, setMerchantFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  if (isLoading) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LoadingState text="Processing with Gemini..." />
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) return null;

  const formatAmount = (amount: string | number, currency: string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
    }).format(numAmount);
  };

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Get unique categories and merchants
  const categories = Array.from(new Set(results.map((t) => t.category))).sort();
  const merchants = Array.from(
    new Set(results.map((t) => t.merchant).filter(Boolean) as string[])
  ).sort();

  // Filter transactions
  let filteredResults = results.filter((transaction) => {
    // Type filter
    if (typeFilter !== "all" && transaction.type !== typeFilter) return false;

    // Category filter
    if (categoryFilter !== "all" && transaction.category !== categoryFilter)
      return false;

    // Merchant filter
    if (merchantFilter !== "all" && transaction.merchant !== merchantFilter)
      return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        transaction.transaction_name.toLowerCase().includes(query) ||
        transaction.notes.toLowerCase().includes(query) ||
        (transaction.merchant &&
          transaction.merchant.toLowerCase().includes(query)) ||
        (transaction.reference_id &&
          transaction.reference_id.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Sort transactions
  filteredResults = [...filteredResults].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "amount":
        const amountA =
          typeof a.amount === "string" ? parseFloat(a.amount) : a.amount;
        const amountB =
          typeof b.amount === "string" ? parseFloat(b.amount) : b.amount;
        comparison = amountA - amountB;
        break;
      case "name":
        comparison = a.transaction_name.localeCompare(b.transaction_name);
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-primary/20 mt-8">
      <CardHeader>
        <CardTitle className="text-primary">
          Parsed Results ({filteredResults.length} of {results.length}{" "}
          transactions)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Filters and Sort Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
          {/* Search */}
          <div className="lg:col-span-2">
            <Label htmlFor="search" className="text-xs mb-1 block">
              Search
            </Label>
            <Input
              id="search"
              placeholder="Search transactions, notes, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Type Filter */}
          <div>
            <Label className="text-xs mb-1 block">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="external_transfer">
                  External Transfer
                </SelectItem>
                <SelectItem value="internal_transfer">
                  Internal Transfer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Label className="text-xs mb-1 block">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Merchant Filter */}
          <div>
            <Label className="text-xs mb-1 block">Merchant</Label>
            <Select value={merchantFilter} onValueChange={setMerchantFilter}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All Merchants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Merchants</SelectItem>
                {merchants.map((merchant) => (
                  <SelectItem key={merchant} value={merchant}>
                    {merchant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-xs mb-1 block">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="name">Transaction Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-xs mb-1 block">Order</Label>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  {sortBy === "date"
                    ? "Newest First"
                    : sortBy === "amount"
                    ? "Highest First"
                    : "Z-A"}
                </SelectItem>
                <SelectItem value="asc">
                  {sortBy === "date"
                    ? "Oldest First"
                    : sortBy === "amount"
                    ? "Lowest First"
                    : "A-Z"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((transaction, index) => {
                const isExpanded = expandedRows.has(index);
                const hasNotes =
                  transaction.notes && transaction.notes.trim().length > 0;

                const isDuplicate = transaction.status === "duplicate";

                return (
                  <React.Fragment key={index}>
                    <TableRow
                      className={`${
                        hasNotes
                          ? "cursor-pointer hover:bg-muted/50 transition-colors"
                          : ""
                      } ${
                        isDuplicate
                          ? "bg-yellow-500/5 hover:bg-yellow-500/10"
                          : ""
                      }`}
                      onClick={() => hasNotes && toggleRow(index)}
                    >
                      <TableCell>
                        {hasNotes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(index)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.date}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right whitespace-nowrap">
                        {formatAmount(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {transaction.merchant || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.transaction_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {transaction.reference_id || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            transaction.type === "expense" ||
                            transaction.type === "external_transfer"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : transaction.type === "income"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm">
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                          {transaction.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {isDuplicate ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-600 text-xs font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Duplicate
                            </span>
                            <Link
                              to="/duplicates"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Manage <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-600 text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {hasNotes && isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/50 p-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                              Notes
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {transaction.notes}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay;
