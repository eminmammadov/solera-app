"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAsyncController } from "@/hooks/admin/use-admin-async-controller";

interface UseAdminResourceOptions<TData, TPayload = TData> {
  initialData: TData;
  loader: () => Promise<TPayload>;
  fallbackMessage: string;
  mapResult?: (payload: TPayload) => TData;
  captureError?: boolean;
  onError?: (message: string) => void;
}

export const useAdminResource = <TData, TPayload = TData>({
  initialData,
  loader,
  fallbackMessage,
  mapResult,
  captureError = true,
  onError,
}: UseAdminResourceOptions<TData, TPayload>) => {
  const {
    error,
    setError,
    clearError,
    isLoading,
    isRefreshing,
    isActing,
    runLoad,
    runAction,
  } = useAdminAsyncController(true);
  const [data, setData] = useState<TData>(initialData);
  const loaderRef = useRef(loader);
  const fallbackMessageRef = useRef(fallbackMessage);
  const mapResultRef = useRef(mapResult);
  const captureErrorRef = useRef(captureError);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    loaderRef.current = loader;
    fallbackMessageRef.current = fallbackMessage;
    mapResultRef.current = mapResult;
    captureErrorRef.current = captureError;
    onErrorRef.current = onError;
  }, [captureError, fallbackMessage, loader, mapResult, onError]);

  const load = useCallback(
    async (withLoader = true) => {
      const payload = await runLoad(() => loaderRef.current(), {
        withLoader,
        fallbackMessage: fallbackMessageRef.current,
        captureError: captureErrorRef.current,
        onError: onErrorRef.current,
      });

      if (payload !== null) {
        setData(
          mapResultRef.current
            ? mapResultRef.current(payload)
            : (payload as TData),
        );
      }

      return payload;
    },
    [runLoad],
  );

  const refresh = useCallback(() => load(false), [load]);

  return {
    error,
    setError,
    clearError,
    isLoading,
    isRefreshing,
    isActing,
    runLoad,
    runAction,
    data,
    setData,
    load,
    refresh,
  };
};
