import type { QueryClient, QueryKey, Updater } from "@tanstack/react-query";

/**
 * Cancels in-flight queries for `queryKey`, applies `updater` to the cached
 * data immediately, and returns the pre-update snapshot so callers can roll
 * back in `onError`. Meant to be called from a mutation's `onMutate`.
 */
export async function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: Updater<NoInfer<T> | undefined, NoInfer<T> | undefined>,
): Promise<{ previous: T | undefined }> {
  await queryClient.cancelQueries({ queryKey });

  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, updater);

  return { previous };
}
