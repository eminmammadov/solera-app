"use client";

import { useCallback, useMemo, useState } from "react";

interface AdminAsyncOptions<TResult> {
  fallbackMessage: string;
  onSuccess?: (result: TResult) => void;
  onError?: (message: string) => void;
  clearError?: boolean;
  captureError?: boolean;
}

interface AdminLoadOptions<TResult> extends AdminAsyncOptions<TResult> {
  withLoader?: boolean;
}

const toErrorMessage = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error.message : fallbackMessage;

export const useAdminAsyncController = (initialLoading = false) => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runLoad = useCallback(
    async <TResult>(
      loader: () => Promise<TResult>,
      {
        withLoader = true,
        fallbackMessage,
        onSuccess,
        onError,
        clearError: shouldClearError = true,
        captureError = true,
      }: AdminLoadOptions<TResult>,
    ): Promise<TResult | null> => {
      if (withLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (shouldClearError) {
        setError(null);
      }

      try {
        const result = await loader();
        onSuccess?.(result);
        return result;
      } catch (loadError) {
        const message = toErrorMessage(loadError, fallbackMessage);
        if (captureError) {
          setError(message);
        }
        onError?.(message);
        return null;
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  const runAction = useCallback(
    async <TResult>(
      action: () => Promise<TResult>,
      {
        fallbackMessage,
        onSuccess,
        onError,
        clearError: shouldClearError = true,
        captureError = true,
      }: AdminAsyncOptions<TResult>,
    ): Promise<TResult | null> => {
      setIsActing(true);

      if (shouldClearError) {
        setError(null);
      }

      try {
        const result = await action();
        onSuccess?.(result);
        return result;
      } catch (actionError) {
        const message = toErrorMessage(actionError, fallbackMessage);
        if (captureError) {
          setError(message);
        }
        onError?.(message);
        return null;
      } finally {
        setIsActing(false);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      error,
      setError,
      clearError,
      isLoading,
      isRefreshing,
      isActing,
      runLoad,
      runAction,
    }),
    [
      clearError,
      error,
      isActing,
      isLoading,
      isRefreshing,
      runAction,
      runLoad,
      setError,
    ],
  );
};
