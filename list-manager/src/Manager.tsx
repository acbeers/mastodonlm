import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";

import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

import AboutDialog from "./AboutDialog";
import CreateListDialog from "./CreateListDialog";
import DeleteListDialog from "./DeleteListDialog";
import TimeoutDialog from "./TimeoutDialog";

// FIXME: these errors need to change!
import { AuthError, TimeoutError } from "./api";
import FollowingTable from "./FollowingTable";
import Controls from "./Controls";
import TopBar from "./TopBar";

import { User, APIData, Group, List, InProgress } from "./types";

// For our API work
import type APIWorker from "./clientworker";
import * as Comlink from "comlink";

import "./Manager.css";

function info2Groups(
  info: APIData,
  by: string,
  filter: string,
  search: string
) {
  // First, compute the groups
  const getGroupName = (fol: User) => fol.display_name.toUpperCase()[0];
  const getGroupNone = (fol: User) => "All";
  const getGroupDomain = (fol: User) => {
    const arr = fol.acct.match(/@(.*)/) || ["", "(home)"];
    return arr[1];
  };
  const methods: Record<string, (a: User) => string> = {
    none: getGroupNone,
    name: getGroupName,
    domain: getGroupDomain,
  };
  const method = methods[by];
  const groups: Record<string, User[]> = {};

  const lwrSearch = search.toLowerCase();

  // Returns true if the filter keeps a person
  const key = filter.split(":")[0];
  const filterFuncs: Record<string, (x: User) => boolean> = {
    nolists: (x) => x.lists.length === 0,
    not: (x) => !x.lists.includes(filter.slice(4)),
    on: (x) => x.lists.includes(filter.slice(3)),
  };
  const filterFunc = filterFuncs[key] || ((x: User) => true);

  info.followers.forEach((fol: User) => {
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
  return keys.map((k) => ({ key: k, followers: groups[k] }));
}

type ManagerProps = {
  api: Promise<Comlink.Remote<APIWorker>>;
};

function Manager({ api }: ManagerProps) {
  // The data
  const [info, setInfo] = useState<APIData>({
    lists: [],
    followers: [],
    me: {
      id: "",
      display_name: "",
      username: "",
      avatar: "",
      acct: "",
      note: "",
      following_count: 0,
      lists: [],
    },
  });
  // The grouped data - as an array of info objects.
  const [groups, setGroups] = useState<Group[]>([]);
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
  const [inProgress, setInProgress] = useState<InProgress | null>(null);
  // For errors
  const [error, setError] = useState<string | null>(null);
  // To show a special timeout message
  const [showTimeout, setShowTimeout] = useState(false);
  //
  const [loadProgress, setLoadProgress] = useState(0);

  // An error handler for API methods that we call.
  const handleError = (err: Error) => {
    if (err instanceof TimeoutError) {
      setShowTimeout(true);
    } else if (err instanceof AuthError) {
      setRedirect("/login");
    } else {
      setError(`Some other error happened: ${err.message}`);
    }
  };

  const progress = (value: number) => {
    setLoadProgress(value);
  };

  const loadDataCB = useCallback(async () => {
    setLoading(true);
    setLoadProgress(0);
    const remote = await api;
    remote
      .info(Comlink.proxy(progress))
      .then((data: APIData) => {
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
  }, [api]);

  const logoutCB = useCallback(async () => {
    const remote = await api;
    return remote.logout();
  }, [api]);

  const createListCB = useCallback(
    async (name: string) => {
      const remote = await api;
      return remote.createList(name);
    },
    [api]
  );

  const deleteListCB = useCallback(
    async (list_id: string) => {
      const remote = await api;
      return remote.deleteList(list_id);
    },
    [api]
  );

  // Generate the groups
  useEffect(() => {
    const groups = info2Groups(info, groupBy, filter, search);
    setGroups(groups);
  }, [info, groupBy, search, filter]);

  // Fetch the data
  useEffect(() => {
    loadDataCB();
    // eslint-disable-next-line
  }, []);

  // A redirect if we need it
  const [redirect, setRedirect] = useState<string | null>(null);

  // Menu anchor and handlers
  const handleMenuAbout = () => {
    setAboutOpen(true);
  };
  const handleMenuNewList = () => {
    setCreateOpen(true);
  };
  const handleLogout = () => {
    logoutCB().then(() => setRedirect("/main"));
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
  const handleCreateCommit = (name: string) => {
    createListCB(name)
      .then(() => {
        setCreateOpen(false);
        // We have to do this to get the new ID of the list.
        loadDataCB();
      })
      .catch((err) => handleError(err));
  };

  // Build the crazy table.
  const lists = info.lists;

  // Delete list dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteList, setDeleteList] = useState<List | null>(null);
  const handleDeleteClose = () => {
    setDeleteOpen(false);
  };
  const handleDeleteClick = (list: List) => {
    setDeleteList(list);
    setDeleteOpen(true);
  };
  const handleDelete = (list: List) => {
    deleteListCB(list.id)
      .then(() => loadDataCB())
      .then(() => setDeleteOpen(false))
      .catch((err) => handleError(err));
  };

  const remove = async (groupIndex: number, index: number, lid: string) => {
    const newGroups = groups.slice();
    const fol = newGroups[groupIndex].followers[index];
    const use = await api;
    setInProgress({ list: lid, follower: fol.id });
    fol.lists = fol.lists.filter((value) => value !== lid);
    await use
      .removeFromList(lid, fol.id)
      .then((resp) => {
        setInProgress(null);
        setGroups(newGroups);
      })
      .catch((err) => handleError(err));
  };

  const add = async (groupIndex: number, index: number, lid: string) => {
    const newGroups = groups.slice();
    const fol = newGroups[groupIndex].followers[index];
    fol.lists.push(lid);
    const use = await api;
    setInProgress({ list: lid, follower: fol.id });
    await use
      .addToList(lid, fol.id)
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
      refresh={loadDataCB}
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
      Hmm. There's no data here. Create a new list, or try reloading!
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
      {deleteList ? (
        <DeleteListDialog
          open={deleteOpen}
          list={deleteList}
          handleClose={handleDeleteClose}
          handleDelete={handleDelete}
        />
      ) : (
        <span />
      )}
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
        {loading ? (
          <LinearProgress variant="determinate" value={loadProgress} />
        ) : (
          ""
        )}
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
