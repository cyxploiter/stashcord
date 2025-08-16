"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { AuthSlice } from "@/store/authSlice";
import { SocketSlice } from "@/store/socketSlice";

type StoreState = AuthSlice & SocketSlice;

export function useClientStore<T>(
  selector: (state: StoreState) => T
): T | null {
  const [hydrated, setHydrated] = useState(false);
  const store = useAppStore(selector);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  return store;
}
