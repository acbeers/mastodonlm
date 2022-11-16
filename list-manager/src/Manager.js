import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";
import AboutDialog from "./AboutDialog";
import CreateListDialog from "./CreateListDialog";
import DeleteListDialog from "./DeleteListDialog";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import "./Manager.css";

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

const urlInfo = process.env.REACT_APP_BACKEND_URL + "/info";
const urlAdd = process.env.REACT_APP_BACKEND_URL + "/add";
const urlRemove = process.env.REACT_APP_BACKEND_URL + "/remove";
const urlCreate = process.env.REACT_APP_BACKEND_URL + "/create";
const urlDelete = process.env.REACT_APP_BACKEND_URL + "/delete";

function info2Groups(info, by, search) {
  // First, compute the groups
  const getGroupName = (fol) => fol.display_name.toUpperCase()[0];
  const getGroupNone = (fol) => "All";
  const getGroupDomain = (fol) => {
    const arr = fol.acct.match(/@(.*)/) || ["", "XX"];
    return arr[1];
  };
  const methods = {
    none: getGroupNone,
    name: getGroupName,
    domain: getGroupDomain,
  };
  const method = methods[by];
  const groups = {};

  const lwrSearch = search.toLowerCase();

  info.followers.forEach((fol) => {
    // First, see if it passes the search
    const dnidx = fol.display_name.toLowerCase().indexOf(lwrSearch);
    const unidx = fol.username.toLowerCase().indexOf(lwrSearch);
    const noidx = fol.note.toLowerCase().indexOf(lwrSearch);

    if (dnidx === -1 && unidx === -1 && noidx === -1) return;

    const g = method(fol);
    if (!groups[g]) {
      groups[g] = [];
    }
    groups[g].push(fol);
  });
  // Now, order the groups and produce an array
  const keys = Object.keys(groups);
  keys.sort();
  return keys.map((k) => ({ key: k, open: false, followers: groups[k] }));
}

function Manager() {
  // The data
  const [info, setInfo] = useState({ lists: [], followers: [] });
  // The grouped data - as an array of info objects.
  const [groups, setGroups] = useState([]);
  // How we want things grouped
  const [groupBy, setGroupBy] = useState("none");
  // For searching
  const [search, setSearch] = useState("");

  const loadData = () => {
    fetch(urlInfo, {
      credentials: "include",
    })
      .then((resp) => resp.json())
      .then((data) => {
        if (data.status === "no_cookie") setRedirect("/login");
        else {
          data.followers.forEach((f) => {
            if (f.display_name === "") f.display_name = f.username;
          });
          data.followers.sort((a, b) =>
            a.display_name.localeCompare(b.display_name)
          );
          data.lists.sort((a, b) => a.title.localeCompare(b.title));
          setInfo(data);
        }
      });
  };

  // Generate the groups
  useEffect(() => {
    const groups = info2Groups(info, groupBy, search);
    if (groups.length === 1) groups[0].open = true;
    setGroups(groups);
  }, [info, groupBy, search]);

  // Fetch the data
  useEffect(() => {
    loadData();
  }, []);

  // A redirect if we need it
  const [redirect, setRedirect] = useState(null);

  // Popover anchor and handlers
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [follower, setFollower] = React.useState(null);

  const handlePopoverOpen = (event, fol) => {
    setFollower(fol);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  // Menu anchor and handlers
  const [anchorMenuEl, setAnchorMenuEl] = React.useState(null);
  const handleMenuClick = (event) => {
    setAnchorMenuEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorMenuEl(null);
  };
  const handleMenuAbout = () => {
    setAboutOpen(true);
    handleMenuClose();
  };
  const handleMenuNewList = () => {
    setCreateOpen(true);
    handleMenuClose();
  };

  // About dialog handlers
  const [aboutOpen, setAboutOpen] = useState(false);
  const handleAboutClose = () => {
    setAboutOpen(false);
  };

  // Create List Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const handleCreateClose = () => {
    setCreateOpen(false);
  };
  const handleCreateCommit = (name) => {
    fetch(`${urlCreate}?list_name=${name}`, {
      method: "POST",
      credentials: "include",
    }).then(() => {
      setCreateOpen(false);
      loadData();
    });
  };

  // Build the crazy table.
  const lists = info.lists;

  // Delete list dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteList, setDeleteList] = useState(null);
  const handleDeleteClose = () => {
    setDeleteOpen(false);
  };
  const handleDeleteClick = (list) => {
    setDeleteList(list);
    setDeleteOpen(true);
  };
  const handleDelete = (list) => {
    fetch(`${urlDelete}?list_id=${list.id}`, {
      method: "POST",
      credentials: "include",
    })
      .then(() => loadData())
      .then(() => setDeleteOpen(false));
  };

  const remove = (index, lid) => {
    const newInfo = { ...info };
    const fol = newInfo.followers[index];
    fol.lists = fol.lists.filter((value) => value !== lid);
    fetch(`${urlRemove}?list_id=${lid}&account_id=${fol.id}`, {
      method: "POST",
      credentials: "include",
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
    fetch(`${urlAdd}?list_id=${lid}&account_id=${fol.id}`, {
      method: "POST",
      credentials: "include",
    }).then((resp) => {
      if (resp.ok) {
        setInfo(newInfo);
      } else {
        console.log("An error happened");
      }
    });
  };

  const popoverOpen = Boolean(anchorEl);
  const menuOpen = Boolean(anchorMenuEl);

  // Build one table per group.

  const headers = lists.map((l) => {
    return (
      <th key={l.id}>
        <div key={l.id} className="listname">
          {l.title}
          <div className="icon">
            <DeleteIcon onClick={() => handleDeleteClick(l)} />
          </div>
        </div>
      </th>
    );
  });

  const toggleOpen = (group) => {
    const newGroups = groups.slice();
    const item = newGroups.find((val) => val.key === group.key);
    item.open = !item.open;
    setGroups(newGroups);
  };

  const makeFollowerTable = (followers) => {
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
        <tr key={fol.id}>
          <td align="right" className="usercell">
            <Typography
              variant="body2"
              aria-owns={popoverOpen ? "mouse-over-popover" : undefined}
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

    const table = (
      <table className="followerTable">
        <thead>
          <tr>
            <th>&nbsp;</th>
            {headers}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
    return table;
  };

  const tables = groups.map((group) => {
    const table = group.open ? makeFollowerTable(group.followers) : "";
    const icon = group.open ? (
      <KeyboardArrowDownIcon />
    ) : (
      <KeyboardArrowRightIcon />
    );
    return (
      <div key={group.key}>
        <div className="group" onClick={() => toggleOpen(group)}>
          {icon} {group.key} ({group.followers.length})
        </div>
        {table}
      </div>
    );
  });

  let popover = <span></span>;
  if (follower) {
    popover = (
      <Popover
        id="mouse-over-popover"
        open={popoverOpen}
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

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  const acct = info.me ? info.me.acct : "";
  const appbar = (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleMenuClick}
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorMenuEl}
            open={menuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
          >
            <MenuItem onClick={handleMenuNewList}>New List</MenuItem>
            <MenuItem onClick={handleMenuAbout}>About</MenuItem>
          </Menu>{" "}
          <Typography>Mastodon List Manager</Typography>&nbsp;
          <Typography align="right">(@{acct})</Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );

  if (headers.length === 0) {
    return (
      <div className="App">
        {appbar}
        <LinearProgress />
      </div>
    );
  }

  const select = (
    <div>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel id="demo-simple-select-label">Group By</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={groupBy}
          label="Group By"
          onChange={(event) => setGroupBy(event.target.value)}
        >
          <MenuItem value={"none"}>Nothing</MenuItem>
          <MenuItem value={"name"}>Name (first letter)</MenuItem>
          <MenuItem value={"domain"}>Account domain</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 400, marginBottom: "12px" }}>
        <TextField
          labelId="demo-simple-search-label"
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </FormControl>
    </div>
  );

  return (
    <div className="App">
      {appbar}
      {select}
      {tables}
      {popover}
      <AboutDialog open={aboutOpen} handleClose={handleAboutClose} />
      <CreateListDialog
        open={createOpen}
        handleClose={handleCreateClose}
        handleCreate={handleCreateCommit}
      />
      <DeleteListDialog
        open={deleteOpen}
        list={deleteOpen ? deleteList : ""}
        handleClose={handleDeleteClose}
        handleDelete={handleDelete}
      />
    </div>
  );
}

export default Manager;
