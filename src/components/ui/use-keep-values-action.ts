"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but submits through onSubmit so React does not reset
 * the form afterwards. Use for edit forms where a validation error must not
 * wipe what the person typed.
 */
export function useKeepValuesAction<S>(action: (state: Awaited<S>, data: FormData) => Promise<S>, initial: S) {
  const [state, dispatch, isPending] = useActionState<S, FormData>(action, initial as Awaited<S>);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, onSubmit, isPending };
}
