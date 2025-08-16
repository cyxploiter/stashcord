import { StateCreator } from 'zustand';

export type TransferStatus = 'uploading' | 'downloading' | 'completed' | 'failed';

export interface Transfer {
  id: string;
  file: File;
  status: TransferStatus;
  progress: number; // 0-100
}

export interface TransferSlice {
  transfers: Transfer[];
  addTransfer: (file: File) => Transfer;
  updateTransferProgress: (id: string, progress: number) => void;
  setTransferStatus: (id: string, status: TransferStatus) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
}

export const createTransferSlice: StateCreator<TransferSlice> = (set) => ({
  transfers: [],
  addTransfer: (file) => {
    const newTransfer: Transfer = {
      id: `${file.name}-${file.size}-${Date.now()}`,
      file,
      status: 'uploading',
      progress: 0,
    };
    set((state) => ({ transfers: [newTransfer, ...state.transfers] }));
    return newTransfer;
  },
  updateTransferProgress: (id, progress) => {
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, progress } : t
      ),
    }));
  },
  setTransferStatus: (id, status) => {
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, status } : t
      ),
    }));
  },
  removeTransfer: (id) => {
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    }));
  },
  clearCompleted: () => {
    set((state) => ({
      transfers: state.transfers.filter((t) => t.status !== 'completed'),
    }));
  },
});
