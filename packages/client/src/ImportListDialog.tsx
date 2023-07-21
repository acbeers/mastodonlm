import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { User } from "@mastodonlm/shared";

type ImportListDialogProps = {
  open: boolean;
  users: User[]; // Users that we know about
  handleImport: (
    list_name: string,
    tofollow: string[],
    toadd: string[]
  ) => void;
  handleClose: () => void;
};

function ImportListDialog({
  open,
  users,
  handleImport,
  handleClose,
}: ImportListDialogProps) {
  const [name, setName] = useState("");
  // A list of people we are importing that we already follow
  const [following, setFollowing] = useState<string[]>([]);
  // A list of people we are importing that we don't yet follow
  const [notfollowing, setNotfollowing] = useState<string[]>([]);
  // The full list of people
  const [data, setData] = useState<string[]>([]);

  const clear = () => {
    setName("");
    setData([]);
  };

  // On file upload (click the upload button)
  const handleFiles = (files: FileList | null) => {
    // Details of the uploaded file
    if (files) {
      const file = files[0];

      const reader = file.stream().getReader();
      const decoder = new TextDecoder();
      reader.read().then(({ done, value }) => {
        // Convert to text, drop the header row.
        const strs = decoder.decode(value).split("\n").slice(1);
        setData(strs);

        // Build a map of the people we know.
        const userMap: Record<string, User> = {};
        users.forEach((u) => {
          userMap[u.acct] = u;
        });

        // Sort data into two lists
        const fol: string[] = [];
        const nfol: string[] = [];
        strs.forEach((acct) => {
          if (acct === "") return;

          if (acct in userMap && userMap[acct].following) {
            fol.push(acct);
          } else {
            nfol.push(acct);
          }
        });
        setFollowing(fol);
        setNotfollowing(nfol);
      });
    }
  };

  const sample = data.slice(0, 5).map((txt) => <div>{txt}</div>);

  const nflist = (
    <TextField
      value={notfollowing.join("\n")}
      multiline
      rows={5}
      style={{ width: 400 }}
    />
  );

  const flist = (
    <TextField
      value={following.join("\n")}
      multiline
      rows={5}
      style={{ width: 400 }}
    />
  );

  const showSample =
    sample.length > 0 ? (
      <div>
        <h4>{notfollowing.length} accounts to follow and add:</h4>
        {nflist}
        <h4>{following.length} accounts to add:</h4>
        {flist}
        <br />
        <br />
        Note: adding more than 100 will likely run afoul of Mastodon API limits.
      </div>
    ) : (
      <span />
    );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="export-list-dialog-title"
      aria-describedby="export-list-dialog-description"
    >
      <DialogTitle id="export-list-dialog-title">Import New List</DialogTitle>
      <DialogContent>
        <FormControl
          sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}
        >
          <TextField
            sx={{ marginTop: "5px" }}
            label="New list name"
            value={name}
            autoFocus
            onChange={(evt) => setName(evt.target.value)}
          ></TextField>
        </FormControl>
        <br />
        <input type="file" onChange={(evt) => handleFiles(evt.target.files)} />
        {showSample}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            clear();
            handleClose();
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="export-list-button"
          onClick={() => {
            handleClose();
            const listname = name;
            const listdata = data;
            clear();
            handleImport(listname, following, notfollowing);
          }}
          autoFocus
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportListDialog;
