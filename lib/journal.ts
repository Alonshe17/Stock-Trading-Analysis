export type JournalEntry = {
  id:         string;
  device_id:  string;
  symbol:     string | null;   // null = general note not linked to a stock
  entry_date: string;          // YYYY-MM-DD
  title:      string;
  content:    string;
  created_at: string;
  updated_at: string;
};

export type JournalEntryDraft = Omit<JournalEntry, 'id' | 'device_id' | 'created_at' | 'updated_at'>;
