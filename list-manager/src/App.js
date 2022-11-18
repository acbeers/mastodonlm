import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Manager from "./Manager";
import Login from "./Login";
import LoginForm from "./LoginForm";
import LoginCallback from "./LoginCallback";
import "./App.css";

/* 
  /manager is where the manager is stored.
  /login checks to see if you are logged in, sends to you /manager or /loginform
  /loginform displays a form to specify a domain
  /callback is an endpoint for the last step in oauth authorization
*/

function App() {
  //return <Manager />;

  return (
    <BrowserRouter basename={process.env.REACT_APP_BASE_PATH}>
      <Routes>
        <Route path="/manager" element={<Manager />} />
        <Route path="/login" element={<Login />} />
        <Route path="/loginform" element={<LoginForm />} />
        <Route path="/callback" element={<LoginCallback />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
