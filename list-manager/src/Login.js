import { useEffect } from "react";

function Login(params) {
  //const site = params.site;

  useEffect(() => {
    fetch("http://localhost:4000/auth", {
      credentials: "include",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.status === "OK") {
          window.location = "/manager";
        } else {
          const url = data.url;
          window.location = url;
        }
      });
  }, []);

  return "";
}

export default Login;
