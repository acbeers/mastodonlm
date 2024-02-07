import React, { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./MainPage";
import MainApp from "./MainApp";
import Callback from "./Callback";
import { clientComlinkHook, serverComlinkHook } from "./ComlinkHook";
import "./App.css";

/* 
  /manager is where the manager is stored.
  /main shows the welcome interface, asks for a domain
  /callback is an endpoint for the last step in oauth authorization
*/

function getQueryVariable(variable: string): string | null {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}

const useClientAPIWorker = clientComlinkHook();
const useServerAPIWorker = serverComlinkHook();

function App() {
  // Here, create our worker.
  // If we think we are authenticated, just render the Manager
  // If we aren't and we have a code, then pass it off to the worker and then render the manager
  // If we have another route, then do that.
  //         <Route path="/manager" element={<Manager />} />

  // Doing this here allows my worker communication to
  // work in the development server.
  const clientApiClass = useClientAPIWorker();
  const serverApiClass = useServerAPIWorker();

  // Which client should we use?
  // Set this in client-side storage so we remember it.
  const mode = getQueryVariable("mode");
  if (mode) {
    localStorage.setItem("mastodonlm-mode", mode);
  }

  // our API instance
  const api = useMemo(() => {
    const mode = localStorage.getItem("mastodonlm-mode") || "client";
    const apiClass = mode === "server" ? serverApiClass : clientApiClass;
    const res = new apiClass.proxy();
    return res;
  }, [clientApiClass, serverApiClass]);

  // Change the default number of stack frames

  Error.stackTraceLimit = 30;

  // Set up a global error handler

  window.onerror = async (_event, _source, _lineno, _colno, error) => {
    const remote = await api;
    if (error) {
      const telem = {
        stack: error.stack,
        message: error.message,
      };
      remote.error(telem);
    }
  };

  return (
    <React.StrictMode>
      <BrowserRouter basename={process.env.REACT_APP_BASE_PATH}>
        <Routes>
          <Route path="/main" element={<MainPage />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/manager" element={<MainApp api={api} />} />
          <Route path="/" element={<Navigate to="/main" />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
