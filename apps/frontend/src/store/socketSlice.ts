import { StateCreator } from "zustand";
import { Socket } from "socket.io-client";
import { TransferProgress, ShareActivity } from "../types";

export interface SocketSlice {
  socket: Socket | null;
  isConnected: boolean;
  transfers: TransferProgress[];
  shareActivities: ShareActivity[];
  setSocket: (socket: Socket | null) => void;
  setConnected: (isConnected: boolean) => void;
  setTransfers: (transfers: TransferProgress[]) => void;
  addTransfer: (transfer: TransferProgress) => void;
  updateTransfer: (transfer: TransferProgress) => void;
  setShareActivities: (shareActivities: ShareActivity[]) => void;
  addShareActivity: (shareActivity: ShareActivity) => void;
}

export const createSocketSlice: StateCreator<
  SocketSlice,
  [],
  [],
  SocketSlice
> = (set) => ({
  socket: null,
  isConnected: false,
  transfers: [],
  shareActivities: [],
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  setTransfers: (transfers) => set({ transfers }),
  addTransfer: (transfer) =>
    set((state) => ({
      transfers: [transfer, ...state.transfers.slice(0, 19)],
    })),
  updateTransfer: (transfer) =>
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.transferId === transfer.transferId ? transfer : t
      ),
    })),
  setShareActivities: (shareActivities) => set({ shareActivities }),
  addShareActivity: (shareActivity) =>
    set((state) => ({
      shareActivities: [shareActivity, ...state.shareActivities.slice(0, 19)],
    })),
});
