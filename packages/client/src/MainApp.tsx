// This is a wrapper for the Manager experience, whose job it is to
// get the web worker started and authorized.
//

import React, { useState, useEffect, useCallback } from "react";
import APIWorker from "./clientworker";
import Manager from "./Manager";
import { windowLocation } from "./windowutils";
import { Remote } from "comlink";

type MainAppProps = {
  api: Promise<Remote<APIWorker>>;
};

const cache: Record<string, Promise<void>> = {};

// ensures that callback() is only called once in development mode.
function justOneCallback(api: Remote<APIWorker>, code: string, domain: string) {
  const key = code + domain;
  if (key in cache) return cache[key];

  const res = api.callback(code, domain);
  cache[key] = res;
  return res;
}

export default function MainApp({ api }: MainAppProps) {
  // Whether or not we think we are ready
  const [ready, setReady] = useState(false);
  // A redirect when we need it
  const [redirect, setRedirect] = useState<string | null>(null);
  // A timer
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirect("/main");
    }, 10000);
    setTimer(timer);
    return () => clearTimeout(timer);
  }, []);

  // Method to transform a code into a login token (which we'll never see,
  // but our worker will)
  const callbackCB = useCallback(
    async (code: string, domain: string) => {
      const remote = await api;
      justOneCallback(remote, code, domain)
        .then(async () => await remote.ready())
        .then((ready: boolean) => {
          setReady(ready);
        });
    },
    [api, setReady]
  );

  if (redirect) {
    windowLocation.href = redirect;
    return <p>Redirecting for authorization...</p>;
  }

  // If we have a code and domain, redeem here.
  const code = localStorage.getItem("code");
  const domain = localStorage.getItem("domain");

  if (code && domain) {
    // TODO: Add catch here.
    callbackCB(code, domain);
  }

  // If we are ready, render the manager.
  if (ready) {
    // Dump the code and domain
    localStorage.removeItem("code");
    localStorage.removeItem("domain");
    // If we have made it here, cancel the timer.
    if (timer) clearTimeout(timer);
    return <Manager api={api} />;
  }

  // Now, we'll also need a timeout in case we get stuck here for some reason
  // (we can't get to the ready state, e.g. because callback fails)

  // Last resort render
  return <span>Loading...</span>;
}
