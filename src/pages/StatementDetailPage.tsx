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
  updateStatementStatus,
  updateTransactions,
  saveEnrichmentLog,
  getEnrichmentLogs,
  uploadStatementFile,
  processStatement,
  type Statement,
  type Transaction,
  type EnrichmentLog,
} from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

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

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`statement-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "statements",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            if (newStatus === "parsed") {
              loadStatementData();
              showAlert("Statement parsed successfully!", {
                variant: "success",
              });
            } else if (newStatus === "failed") {
              setStatement((prev) =>
                prev ? { ...prev, status: "failed" } : null
              );
              showAlert("Failed to parse statement", {
                variant: "destructive",
              });
            } else if (newStatus === "processing") {
              setStatement((prev) =>
                prev ? { ...prev, status: "processing" } : null
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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

    setIsParsing(true);

    try {
      // 1. Upload file
      await uploadStatementFile(id, statementFile);

      // 2. Update status to processing (Optimistic UI)
      await updateStatementStatus(id, "processing");
      setStatement((prev) => (prev ? { ...prev, status: "processing" } : null));

      // 3. Trigger background processing
      await processStatement(id);

      showAlert("Processing started. You can leave this page.", {
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error starting processing:", error);
      showAlert("Error starting processing: " + error.message, {
        variant: "destructive",
      });
      // Revert status if failed immediately
      await updateStatementStatus(id, "failed");
      setStatement((prev) => (prev ? { ...prev, status: "failed" } : null));
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
                  : statement.status === "processing"
                  ? "text-blue-600"
                  : statement.status === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {statement.status === "parsed"
                ? "Parsed"
                : statement.status === "processing"
                ? "Processing..."
                : statement.status === "failed"
                ? "Failed"
                : "Draft"}
            </span>
          </p>
        </header>

        {statement.status === "draft" || statement.status === "failed" ? (
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
                  Starting Processing...
                </>
              ) : statement.status === "failed" ? (
                "Retry Parsing"
              ) : (
                "Parse Statement"
              )}
            </Button>
          </div>
        ) : statement.status === "processing" ? (
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Processing Statement...
              </h3>
              <p className="text-muted-foreground">
                This may take a few moments. You can navigate away and come back
                later.
              </p>
            </CardContent>
          </Card>
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
