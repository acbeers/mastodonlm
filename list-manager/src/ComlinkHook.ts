import { createComlink } from "react-use-comlink";
import APIWorker from "./clientworker";

export function clientComlinkHook() {
  return createComlink<typeof APIWorker>(
    () => new Worker(new URL("./clientworker.ts", import.meta.url))
  );
}

export function serverComlinkHook() {
  return createComlink<typeof APIWorker>(
    () => new Worker(new URL("./serverworker.ts", import.meta.url))
  );
}
