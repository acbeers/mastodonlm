import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

import AboutDialog from "./AboutDialog";
import CreateListDialog from "./CreateListDialog";
import DeleteListDialog from "./DeleteListDialog";
import TimeoutDialog from "./TimeoutDialog";

import API, { AuthError, TimeoutError } from "./api";
import FollowingTable from "./FollowingTable";
import Controls from "./Controls";
import TopBar from "./TopBar";

import "./Manager.css";

function info2Groups(info, by, filter, search) {
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

  // Returns true if the filter keeps a person
  console.log(filter.slice(0, 4));
  console.log(filter);
  console.log(filter.slice(4));
  let filterFunc = null;
  if (filter === "nolists") filterFunc = (x) => x.lists.length === 0;
  else if (filter.slice(0, 4) === "not:")
    filterFunc = (x) => !x.lists.includes(parseInt(filter.slice(4)));
  else filterFunc = (x) => true;

  info.followers.forEach((fol) => {
    // First, see if it passes the filter
    if (!filterFunc(fol)) return;

    // Next, see if it passes the search
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
  // The currently active filter
  // Values: "everything", "nolists", "not:list-id"
  const [filter, setFilter] = useState("everything");
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
    const groups = info2Groups(info, groupBy, filter, search);
    setGroups(groups);
  }, [info, groupBy, search, filter]);

  // Fetch the data
  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, []);

  // A redirect if we need it
  const [redirect, setRedirect] = useState(null);

  // Menu anchor and handlers
  const handleMenuAbout = () => {
    setAboutOpen(true);
  };
  const handleMenuNewList = () => {
    setCreateOpen(true);
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

  // Build one table per group.
  const tables = groups.map((group, gindex) => {
    return (
      <FollowingTable
        key={group.key}
        groupIndex={gindex}
        group={group}
        lists={lists}
        inProgress={inProgress}
        remove={remove}
        add={add}
        handleDeleteClick={handleDeleteClick}
        defaultOpen={groups.length === 1}
      />
    );
  });

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  const acct = info.me ? info.me.acct : "";
  const appbar = (
    <TopBar
      acct={acct}
      handleMenuAbout={handleMenuAbout}
      handleMenuNewList={handleMenuNewList}
      handleMenuLogout={handleLogout}
    />
  );

  const controls = (
    <Controls
      groupBy={groupBy}
      handleGroupByChange={setGroupBy}
      lists={lists}
      filter={filter}
      handleFilterChange={setFilter}
      search={search}
      handleSearchChange={setSearch}
    />
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

  const reload = (
    <Typography>
      Hmm. Something seems to have gone wrong. A reload might help!
    </Typography>
  );

  const dialogs = (
    <div>
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
    </div>
  );

  return (
    <div className="Manager">
      <div id="topbars">
        {appbar}
        {loading ? <LinearProgress /> : ""}
        {controls}
      </div>
      <div id="alltables">
        {tables}
        {tables.length === 0 && !loading ? reload : ""}
        {snackbar}
        {dialogs}
      </div>
    </div>
  );
}

export default Manager;
