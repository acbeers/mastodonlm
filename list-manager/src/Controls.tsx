import React from "react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { List } from "./types";

type ControlsProps = {
  groupBy: string;
  handleGroupByChange: (g: string) => void;
  lists: List[];
  filter: string;
  handleFilterChange: (g: string) => void;
  search: string;
  handleSearchChange: (g: string) => void;
  refresh: () => Promise<void>;
  pageSize: number;
  handlePageSizeChange: (ps: number) => void;
};

export default function Controls({
  groupBy,
  handleGroupByChange,
  lists,
  filter,
  handleFilterChange,
  search,
  handleSearchChange,
  pageSize = 500,
  handlePageSizeChange,
  refresh,
}: ControlsProps) {
  const notOnfilterItems = (lists || []).map((list) => (
    <MenuItem key={list.id} value={"not:" + list.id}>
      Not on {list.title}
    </MenuItem>
  ));
  const onfilterItems = (lists || []).map((list) => (
    <MenuItem key={list.id} value={"on:" + list.id}>
      On {list.title}
    </MenuItem>
  ));
  return (
    <div>
      <Button
        sx={{
          marginTop: "12px",
          height: 56,
          marginBottom: "12px",
          marginRight: "5px",
        }}
        variant="outlined"
        onClick={() => refresh()}
      >
        Refresh
      </Button>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel
          htmlFor="controls-groupby-select"
          id="controls-groupby-label"
        >
          Group By
        </InputLabel>
        <Select
          key="groupby"
          id="controls-groupby-select"
          name="controls-groupby-select"
          data-testid="controls-groupby-select"
          inputProps={{ "data-testid": "controls-groupby-input" }}
          value={groupBy || "none"}
          label="Group By"
          onChange={(event) => handleGroupByChange(event.target.value)}
        >
          <MenuItem value={"none"}>Nothing</MenuItem>
          <MenuItem value={"name"}>Name (first letter)</MenuItem>
          <MenuItem value={"domain"}>Account domain</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 200, marginBottom: "12px" }}>
        <InputLabel htmlFor="controls-filter-select" id="controls-select-label">
          Filter to
        </InputLabel>
        <Select
          key="filter"
          id="controls-filter-select"
          name="controls-filter-select"
          data-testid="controls-filter-select"
          inputProps={{ "data-testid": "controls-filter-input" }}
          value={filter || "everything"}
          label="Filter to"
          onChange={(event) => handleFilterChange(event.target.value)}
        >
          <MenuItem value={"everything"}>Everything</MenuItem>
          <MenuItem value={"nolists"}>Not on any list</MenuItem>
          {notOnfilterItems}
          {onfilterItems}
        </Select>
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 400, marginBottom: "12px" }}>
        <TextField
          label="Search"
          data-testid="controls-search-textfield"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
        />
      </FormControl>
      <FormControl sx={{ marginTop: "12px", width: 90, marginBottom: "12px" }}>
        <InputLabel htmlFor="controls-filter-select" id="controls-select-label">
          Page size
        </InputLabel>
        <Select
          key="filter"
          id="controls-pagesize-select"
          name="controls-pagesize-select"
          data-testid="controls-pagesize-select"
          inputProps={{ "data-testid": "controls-pagesize-input" }}
          value={pageSize}
          label="Page size"
          onChange={(event) =>
            handlePageSizeChange(event.target.value as number)
          }
        >
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
          <MenuItem value={100}>100</MenuItem>
          <MenuItem value={500}>500</MenuItem>
        </Select>
      </FormControl>
    </div>
  );
}
