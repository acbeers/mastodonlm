// A following/list mapping table

import React, { useState, useEffect, MouseEvent } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";

import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import { List, User, Group, InProgress } from "@mastodonlm/shared";

import "./FollowingTable.css";

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

type FollowingTableProps = {
  groupIndex: number;
  group: Group;
  lists: List[];
  inProgress: InProgress | null;
  remove: (groupIndex: number, index: number, listid: string) => void;
  add: (groupIndex: number, index: number, listid: string) => void;
  handleDeleteClick: (list: List) => void;
  handleInfoClick: (list: List) => void;
  defaultOpen: boolean;
  pageSize?: number;
  onNewList: () => void;
};

export default function FollowingTable({
  groupIndex,
  group,
  lists,
  inProgress,
  remove,
  add,
  handleDeleteClick,
  handleInfoClick,
  defaultOpen,
  pageSize = 500,
  onNewList,
}: FollowingTableProps) {
  // Popover anchor and handlers
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [follower, setFollower] = useState<User | null>(null);
  // Whether or not we are open
  const [open, setOpen] = useState(defaultOpen);
  // which page we are on.
  const [page, setPage] = useState(0);
  // which column to highlight
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const numPages = Math.ceil(group.followers.length / pageSize);

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>, fol: User) => {
    setFollower(fol);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (page >= numPages) setPage(numPages - 1);
  }, [group, page, numPages]);

  const popoverOpen = Boolean(anchorEl);

  const headers = lists.map((l, lindex) => {
    const classes = ["listname"];
    if (hoverCol === lindex) classes.push("hover");
    return (
      <th key={l.id} className={classes.join(" ")}>
        <div key={l.id}>
          <div>
            <span className="listTitle">{l.title}</span>
          </div>
          <div className="icon">
            <Tooltip enterDelay={500} enterNextDelay={500} title="Delete list">
              <DeleteOutlinedIcon
                fontSize="small"
                onClick={() => handleDeleteClick(l)}
              />
            </Tooltip>
          </div>
          <br />
          <div className="icon">
            <Tooltip
              enterDelay={500}
              enterNextDelay={500}
              title="List analytics"
            >
              <InfoOutlinedIcon
                fontSize="small"
                onClick={() => handleInfoClick(l)}
              />
            </Tooltip>
          </div>
        </div>
      </th>
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
            style={style.card.header.container}
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
          <CardContent style={style.card.content.container}>
            <Typography variant="body2">
              <span dangerouslySetInnerHTML={{ __html: follower.note }}></span>
            </Typography>
          </CardContent>
        </Card>
      </Popover>
    );
  }
  const start = page * pageSize;
  const end = start + pageSize;
  const rows = group.followers.slice(start, end).map((fol, index) => {
    const cols = lists.map((l, lindex) => {
      const classes = ["cell"];
      if (hoverCol === lindex) classes.push("hover");
      const cn = classes.join(" ");
      const cmp = { list: l.id, follower: fol.id };
      if (JSON.stringify(inProgress) === JSON.stringify(cmp)) {
        return (
          <td
            key={l.id + fol.id}
            className={cn}
            data-testid={l.id + fol.id}
            onClick={() => remove(groupIndex, index, l.id)}
            onMouseEnter={() => setHoverCol(lindex)}
            onMouseLeave={() => setHoverCol(null)}
          >
            <CircularProgress size={10} />
          </td>
        );
      } else if (fol.lists.includes(l.id)) {
        return (
          <td
            key={l.id + fol.id}
            className={cn}
            data-testid={l.id + fol.id}
            onClick={() => remove(groupIndex, page * pageSize + index, l.id)}
            onMouseEnter={() => setHoverCol(lindex)}
            onMouseLeave={() => setHoverCol(null)}
          >
            X
          </td>
        );
      } else {
        return (
          <td
            key={l.id + fol.id}
            className={cn}
            data-testid={l.id + fol.id}
            onClick={() => add(groupIndex, page * pageSize + index, l.id)}
            onMouseEnter={() => setHoverCol(lindex)}
            onMouseLeave={() => setHoverCol(null)}
          >
            &nbsp;
          </td>
        );
      }
    });
    const [user, domain] = fol.acct.split("@");
    const link = `https://${domain}/@${user}`;
    return (
      <tr className="following-row" key={fol.id}>
        <td align="right" className="usercell">
          <Typography
            variant="body2"
            aria-owns={popoverOpen ? "mouse-over-popover" : undefined}
            aria-haspopup="true"
            onMouseEnter={(evt) => handlePopoverOpen(evt, fol)}
            onMouseLeave={handlePopoverClose}
          >
            <a href={link} target="_blank" rel="noreferrer">
              <span>{fol.display_name}</span>
            </a>
          </Typography>
        </td>
        {cols}
      </tr>
    );
  });

  const table = (
    <table className="followingTable">
      <thead>
        <tr>
          <th>&nbsp;</th>
          {headers}
          <th>
            <div>
              <span
                data-testid="new-list"
                className="listTitle newList"
                onClick={onNewList}
              >
                (New list)
              </span>
            </div>
            <div style={{ visibility: "hidden" }} className="icon">
              <DeleteOutlinedIcon fontSize="small" />
            </div>
            <div style={{ visibility: "hidden" }} className="icon">
              <InfoOutlinedIcon fontSize="small" />
            </div>
          </th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );

  const icon = open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />;

  const pageControls = (
    <div>
      <Button onClick={() => setPage(Math.max(page - 1, 0))}>&lt;</Button>
      Page {page + 1} / {numPages}
      <Button
        data-testid="next-page"
        onClick={() => setPage(Math.min(page + 1, numPages - 1))}
      >
        &gt;
      </Button>
    </div>
  );

  return (
    <div key={group.key}>
      <div
        data-testid="ft-expando"
        className="group"
        onClick={() => setOpen(!open)}
      >
        {icon} {group.key} ({group.followers.length})
      </div>
      {open ? table : ""}
      {open ? pageControls : ""}
      {popover}
    </div>
  );
}
