import { useState, useEffect } from "react";
import PromptInput from "../components/PromptInput";
import FileUploader from "../components/FileUploader";
import MultipleFileUploader, {
  type NamedFile,
} from "../components/MultipleFileUploader";
import ResultsDisplay from "../components/ResultsDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog } from "@/components/AlertDialog";
import { useAlertDialog } from "@/hooks/useAlertDialog";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

import { type Transaction } from "@/lib/api";

function PromptTesterPage() {
  const { alertState, showAlert, hideAlert } = useAlertDialog();

  const defaultPrompt = `Extract ALL transactions from the bank statement image. For each transaction, extract the following fields:

- date: Transaction date (YYYY-MM-DD format)
- amount: Transaction amount (numeric value only, without currency symbol)
- currency: Currency code (e.g., IDR, USD)
- transaction_name: Name/description of the transaction
- reference_id: Reference or transaction ID (null if not available)
- category: Transaction category (e.g., Food, Transport, Shopping, etc.)
- type: Transaction type - "expense", "income", "internal_transfer", or "external_transfer"
- notes: Additional notes or details about the transaction

Return the result as a JSON array of transaction objects. Ensure all transactions are captured from the statement.`;

  const [prompt, setPrompt] = useState<string>(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem("financeParserPrompt");
    return saved || defaultPrompt;
  });
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<NamedFile[]>([]);
  const [remarks, setRemarks] = useState<string>(() => {
    // Load remarks from localStorage on initial render
    const saved = localStorage.getItem("financeParserRemarks");
    return saved || "";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<Transaction[] | null>(null);

  // Debounced save for prompt to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("financeParserPrompt", prompt);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [prompt]);

  // Debounced save for remarks to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("financeParserRemarks", remarks);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [remarks]);

  const fileToBase64 = (
    file: File
  ): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
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

  const handleSubmit = async () => {
    if (!statementFile) {
      showAlert("Please upload a bank statement");
      return;
    }

    if (!GEMINI_API_KEY) {
      showAlert("Please set VITE_GEMINI_API_KEY in your .env.local file", {
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Convert files to base64
      const images: { data: string; mimeType: string }[] = [];

      if (statementFile) {
        const statementBase64 = await fileToBase64(statementFile);
        images.push(statementBase64);
      }

      // Process all reference files
      for (const namedFile of referenceFiles) {
        const referenceBase64 = await fileToBase64(namedFile.file);
        images.push(referenceBase64);
      }

      // Build document reference text for the prompt
      let documentContext = "";
      if (referenceFiles.length > 0) {
        documentContext = "\n\nReference Documents:\n";
        referenceFiles.forEach((namedFile, index) => {
          documentContext += `- Image ${index + 2}: "${
            namedFile.name
          }" document\n`;
        });
        documentContext += "\nNote: Image 1 is the bank statement. ";
      }

      // Build the parts array for Gemini API
      const parts: any[] = [
        {
          text:
            prompt +
            documentContext +
            (remarks ? `\n\nAdditional Context: ${remarks}` : ""),
        },
      ];

      // Add images
      for (const image of images) {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data,
          },
        });
      }

      // Call Gemini API directly
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

      console.log("Gemini Response:", data);

      // Save response to file for logging
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const logData = {
        timestamp: new Date().toISOString(),
        prompt:
          prompt +
          documentContext +
          (remarks ? `\n\nAdditional Context: ${remarks}` : ""),
        response: data,
        parsedTransactions: [] as Transaction[], // Will be filled after parsing
      };

      const responseText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response text";

      let parsedData: Transaction[] = [];
      try {
        // Try to extract JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Could not parse JSON from response", e);
      }

      // Update log with parsed data
      logData.parsedTransactions = parsedData;

      // Download log file
      const blob = new Blob([JSON.stringify(logData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gemini-response-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResults(parsedData);
    } catch (error: any) {
      console.error("Error calling Gemini:", error);
      showAlert("Error calling Gemini: " + error.message, {
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Finance Parser
          </h1>
        </header>

        <div className="grid gap-8">
          <FileUploader
            label="Bank E-Statement"
            file={statementFile}
            onFileChange={setStatementFile}
          />

          <MultipleFileUploader
            label="Reference Documents"
            files={referenceFiles}
            onFilesChange={setReferenceFiles}
          />

          <Card className="bg-background/60 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col w-full gap-6">
                <Label
                  htmlFor="remarks"
                  className="text-accent-foreground font-semibold"
                >
                  Context / Remarks
                </Label>
                <Input
                  id="remarks"
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder='e.g. "Match GRAB_... prefix to booking ID"'
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          <PromptInput value={prompt} onChange={setPrompt} />

          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg font-semibold shadow-lg hover:shadow-primary/25 transition-all"
          >
            {isLoading ? "Processing..." : "Parse Documents"}
          </Button>

          <ResultsDisplay results={results} isLoading={isLoading} />
        </div>

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

export default PromptTesterPage;
