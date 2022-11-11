import { BrowserRouter, Routes, Route } from "react-router-dom";
import Manager from "./Manager";
import Login from "./Login";
import LoginCallback from "./LoginCallback";
import "./App.css";

/* 
  /manager is where the manager is stored.
  / probably has to ask someone to specify a domain and authenticate
  /auth/{domain} could do this with no UI

  User should be cookied when starting.
  Backend should store: cookie: {}
*/

function App() {
  //return <Manager />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/manager" element={<Manager />} />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<LoginCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
