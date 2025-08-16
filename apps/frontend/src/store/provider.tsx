"use client";

import { createContext, useContext, useRef, ReactNode, useEffect } from "react";
import { createStore, useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { AuthSlice, createAuthSlice } from "./authSlice";
import { SocketSlice, createSocketSlice } from "./socketSlice";

type StoreState = AuthSlice & SocketSlice;

type StoreApi = ReturnType<typeof createAppStore>;

const createAppStore = () => {
     return createStore<StoreState>()(
          subscribeWithSelector((...a) => ({
               ...createAuthSlice(...a),
               ...createSocketSlice(...a),
          }))
     );
};

const StoreContext = createContext<StoreApi | undefined>(undefined);

export interface StoreProviderProps {
     children: ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
     const storeRef = useRef<StoreApi | undefined>(undefined);
     if (!storeRef.current) {
          storeRef.current = createAppStore();
     }

     // Initialize auth check on client-side
     useEffect(() => {
          if (storeRef.current) {
               const { checkAuth } = storeRef.current.getState();
               checkAuth();
          }
     }, []);

     return (
          <StoreContext.Provider value={storeRef.current}>
               {children}
          </StoreContext.Provider>
     );
};

export const useAppStore = <T,>(
     selector: (store: StoreState) => T
): T => {
     const storeContext = useContext(StoreContext);

     if (!storeContext) {
          throw new Error("useAppStore must be used within StoreProvider");
     }

     return useStore(storeContext, selector);
};
