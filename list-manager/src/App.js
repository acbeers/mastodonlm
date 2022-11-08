import logo from "./logo.svg";
import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Fetcth the data
  useEffect(() => {
    fetch("http://localhost:4000/info")
      .then((resp) => resp.json())
      .then((data) => {
        data.followers.sort((a, b) => a.username.localeCompare(b.username));
        data.lists.sort((a, b) => a.title.localeCompare(b.title));
        setInfo(data);
      });
  }, []);

  // The data
  const [info, setInfo] = useState({ lists: [], followers: [] });

  // Build the crazy table.
  const followers = info.followers;
  const lists = info.lists;

  const listmap = {};
  lists.forEach((l, index) => {
    listmap[l.id] = index;
  });

  const remove = (index, lid) => {
    const newInfo = { ...info };
    const fol = newInfo.followers[index];
    fol.lists = fol.lists.filter((value) => value != lid);
    fetch(`http://localhost:4000/remove?list_id=${lid}&account_id=${fol.id}`, {
      method: "POST",
    }).then((resp) => {
      if (resp.ok) {
        console.log("Succeeded");
        setInfo(newInfo);
      } else {
        console.log("An error happened");
      }
    });
  };

  const add = (index, lid) => {
    const newInfo = { ...info };
    const fol = newInfo.followers[index];
    fol.lists.push(lid);
    fetch(`http://localhost:4000/add?list_id=${lid}&account_id=${fol.id}`, {
      method: "POST",
    }).then((resp) => {
      if (resp.ok) {
        console.log("Succeeded");
        setInfo(newInfo);
      } else {
        console.log("An error happened");
      }
    });
  };

  // TODO: For really large lists, this will have to be hierarchical at some point.

  const rows = followers.map((fol, index) => {
    const cols = lists.map((l) => {
      if (fol.lists.includes(l.id)) {
        return (
          <td key={fol.id} className="cell" onClick={() => remove(index, l.id)}>
            X
          </td>
        );
      } else {
        return (
          <td key={fol.id} className="cell" onClick={() => add(index, l.id)}>
            &nbsp;
          </td>
        );
      }
    });
    return (
      <tr>
        <td align="right">{fol.username}</td>
        {cols}
      </tr>
    );
  });

  const headers = lists.map((l) => {
    return (
      <th>
        <div key={l.id} className="listname">
          {l.title}
        </div>
      </th>
    );
  });

  return (
    <div className="App">
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            {headers}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

export default App;
