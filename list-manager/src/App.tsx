import React, { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import MainPage from "./MainPage";
import MainApp from "./MainApp";
import Callback from "./Callback";
import comlinkHook from "./ComlinkHook";
import "./App.css";

/* 
  /manager is where the manager is stored.
  /login checks to see if you are logged in, sends to you /manager or /loginform
  /loginform displays a form to specify a domain
  /callback is an endpoint for the last step in oauth authorization
*/

const useAPIWorker = comlinkHook();

function App() {
  // Here, create our worker.
  // If we think we are authenticated, just render the Manager
  // If we aren't and we have a code, then pass it off to the worker and then render the manager
  // If we have another route, then do that.
  //         <Route path="/manager" element={<Manager />} />

  // Doing this here allows my worker communication to
  // work in the development server.
  const apiClass = useAPIWorker();

  // our API instance
  const api = useMemo(() => {
    const res = new apiClass.proxy();
    return res;
  }, [apiClass]);

  return (
    <React.StrictMode>
      <BrowserRouter basename={process.env.REACT_APP_BASE_PATH}>
        <Routes>
          <Route path="/login" element={<Login />} />
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
