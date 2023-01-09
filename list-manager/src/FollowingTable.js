// A following/list mapping table

import React, { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";

import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

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

export default function FollowingTable({
  groupIndex,
  group,
  lists,
  inProgress,
  remove,
  add,
  handleDeleteClick,
  defaultOpen,
  toggleOpen,
}) {
  // Popover anchor and handlers
  const [anchorEl, setAnchorEl] = useState(null);
  const [follower, setFollower] = useState(null);
  // Whether or not we are open
  const [open, setOpen] = useState(defaultOpen);

  const handlePopoverOpen = (event, fol) => {
    setFollower(fol);
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const popoverOpen = Boolean(anchorEl);

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
  const rows = group.followers.map((fol, index) => {
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

  const icon = open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />;

  return (
    <div key={group.key}>
      <div className="group" onClick={() => setOpen(!open)}>
        {icon} {group.key} ({group.followers.length})
      </div>
      {open ? table : ""}
      {popover}
    </div>
  );
}
