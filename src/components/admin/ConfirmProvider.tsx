"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ConfirmContext = createContext<((message: string) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback((next: string) => new Promise<boolean>((resolve) => { resolver.current = resolve; setMessage(next); }), []);
  const close = (value: boolean) => { resolver.current?.(value); resolver.current = null; setMessage(null); };
  return <ConfirmContext.Provider value={confirm}>{children}<AlertDialog open={message !== null} onOpenChange={(open) => { if (!open) close(false); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm action</AlertDialogTitle><AlertDialogDescription>{message}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => close(false)}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => close(true)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></ConfirmContext.Provider>;
}

export function useConfirm() {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error("useConfirm must be used within ConfirmProvider");
  return value;
}
