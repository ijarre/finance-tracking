import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog } from "@/components/AlertDialog";
import { useAlertDialog } from "@/hooks/useAlertDialog";
import FileUploader from "@/components/FileUploader";
import MultipleFileUploader, {
  type NamedFile,
} from "@/components/MultipleFileUploader";
import ResultsDisplay from "@/components/ResultsDisplay";
import {
  getStatement,
  getTransactions,
  saveTransactions,
  updateStatementStatus,
  updateTransactions,
  saveEnrichmentLog,
  getEnrichmentLogs,
  type Statement,
  type Transaction,
  type EnrichmentLog,
} from "@/lib/api";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const EXTRACTION_PROMPT = `Extract ALL transactions from the bank statement image. For each transaction, extract the following fields:

- date: Transaction date (YYYY-MM-DD format)
- amount: Transaction amount (numeric value only, without currency symbol)
- currency: Currency code (e.g., IDR, USD)
- merchant: Merchant or business name (e.g., "Grab", "Tokopedia", "Starbucks", etc.). Extract the actual merchant/vendor name if visible, otherwise use null
- transaction_name: Name/description of the transaction
- reference_id: Reference or transaction ID (null if not available)
- category: Transaction category (e.g., Food, Transport, Shopping, etc.)
- type: Transaction type - "expense" for debit transactions (contains 'DB' or represents money going out), "income" for credit transactions (contains 'CR' or represents money coming in), or "transfer" for internal transfers (e.g. credit card payments, moving money between own accounts)
- notes: Additional notes or details about the transaction

Return the result as a JSON array of transaction objects. Ensure all transactions are captured from the statement.`;

function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  const [statement, setStatement] = useState<Statement | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [enrichmentLogs, setEnrichmentLogs] = useState<EnrichmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // For draft statements
  const [statementFile, setStatementFile] = useState<File | null>(null);

  // For enrichment
  const [referenceFiles, setReferenceFiles] = useState<NamedFile[]>([]);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (id) {
      loadStatementData();
    }
  }, [id]);

  const loadStatementData = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const [statementData, transactionsData, logsData] = await Promise.all([
        getStatement(id),
        getTransactions(id),
        getEnrichmentLogs(id),
      ]);

      setStatement(statementData);
      setTransactions(transactionsData);
      setEnrichmentLogs(logsData);
    } catch (error) {
      console.error("Error loading statement:", error);
      showAlert("Failed to load statement", { variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (
    file: File
  ): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        resolve({
          data: base64Data,
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleParseStatement = async () => {
    if (!statementFile || !id) {
      showAlert("Please upload a bank statement");
      return;
    }

    if (!GEMINI_API_KEY) {
      showAlert("Please set VITE_GEMINI_API_KEY in your .env.local file", {
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);

    try {
      const statementBase64 = await fileToBase64(statementFile);

      const parts: any[] = [
        { text: EXTRACTION_PROMPT },
        {
          inline_data: {
            mime_type: statementBase64.mimeType,
            data: statementBase64.data,
          },
        },
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      const data = await response.json();
      const responseText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response text";

      let parsedData: Transaction[] = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Could not parse JSON from response", e);
        throw new Error("Failed to parse transactions from Gemini response");
      }

      if (parsedData.length === 0) {
        throw new Error("No transactions found in the statement");
      }

      // Save to database
      await saveTransactions(id, parsedData);
      await updateStatementStatus(id, "parsed");

      // Reload data
      await loadStatementData();

      showAlert(`Successfully parsed ${parsedData.length} transactions!`, {
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error parsing statement:", error);
      showAlert("Error parsing statement: " + error.message, {
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleEnrichData = async () => {
    if (!id || referenceFiles.length === 0) {
      showAlert("Please upload at least one reference document");
      return;
    }

    if (!GEMINI_API_KEY) {
      showAlert("Please set VITE_GEMINI_API_KEY in your .env.local file", {
        variant: "destructive",
      });
      return;
    }

    setIsEnriching(true);

    try {
      // Convert reference files to base64
      const images: { data: string; mimeType: string }[] = [];
      for (const namedFile of referenceFiles) {
        const base64 = await fileToBase64(namedFile.file);
        images.push(base64);
      }

      // Build document reference text
      let documentContext = "\n\nReference Documents:\n";
      referenceFiles.forEach((namedFile, index) => {
        documentContext += `- Image ${index + 1}: "${
          namedFile.name
        }" document\n`;
      });

      const enrichmentPrompt = `You are enriching existing transaction data with additional context from reference documents.

EXISTING TRANSACTIONS:
${JSON.stringify(transactions, null, 2)}

${documentContext}

ADDITIONAL CONTEXT:
${remarks || "None"}

TASK:
Review the reference documents and additional context. For each transaction that can be enriched with more details (e.g., matching receipts, invoices, or additional information), update the relevant fields (merchant, category, notes, reference_id, etc.).

Return a JSON object with:
{
  "enriched_transactions": [array of ONLY the transactions that were updated, including their "id" field],
  "summary": "Brief summary of what was enriched (e.g., 'Matched 3 Grab receipts, added merchant details to 2 Tokopedia transactions')"
}

If no transactions can be enriched, return:
{
  "enriched_transactions": [],
  "summary": "No relevant data found in reference documents to enrich existing transactions."
}`;

      const parts: any[] = [{ text: enrichmentPrompt }];

      for (const image of images) {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data,
          },
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      const data = await response.json();
      const responseText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response text";

      let enrichmentResult: { enriched_transactions: any[]; summary: string } =
        {
          enriched_transactions: [],
          summary: "Failed to parse enrichment response",
        };

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enrichmentResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Could not parse JSON from enrichment response", e);
      }

      // Update transactions in database
      if (enrichmentResult.enriched_transactions.length > 0) {
        await updateTransactions(enrichmentResult.enriched_transactions);
      }

      // Save enrichment log
      await saveEnrichmentLog(id, enrichmentResult.summary);

      // Reload data
      await loadStatementData();

      // Clear enrichment form
      setReferenceFiles([]);
      setRemarks("");

      showAlert(enrichmentResult.summary, { variant: "success" });
    } catch (error: any) {
      console.error("Error enriching data:", error);
      showAlert("Error enriching data: " + error.message, {
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8 font-sans flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <p>Statement not found</p>
          <Button onClick={() => navigate("/")}>Back to Statements</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Statements
          </Button>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {statement.name}
          </h1>
          <p className="text-muted-foreground">
            Status:{" "}
            <span
              className={`font-medium ${
                statement.status === "parsed"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {statement.status === "parsed" ? "Parsed" : "Draft"}
            </span>
          </p>
        </header>

        {statement.status === "draft" ? (
          <div className="space-y-6">
            <FileUploader
              label="Bank Statement"
              file={statementFile}
              onFileChange={setStatementFile}
            />

            <Button
              onClick={handleParseStatement}
              disabled={isParsing || !statementFile}
              size="lg"
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Parsing Statement...
                </>
              ) : (
                "Parse Statement"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <ResultsDisplay results={transactions} isLoading={false} />

            <Card className="bg-background/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Enrich Transaction Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <MultipleFileUploader
                  label="Reference Documents"
                  files={referenceFiles}
                  onFilesChange={setReferenceFiles}
                />

                <div className="space-y-4">
                  <Label htmlFor="remarks">Additional Context / Remarks</Label>
                  <Input
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder='e.g., "Match Grab receipts to transactions"'
                  />
                </div>

                <Button
                  onClick={handleEnrichData}
                  disabled={isEnriching || referenceFiles.length === 0}
                  className="w-full"
                >
                  {isEnriching ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Enriching Data...
                    </>
                  ) : (
                    "Enrich Data"
                  )}
                </Button>
              </CardContent>
            </Card>

            {enrichmentLogs.length > 0 && (
              <Card className="bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Enrichment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {enrichmentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="border-l-2 border-primary pl-4 py-2"
                      >
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        <p className="mt-1">{log.enrichment_summary}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <AlertDialog
          open={alertState.open}
          onOpenChange={hideAlert}
          title={alertState.title}
          description={alertState.description}
          variant={alertState.variant}
        />
      </div>
    </div>
  );
}

export default StatementDetailPage;
