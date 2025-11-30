import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Calendar, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog } from "@/components/AlertDialog";
import { useAlertDialog } from "@/hooks/useAlertDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  getStatements,
  createStatement,
  deleteStatement,
  type Statement,
} from "@/lib/api";

function StatementListPage() {
  const navigate = useNavigate();
  const { alertState, showAlert, hideAlert } = useAlertDialog();
  const { confirmState, showConfirm, hideConfirm } = useConfirmDialog();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatementName, setNewStatementName] = useState("");

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      setIsLoading(true);
      const data = await getStatements();
      setStatements(data);
    } catch (error) {
      console.error("Error loading statements:", error);
      showAlert("Failed to load statements", { variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStatement = async () => {
    if (!newStatementName.trim()) {
      showAlert("Please enter a statement name");
      return;
    }

    try {
      setIsCreating(true);
      const statement = await createStatement(newStatementName.trim());
      setShowCreateModal(false);
      setNewStatementName("");
      navigate(`/statement/${statement.id}`);
    } catch (error) {
      console.error("Error creating statement:", error);
      showAlert("Failed to create statement", { variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStatement = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm(
      "Are you sure you want to delete this statement? This will delete all associated transactions.",
      async () => {
        try {
          await deleteStatement(id);
          loadStatements();
        } catch (error) {
          console.error("Error deleting statement:", error);
          showAlert("Failed to delete statement", { variant: "destructive" });
        }
      },
      {
        title: "Delete Statement",
        confirmText: "Delete",
        variant: "destructive",
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Finance Parser
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your bank statements
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Statement
          </Button>
        </header>

        {isLoading ? (
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading statements...
            </CardContent>
          </Card>
        ) : statements.length === 0 ? (
          <Card className="bg-background/60 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No statements yet</p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create Your First Statement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {statements.map((statement) => (
              <Card
                key={statement.id}
                className="bg-background/60 backdrop-blur-sm hover:bg-muted/50 transition-all cursor-pointer border-l-4"
                style={{
                  borderLeftColor:
                    statement.status === "parsed"
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                }}
                onClick={() => navigate(`/statement/${statement.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">
                        {statement.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(statement.created_at)}
                        </span>
                        {statement.parsed_at && (
                          <span>Parsed {formatDate(statement.parsed_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statement.status === "parsed"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {statement.status === "parsed" ? "Parsed" : "Draft"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => handleDeleteStatement(e, statement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Statement Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <Card
              className="w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>Create New Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="statement-name">Statement Name</Label>
                <Input
                  id="statement-name"
                  value={newStatementName}
                  onChange={(e) => setNewStatementName(e.target.value)}
                  placeholder="e.g., October 2025 BCA Statement"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateStatement();
                    if (e.key === "Escape") setShowCreateModal(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStatement} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <AlertDialog
          open={alertState.open}
          onOpenChange={hideAlert}
          title={alertState.title}
          description={alertState.description}
          variant={alertState.variant}
        />

        <ConfirmDialog
          open={confirmState.open}
          onOpenChange={hideConfirm}
          title={confirmState.title}
          description={confirmState.description}
          onConfirm={confirmState.onConfirm}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          variant={confirmState.variant}
        />
      </div>
    </div>
  );
}

export default StatementListPage;
