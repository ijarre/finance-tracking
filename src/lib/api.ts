import { supabase } from './supabaseClient';

export interface Statement {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  parsed_at: string | null;
  bank_statement_url: string | null;
  status: 'draft' | 'processing' | 'parsed' | 'failed';
}

export interface Transaction {
  id?: string;
  statement_id?: string | null;
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
  source?: 'statement' | 'receipt';
  external_id?: string | null;
  match_id?: string | null;
  status?: 'pending' | 'verified' | 'duplicate';
  fingerprint?: string;
}

// Helper to generate MD5 fingerprint
async function generateFingerprint(t: Transaction): Promise<string> {
  const data = `${t.date}|${t.amount}|${t.transaction_name}`;
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); // Using SHA-256 as it is standard in Web Crypto
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface EnrichmentLog {
  id: string;
  statement_id: string;
  enrichment_summary: string;
  created_at: string;
}

// Statement Operations
export async function createStatement(name: string): Promise<Statement> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('statements')
    .insert({ name, user_id: user.id })
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
  status: 'draft' | 'processing' | 'parsed' | 'failed'
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
  if (error) throw error;
}

export async function uploadStatementFile(
  statementId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${statementId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('statements')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Update statement with file URL
  const { error: updateError } = await supabase
    .from('statements')
    .update({ bank_statement_url: fileName })
    .eq('id', statementId);

  if (updateError) throw updateError;

  return fileName;
}

export async function processStatement(statementId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('process-statement', {
    body: { statement_id: statementId },
  });

  if (error) throw error;
}

// Transaction Operations
export async function saveTransactions(
  statementId: string,
  transactions: Transaction[]
): Promise<void> {
  // 1. Generate fingerprints
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const transactionsWithFingerprints = await Promise.all(transactions.map(async t => ({
    ...t,
    statement_id: statementId,
    user_id: user.id,
    source: 'statement' as const,
    fingerprint: await generateFingerprint(t)
  })));

  // 2. Check for duplicates
  const fingerprints = transactionsWithFingerprints.map(t => t.fingerprint);
  
  // Supabase 'in' query has a limit, so we might need to batch if too many. 
  // For now assuming typical statement size (<1000) it should be fine or we can chunk it.
  const { data: existing } = await supabase
    .from('transactions')
    .select('fingerprint')
    .in('fingerprint', fingerprints);

  const existingFingerprints = new Set(existing?.map(e => e.fingerprint));

  // 3. Filter out duplicates
  const newTransactions = transactionsWithFingerprints.filter(t => !existingFingerprints.has(t.fingerprint));

  if (newTransactions.length === 0) {
    return; // All duplicates
  }

  // 4. Insert new transactions
  const { error } = await supabase
    .from('transactions')
    .insert(newTransactions);

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

export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .neq('status', 'duplicate') // Exclude duplicates
    .order('date', { ascending: false });

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('enrichment_logs')
    .insert({ statement_id: statementId, enrichment_summary: summary, user_id: user.id });

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

export async function getDuplicateTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'duplicate')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTransactionsByIds(ids: string[]): Promise<Transaction[]> {
  if (ids.length === 0) return [];
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
