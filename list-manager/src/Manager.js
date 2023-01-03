import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";

import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import AboutDialog from "./AboutDialog";
import CreateListDialog from "./CreateListDialog";
import DeleteListDialog from "./DeleteListDialog";
import TimeoutDialog from "./TimeoutDialog";

import API, { AuthError, TimeoutError } from "./api";

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

function info2Groups(info, by, search) {
  // First, compute the groups
  const getGroupName = (fol) => fol.display_name.toUpperCase()[0];
  const getGroupNone = (fol) => "All";
  const getGroupDomain = (fol) => {
    const arr = fol.acct.match(/@(.*)/) || ["", "(home)"];
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
  // Whether or not to display the loading indicator
  const [loading, setLoading] = useState(false);
  // For searching
  const [search, setSearch] = useState("");
  // For showing in progress actions
  const [inProgress, setInProgress] = useState(null);
  // For errors
  const [error, setError] = useState(null);
  // To show a special timeout message
  const [showTimeout, setShowTimeout] = useState(false);

  // An error handler for API methods that we call.
  const handleError = (err) => {
    if (err instanceof TimeoutError) {
      setShowTimeout(true);
    } else if (err instanceof AuthError) {
      setRedirect("/login");
    } else {
      setError(`Some other error happened: ${err.message}`);
    }
  };

  const loadData = () => {
    setLoading(true);
    API.getNewInfo()
      .then((data) => {
        data.followers.forEach((f) => {
          if (f.display_name === "") f.display_name = f.username;
        });
        data.followers.sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        );
        data.lists.sort((a, b) => a.title.localeCompare(b.title));
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        handleError(err);
        setLoading(false);
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
    // eslint-disable-next-line
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
  const handleLogout = () => {
    API.logout().then(() => setRedirect("/main"));
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
    API.createList(name)
      .then(() => {
        setCreateOpen(false);
        // We have to do this to get the new ID of the list.
        loadData();
      })
      .catch((err) => handleError(err));
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
    API.deleteList(list.id)
      .then(() => loadData())
      .then(() => setDeleteOpen(false))
      .catch((err) => handleError(err));
  };

  const remove = (groupIndex, index, lid) => {
    // FIXME: Not working for groups, since groups gets regenrated
    // every time the followers list changes!
    const newGroups = groups.slice();
    const fol = newGroups[groupIndex].followers[index];
    setInProgress({ list: lid, follower: fol.id });
    fol.lists = fol.lists.filter((value) => value !== lid);
    API.removeFromList(lid, fol.id)
      .then((resp) => {
        setInProgress(null);
        setGroups(newGroups);
      })
      .catch((err) => handleError(err));
  };

  const add = (groupIndex, index, lid) => {
    const newGroups = groups.slice();
    console.log(newGroups[groupIndex]);
    const fol = newGroups[groupIndex].followers[index];
    fol.lists.push(lid);
    setInProgress({ list: lid, follower: fol.id });
    API.addToList(lid, fol.id)
      .then((data) => {
        setInProgress(null);
        setGroups(newGroups);
      })
      .catch((err) => {
        handleError(err);
        setInProgress(null);
      });
  };

  const popoverOpen = Boolean(anchorEl);
  const menuOpen = Boolean(anchorMenuEl);

  // Build one table per group.

  const headers = lists.map((l) => {
    return (
      <th key={l.id}>
        <div key={l.id} className="listname">
          <div className="icon">
            <DeleteIcon onClick={() => handleDeleteClick(l)} />
          </div>
          <div>
            <span className="listTitle">{l.title}</span>
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

  const makeFollowerTable = (groupIndex, followers) => {
    const rows = followers.map((fol, index) => {
      const cols = lists.map((l) => {
        const cmp = { list: l.id, follower: fol.id };
        if (JSON.stringify(inProgress) === JSON.stringify(cmp)) {
          return (
            <td
              key={l.id + fol.id}
              className="cell"
              onClick={() => remove(groupIndex, index, l.id)}
            >
              <CircularProgress size={10} />
            </td>
          );
        } else if (fol.lists.includes(l.id)) {
          return (
            <td
              key={l.id + fol.id}
              className="cell"
              onClick={() => remove(groupIndex, index, l.id)}
            >
              X
            </td>
          );
        } else {
          return (
            <td
              key={l.id + fol.id}
              className="cell"
              onClick={() => add(groupIndex, index, l.id)}
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

  const tables = groups.map((group, gindex) => {
    const table = group.open ? makeFollowerTable(gindex, group.followers) : "";
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
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>{" "}
          <Typography>Mastodon List Manager</Typography>&nbsp;
          <Typography align="right">(@{acct})</Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );

  const snackbar = (
    <Snackbar
      open={error !== null}
      autoHideDuration={6000}
      onClose={() => setError(null)}
    >
      <Alert
        onClose={() => setError(null)}
        severity="error"
        sx={{ width: "100%" }}
      >
        {error}
      </Alert>
    </Snackbar>
  );

  const select = (
    <div>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel id="demo-simple-select-label">Group By</InputLabel>
        <Select
          labelid="demo-simple-select-label"
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
          labelid="demo-simple-search-label"
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </FormControl>
    </div>
  );

  const reload = (
    <Typography>
      Hmm. Something seems to have gone wrong. A reload might help!
    </Typography>
  );

  return (
    <div className="App">
      {appbar}
      {loading ? <LinearProgress /> : ""}
      {select}
      {tables}
      {tables.length === 0 && !loading ? reload : ""}
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
      <TimeoutDialog
        open={showTimeout}
        handleClose={() => setShowTimeout(false)}
      />
      {snackbar}
    </div>
  );
}

export default Manager;
