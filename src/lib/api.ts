import { supabase } from './supabaseClient';

export interface Statement {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  parsed_at: string | null;
  bank_statement_url: string | null;
  status: 'draft' | 'parsed';
}

export interface Transaction {
  id?: string;
  statement_id?: string;
  date: string;
  amount: number;
  currency: string;
  merchant: string | null;
  transaction_name: string;
  reference_id: string | null;
  category: string;
  type: 'expense' | 'income' | 'transfer';
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrichmentLog {
  id: string;
  statement_id: string;
  enrichment_summary: string;
  created_at: string;
}

// Statement Operations
export async function createStatement(name: string): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStatements(): Promise<Statement[]> {
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStatement(id: string): Promise<Statement> {
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStatementStatus(
  id: string,
  status: 'draft' | 'parsed'
): Promise<void> {
  const updates: any = { status, updated_at: new Date().toISOString() };
  
  if (status === 'parsed') {
    updates.parsed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('statements')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteStatement(id: string): Promise<void> {
  // Delete transactions first (if not set to cascade)
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('statement_id', id);

  if (txError) throw txError;

  // Delete enrichment logs
  const { error: logError } = await supabase
    .from('enrichment_logs')
    .delete()
    .eq('statement_id', id);
    
  if (logError) throw logError;

  // Delete the statement
  const { error } = await supabase
    .from('statements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Transaction Operations
export async function saveTransactions(
  statementId: string,
  transactions: Transaction[]
): Promise<void> {
  const transactionsWithStatementId = transactions.map(t => ({
    ...t,
    statement_id: statementId,
  }));

  const { error } = await supabase
    .from('transactions')
    .insert(transactionsWithStatementId);

  if (error) throw error;
}

export async function getTransactions(statementId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('statement_id', statementId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function updateTransactions(
  transactions: Array<{ id: string } & Partial<Transaction>>
): Promise<void> {
  // Supabase doesn't have a native bulk update, so we'll do them sequentially
  for (const transaction of transactions) {
    const { id, ...updates } = transaction;
    await updateTransaction(id, updates);
  }
}

// Enrichment Operations
export async function saveEnrichmentLog(
  statementId: string,
  summary: string
): Promise<void> {
  const { error } = await supabase
    .from('enrichment_logs')
    .insert({ statement_id: statementId, enrichment_summary: summary });

  if (error) throw error;
}

export async function getEnrichmentLogs(statementId: string): Promise<EnrichmentLog[]> {
  const { data, error } = await supabase
    .from('enrichment_logs')
    .select('*')
    .eq('statement_id', statementId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
