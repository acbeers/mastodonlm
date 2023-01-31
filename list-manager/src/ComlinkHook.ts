import { createComlink } from "react-use-comlink";
import APIWorker from "./worker";

export default function comlinkHook() {
  return createComlink<typeof APIWorker>(
    () => new Worker(new URL("./worker.ts", import.meta.url))
  );
}
