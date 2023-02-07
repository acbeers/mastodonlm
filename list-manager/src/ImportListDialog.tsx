import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

type ImportListDialogProps = {
  open: boolean;
  handleImport: (list_name: string, data: string[]) => void;
  handleClose: () => void;
};

function ImportListDialog({
  open,
  handleImport,
  handleClose,
}: ImportListDialogProps) {
  const [name, setName] = useState("");
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
      });
    }
  };

  const sample = data.slice(0, 5).map((txt) => <div>{txt}</div>);

  const showSample =
    sample.length > 0 ? (
      <Typography variant="body2" sx={{ marginLeft: "10px", color: "gray" }}>
        <h4>Accounts to add:</h4>
        {sample}
        <br />({data.length} items total)
        <br />
        <br />
        Note: only accounts you follow already will be added
        <br />
        Note: adding more than 100 will likely run afoul of Mastodon API limits.
      </Typography>
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
            handleImport(listname, listdata);
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
