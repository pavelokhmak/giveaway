import * as React from "react";

const subscribe = () => () => {};

/**
 * True once hydrated on the client, false during SSR — without a
 * setState-in-effect, using useSyncExternalStore's server/client snapshot
 * split instead.
 */
export function useHasMounted(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
