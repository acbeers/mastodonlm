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

import "./UsersTable.css";

const style = {
  card: {
    header: {
      container: {
        display: "flex" /* establish flex container */,
        justifyContent: "space-between",
        backgroundColor: "lightblue",
      },
      suspended: {
        display: "flex" /* establish flex container */,
        justifyContent: "space-between",
        backgroundColor: "#fbb",
      },
      limited: {
        display: "flex" /* establish flex container */,
        justifyContent: "space-between",
        backgroundColor: "#ffb",
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

type UsersTableProps = {
  groupIndex: number;
  group: Group;
  lists: List[];
  inProgress: InProgress | null;
  remove: (groupIndex: number, index: number, listid: string) => void;
  add: (groupIndex: number, index: number, listid: string) => void;
  handleDeleteClick: (list: List) => void;
  handleInfoClick: (list: List) => void;
  handleFollow: (userid: string, follow: boolean) => void;
  defaultOpen: boolean;
  pageSize?: number;
  onNewList: () => void;
};

export default function UsersTable({
  groupIndex,
  group,
  lists,
  inProgress,
  remove,
  add,
  handleDeleteClick,
  handleInfoClick,
  handleFollow,
  defaultOpen,
  pageSize = 500,
  onNewList,
}: UsersTableProps) {
  // Popover anchor and handlers
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [follower, setFollower] = useState<User | null>(null);
  // Whether or not we are open
  const [open, setOpen] = useState(defaultOpen);
  // which page we are on.
  const [page, setPage] = useState(0);
  // which column to highlight
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  // Whether or not the titles are constrained height or expanded
  const [titleExpanded, setTitleExpanded] = useState(false);

  const numPages = Math.ceil(group.users.length / pageSize);

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

  const listTitleClass = titleExpanded ? "listTitle expanded" : "listTitle";

  const headers = lists.map((l, lindex) => {
    const classes = ["listname"];
    if (hoverCol === lindex) classes.push("hover");
    return (
      <th key={l.id} className={classes.join(" ")}>
        <div key={l.id}>
          <div>
            <span
              onDoubleClick={() => setTitleExpanded(!titleExpanded)}
              className={listTitleClass}
            >
              {l.title}
            </span>
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
    const headStyle = follower.suspended
      ? style.card.header.suspended
      : follower.limited
      ? style.card.header.limited
      : style.card.header.container;
    const subheadText = follower.suspended
      ? "(This account is suspended)"
      : follower.limited
      ? "(This account is limited)"
      : follower.moved
      ? `(This account has moved to ${follower.moved.acct})`
      : null;
    const subhead = subheadText ? (
      <div>
        <span>{follower.acct}</span>
        <br />
        <span>{subheadText}</span>
      </div>
    ) : (
      <div>
        <span>{follower.acct}</span>
      </div>
    );
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
        key={follower.id}
        sx={{
          pointerEvents: "none",
        }}
      >
        <Card sx={{ maxWidth: 400 }}>
          <CardHeader
            style={headStyle}
            avatar={
              <Avatar
                aria-label="user"
                sx={{ width: 58, height: 58 }}
                src={follower.avatar}
              />
            }
            title={follower.display_name}
            subheader={subhead}
          />
          <CardContent sx={style.card.content.container}>
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
  const rows = group.users.slice(start, end).map((fol, index) => {
    const cols = lists.map((l, lindex) => {
      const classes = ["cell"];
      if (hoverCol === lindex) classes.push("hover");
      const nofollow = !fol.following;
      if (nofollow) classes.push("nofollow");
      const cn = classes.join(" ");
      const cmp = { list: l.id, follower: fol.id };
      const removeHandler = nofollow
        ? () => {}
        : () => remove(groupIndex, page * pageSize + index, l.id);
      const addHandler = nofollow
        ? () => {}
        : () => add(groupIndex, page * pageSize + index, l.id);
      const title = nofollow ? "Can't add non-followed accounts to lists" : "";

      if (JSON.stringify(inProgress) === JSON.stringify(cmp)) {
        return (
          <td
            key={l.id + fol.id}
            className={cn}
            data-testid={l.id + fol.id}
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
            onClick={removeHandler}
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
            title={title}
            onClick={addHandler}
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
    const userClasses = ["usercell"];
    if (fol.suspended) userClasses.push("suspended");
    if (fol.limited) userClasses.push("limited");
    if (fol.moved) userClasses.push("moved");
    return (
      <tr className="following-row" key={fol.id}>
        <td
          align="right"
          className={userClasses.join(" ")}
          data-testid={fol.id}
        >
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
        <td
          align="right"
          className="cell"
          onClick={() => handleFollow(fol.id, !fol.following)}
        >
          {fol.following ? <>&#10004;</> : "-"}
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
          <th>
            <span className="listTitle">Following</span>
            <div style={{ visibility: "hidden" }} className="icon">
              <DeleteOutlinedIcon fontSize="small" />
            </div>
            <div style={{ visibility: "hidden" }} className="icon">
              <InfoOutlinedIcon fontSize="small" />
            </div>
          </th>
          {headers}
          <th>
            <div>
              <span
                data-testid="new-list"
                className={listTitleClass + " newList"}
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
        {icon} {group.key} ({group.users.length})
      </div>
      {open ? table : ""}
      {open ? pageControls : ""}
      {popover}
    </div>
  );
}
