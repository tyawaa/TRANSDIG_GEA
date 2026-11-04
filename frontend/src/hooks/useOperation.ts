import { useState } from "react";
import { readableError } from "../services/api";

export type BusyOperation = "location" | "qr" | "connection" | "stories";
export type RunOperation = (
  operation: BusyOperation,
  task: () => Promise<void>,
) => Promise<void>;
type OperationState = {
  readonly busy: BusyOperation | null;
  readonly error: string | null;
  readonly clearError: () => void;
  readonly runOperation: RunOperation;
};

export function useOperation(): OperationState {
  const [busy, setBusy] = useState<BusyOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  function clearError(): void {
    setError(null);
  }
  async function runOperation(
    operation: BusyOperation,
    task: () => Promise<void>,
  ): Promise<void> {
    setBusy(operation);
    setError(null);
    try {
      await task();
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, clearError, runOperation };
}
