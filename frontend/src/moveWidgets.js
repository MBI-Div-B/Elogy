import React from "react";

/**
 * Props:
 * currentParentId - the id of the current logbooks parent logbook
 * currentId - the id of the current logbook
 * currentName - the name of the current logbook
 * onLogbookChange - a callback function returning the id of the newly selected logbook id
 */
export class MoveLogbookWidget extends React.Component {
  constructor() {
    super();
    this.state = {
      logbook: null
    };
  }

  fetch() {
    fetch("/api/logbooks/", { headers: { Accept: "application/json" } })
      .then(response => response.json())
      .then(json => this.setState(json));
  }

  componentDidMount() {
    this.fetch();
  }

  onChange(event) {
    this.props.onLogbookChange(event.target.value);
  }

  render() {
    const options = flattenLogbook(this.state.logbook)
      .filter(
        ([logbook, ancestors]) =>
          !ancestors.includes(this.props.currentName) &&
          logbook.id !== this.props.currentId
      )
      .map(([logbook, ancestors]) => (
        <LogbookOption
          key={logbook.id}
          logbook={logbook}
          current={logbook.id === this.props.currentParentId}
          ancestors={ancestors}
        />
      ));

    return (
      <select
        style={{ display: "inline-block" }}
        value={this.props.currentParentId}
        className="form-control form-control-sm"
        title="Current logbook"
        onChange={this.onChange.bind(this)}
      >
        {options}
      </select>
    );
  }
}

/**
 * Props:
 * selectedLogbook - the id of the logbook that should be selected
 * onLogbookChange - a callback function returning the id of the newly selected logbook id
 */
export class MoveEntryWidget extends React.Component {
  constructor() {
    super();
    this.state = {
      logbook: null
    };
  }

  fetch() {
    fetch("/api/logbooks/", { headers: { Accept: "application/json" } })
      .then(response => response.json())
      .then(json => this.setState(json));
  }

  componentDidMount() {
    this.fetch();
  }

  onChange(event) {
    this.props.onLogbookChange(event.target.value);
  }

  render() {
    const options = flattenLogbook(this.state.logbook)
      .map(([logbook, ancestors]) => (
        <LogbookOption
          key={logbook.id}
          logbook={logbook}
          current={logbook.id === this.props.selectedLogbook}
          ancestors={ancestors}
        />
      ));

    return (
      <select
        style={{ display: "inline-block" }}
        value={this.props.selectedLogbook}
        className="form-control form-control-sm"
        title="Current logbook"
        onChange={this.onChange.bind(this)}
      >
        {options}
      </select>
    );
  }
}

function flattenLogbook(logbook, ancestors) {
  // return a flat array of all the logbooks, along with their ancestors
  if (!logbook) return [];
  ancestors = ancestors || [];
  return logbook.children.reduce(
    (acc, ch) =>
      acc.concat(
        flattenLogbook(
          ch,
          logbook.name ? ancestors.concat([logbook.name]) : ancestors
        )
      ),
    [[logbook, ancestors]]
  );
}

// build a nice path string out of the ancestors to the logbook
const LogbookOption = ({ logbook, current, ancestors }) => {
  const logbookPath =
    ancestors.join(" / ") + (ancestors.length > 0 ? " / " : "");
  const title =
    logbookPath + (logbook && logbook.name ? logbook.name : "[Top]");
  return (
    <option
      value={logbook.id}
      title={
        !current
          ? logbook && logbook.name
            ? `Move to logbook ${title}`
            : "Move to top level"
          : ""
      }
    >
      {(current ? "" : "→ ") + title}
    </option>
  );
};