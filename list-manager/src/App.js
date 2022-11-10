import React, { useState, useEffect } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import "./App.css";

const style = {
  card: {
    header: {
      container: {
        display: "flex" /* establish flex container */,
        justifyContent: "space-between",
        backgroundColor: "lightblue",
      },
      padding: 4,
    },
    content: {
      container: {
        marginBlockStart: "0em",
      },
      padding: 4,
    },
  },
};

function App() {
  // Fetcth the data
  useEffect(() => {
    fetch("http://localhost:4000/info")
      .then((resp) => resp.json())
      .then((data) => {
        data.followers.sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        );
        data.lists.sort((a, b) => a.title.localeCompare(b.title));
        setInfo(data);
      });
  }, []);

  // The data
  const [info, setInfo] = useState({ lists: [], followers: [] });
  // Popover anchor
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [follower, setFollower] = React.useState(null);

  const handlePopoverOpen = (event, fol) => {
    setFollower(fol);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

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
    fol.lists = fol.lists.filter((value) => value !== lid);
    fetch(`http://localhost:4000/remove?list_id=${lid}&account_id=${fol.id}`, {
      method: "POST",
    }).then((resp) => {
      if (resp.ok) {
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
        setInfo(newInfo);
      } else {
        console.log("An error happened");
      }
    });
  };

  const open = Boolean(anchorEl);

  // TODO: For really large lists, this will have to be hierarchical at some point.

  const rows = followers.map((fol, index) => {
    const cols = lists.map((l) => {
      if (fol.lists.includes(l.id)) {
        return (
          <td
            key={l.id + fol.id}
            className="cell"
            onClick={() => remove(index, l.id)}
          >
            X
          </td>
        );
      } else {
        return (
          <td
            key={l.id + fol.id}
            className="cell"
            onClick={() => add(index, l.id)}
          >
            &nbsp;
          </td>
        );
      }
    });
    return (
      <tr>
        <td align="right" className="usercell">
          <Typography
            variant="body2"
            aria-owns={open ? "mouse-over-popover" : undefined}
            aria-haspopup="true"
            onMouseEnter={(evt) => handlePopoverOpen(evt, fol)}
            onMouseLeave={handlePopoverClose}
          >
            <span>{fol.display_name}</span>
          </Typography>
        </td>
        {cols}
      </tr>
    );
  });

  const headers = lists.map((l) => {
    return (
      <th key={l.id}>
        <div key={l.id} className="listname">
          {l.title}
        </div>
      </th>
    );
  });

  let popover = <span></span>;
  if (follower) {
    popover = (
      <Popover
        id="mouse-over-popover"
        open={open}
        onClose={handlePopoverClose}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        sx={{
          pointerEvents: "none",
        }}
      >
        <Card sx={{ maxWidth: 400 }}>
          <CardHeader
            style={style.card.header}
            avatar={
              <Avatar
                aria-label="user"
                sx={{ width: 58, height: 58 }}
                src={follower.avatar}
              />
            }
            title={follower.display_name}
            subheader={follower.acct}
          />
          <CardContent style={style.card.content}>
            <Typography variant="body2">
              <span dangerouslySetInnerHTML={{ __html: follower.note }}></span>
            </Typography>
          </CardContent>
        </Card>
      </Popover>
    );
  }

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
      {popover}
    </div>
  );
}

export default App;
