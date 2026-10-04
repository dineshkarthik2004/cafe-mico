import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  tableToken: string | null;
  tableNumber: string | null;
  tableName: string | null;
  sessionId: string | null;
  setTableData: (token: string, number: string, name: string) => void;
  setSessionId: (id: string) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      tableToken: null,
      tableNumber: null,
      tableName: null,
      sessionId: null,
      setTableData: (token, number, name) => set({ tableToken: token, tableNumber: number, tableName: name }),
      setSessionId: (id) => set({ sessionId: id }),
      clearSession: () => set({ tableToken: null, tableNumber: null, tableName: null, sessionId: null }),
    }),
    {
      name: 'cafe-mico-session',
    }
  )
);
