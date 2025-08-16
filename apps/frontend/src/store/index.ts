import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { AuthSlice, createAuthSlice } from "./authSlice";
import { SocketSlice, createSocketSlice } from "./socketSlice";
import { TransferSlice, createTransferSlice } from "./transferSlice";

type StoreState = AuthSlice & SocketSlice & TransferSlice;

export const useAppStore = create<StoreState>()(
  subscribeWithSelector((...a) => ({
    ...createAuthSlice(...a),
    ...createSocketSlice(...a),
    ...createTransferSlice(...a),
  }))
);

// Initialize auth check only on client-side
if (typeof window !== "undefined") {
  useAppStore.getState().checkAuth();
}
