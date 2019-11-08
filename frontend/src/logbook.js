/* Displays a logbook and the entries in it, after optional filtering */

import React from "react";
import { findDOMNode } from "react-dom";
import { Link } from "react-router-dom";
import update from "immutability-helper";
import { notification } from "./widgets";
import { parseQuery } from "./util.js";
import EntryPreviews from "./entrypreviews.js";
import "./logbook.css";

function LoadMore({ loading, moreEntries, onLoadMore }) {
  return (
    <div className="load-more">
      {loading ? (
        <i className="fa fa-refresh fa-spin" />
      ) : moreEntries ? (
        <div onClick={onLoadMore.bind(this)}>Load more</div>
      ) : null}
    </div>
  );
}

class Logbook extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logbook: {},
      entries: [],
      attributeFilters: {},
      loading: false,
      downloading: false,
      moreEntries: true,
      sortBy: "created"
    };
    this._reload = this.reload.bind(this);
    this.download = this.download.bind(this);
  }
  //download logbook as html
  download() {
    const url = `/api/download/?logbook_id=${this.state.logbook.id}&include_attachments=true`;
    this.setState({ downloading: true });
    fetch(url, {
      method: "GET",
      headers: { Accept: "application/zip" }
    })
      .then(response => response.blob())
      .then(blob => {
        var newBlob = new Blob([blob], { type: "application/zip" });
        // IE doesn't allow using a blob object directly as link href
        // instead it is necessary to use msSaveOrOpenBlob
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(newBlob);
          return;
        }

        // For other browsers:
        // Create a link pointing to the ObjectURL containing the blob.
        const data = window.URL.createObjectURL(newBlob);
        var link = document.createElement("a");
        link.href = data;
        link.setAttribute("type", "hidden");
        link.download = "elogy_logbook_" + this.state.logbook.id + ".zip";
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
          // For Firefox it is necessary to delay revoking the ObjectURL
          window.URL.revokeObjectURL(data);
          link.remove();
        }, 1000);
        this.setState({ downloading: false });
      });
  }

  // Fetch entries
  fetch(logbookId, search, attributeFilters, sortBy, offset, n) {
    // build a nice query string with the query
    // we'll start with the parameters in the browser URL
    const query = search ? parseQuery(search) : {};
    query["n"] = n || query["n"] || 50;
    query["offset"] = offset || 0;
    const attributes = Object.keys(attributeFilters)
      .filter(key => attributeFilters[key])
      .map(key => `attribute=${key}:${attributeFilters[key]}`)
      .join("&");
    const newSearch =
      Object.keys(query)
        .map(key => `${key}=${query[key]}`)
        .join("&") +
      "&" +
      attributes;

    const sortByTimestamp = sortBy === "modified";
    const url = `/api/logbooks/${logbookId || 0}/entries/?${newSearch ||
      ""}&sort_by=${sortBy}&sort_by_timestamp=${sortByTimestamp}`;

    this.setState({ loading: true });
    fetch(url, {
      headers: { Accept: "application/json" }
    })
      .then(response => response.json())
      .then(json => {
        this.setState({ loading: false });
        if (offset) {
          // append the new entries
          this.setState(
            update(this.state, { entries: { $push: json.entries } })
          );
        } else {
          // replace entries
          this.setState(json);
        }

        // If we get fewer than the maximum page size, we
        // know the server does not have any more
        // entries. This is a little primitive, but it
        // turns out it's not so easy to just get the
        // total number of entries from the db. Something
        // to look further into sometime.
        const moreEntries = json.entries.length >= query["n"];
        this.setState({ moreEntries });
      });
  }

  UNSAFE_componentWillReceiveProps(props) {
    const params = new URLSearchParams(props.location.search);
    const sortBy = params.get("sort_by") || "created";
    this.setState({ sortBy });
  }

  UNSAFE_componentWillMount() {
    this.fetch(
      this.props.match.params.logbookId,
      this.props.location.search,
      this.state.attributeFilters,
      this.state.sortBy
    );
  }

  UNSAFE_componentWillUpdate(newProps, newState) {
    // if needed, we fetch info from the server
    if (
      newProps.match.params.logbookId !== this.props.match.params.logbookId ||
      newProps.location.search !== this.props.location.search ||
      newState.attributeFilters !== this.state.attributeFilters ||
      newState.sortBy !== this.state.sortBy
    ) {
      this.fetch(
        newProps.match.params.logbookId,
        newProps.location.search,
        newState.attributeFilters,
        newState.sortBy
      );
    }
    // reset the filters if we've moved to another logbook
    if (newProps.match.params.logbookId !== this.props.match.params.logbookId) {
      this.setState(update(this.state, { attributeFilters: { $set: {} } }));
    }
  }

  componentDidMount() {
    // setup a subscription that makes sure we reload the current
    // logbook whenever e.g. an entry has been added.
    this.props.eventbus.subscribe("logbook.reload", this._reload);
  }

  componentWillUnmount() {
    this.props.eventbus.unsubscribe("logbook.reload", this._reload);
  }

  reload(logbookId) {
    // only need to refresh if we're actually visiting the given logbook
    this.fetch(
      this.props.match.params.logbookId,
      this.props.location.search,
      this.state.attributeFilters,
      this.state.sortBy
    );
  }

  componentDidUpdate({ match }) {
    // set the browser title
    document.title = this.state.logbook.name
      ? `${this.state.logbook.name}`
      : "Elogy";
    // make sure the entry list is scrolled to the top
    if (match.params.logbookId !== this.props.match.params.logbookId)
      findDOMNode(this.refs.entries).scrollIntoView();
  }

  onChangeAttributeFilter(attribute, event) {
    // TODO: this should be encoded in the URL search string, like
    // the other search parameters!
    if (event.target.selectedIndex === 0) {
      this.setState(
        update(this.state, {
          attributeFilters: { [attribute]: { $set: undefined } }
        })
      );
    } else {
      const value = event.target.value;
      this.setState(
        update(this.state, {
          attributeFilters: { [attribute]: { $set: value } }
        })
      );
    }
  }

  onLoadMore() {
    this.fetch(
      this.props.match.params.logbookId,
      this.props.location.search,
      this.state.attributeFilters,
      this.state.sortBy,
      this.state.entries.length
    );

    /*         this.fetchMoreEntries();*/
  }

  onSetSortBy(sortBy) {
    this.props.history.push(`?sort_by=${sortBy}`);
  }

  hide() {
    this.props.eventbus.publish("logbook.hide", true);
  }

  render() {
    const { logbook, downloading } = this.state,
      entryId = this.props.match.params.entryId
        ? parseInt(this.props.match.params.entryId, 10)
        : null,
      query = parseQuery(this.props.location.search),
      filter = ["title", "content", "authors", "attachments"]
        .filter(key => query[key])
        .map(key => (
          <span key={key} className="filter">
            {key}: "{query[key]}"
          </span>
        )),
      attributes = this.state.logbook.attributes
        ? this.state.logbook.attributes
            .filter(
              attr => attr.type === "option" || attr.type === "multioption"
            )
            .map(attr => (
              <select
                className="form-control form-control-xs"
                style={{ display: "inline-block", width: "30%" }}
                key={attr.name}
                onChange={this.onChangeAttributeFilter.bind(this, attr.name)}
              >
                <option>[{attr.name}]</option>
                {attr.options.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            ))
        : null,
      loadMore = this.state.moreEntries ? (
        <LoadMore
          loading={this.state.loading}
          moreEntries={this.state.moreEntries}
          onLoadMore={this.onLoadMore.bind(this)}
        />
      ) : null;

    return (
      <div
        className={"container " + (entryId !== null ? "entry-selected" : "")}
      >
        {downloading && notification("Downloading logbook, please wait...")}
        <button
          className="mobile-back-button"
          onClick={() => this.props.history.push("/")}
        >
          {" "}
          Back{" "}
        </button>
        <header>
          <span className="name">
            {/* <i className="fa fa-book" /> */}
            {logbook.id === 0 ? "[All logbooks]" : logbook.name}
          </span>
          <div className="commands">
            <a href="#">
              <i className="fa fa-minus" onClick={() => this.hide()} />
            </a>
            &nbsp;
          </div>
          <div>
            {logbook.id ? (
              <span>
                <div className="entry">
                    <Link
                    className="btn btn-link"
                    role="button"
                      to={{
                        pathname: `/logbooks/${logbook.id}/entries/new`,
                        search: window.location.search
                      }}
                      title={`Create a new entry in the logbook '${logbook.name}'`}
                    >
                      New entry
                    </Link>
                </div>
                <Link
                  className="btn btn-link"
                  role="button"
                  to={{
                    pathname: `/logbooks/${logbook.id}/edit`,
                    search: window.location.search
                  }}
                  title={`Edit the settings of the logbook '${logbook.name}'`}
                >
                  Configure
                </Link>
                <button
                  type="button"
                  className="btn btn-link"
                  title={`Download the logbook '${logbook.name}' and all its attachments`}
                  onClick={this.download}
                >
                  Download
                </button>
              </span>
            ) : null}
            <Link
              className="btn btn-link"
              role="button"
              to={{
                pathname: `/logbooks/${logbook.id}/new`,
                search: window.location.search
              }}
              title={
                logbook.id === 0
                  ? "Create a new top level logbook"
                  : `Create a new logbook as a child of '${logbook.name}'`
              }
            >
              New logbook
            </Link>
          </div>
          <div className="filters"> {filter} </div>
          <div className="attributes">{attributes}</div>
          {this.state.entries.length === 0 ? null : (
            <div className="mt-1">
              <select
                className="form-control form-control-xs"
                style={{ width: "30%" }}
                value={this.state.sortBy}
                onChange={e => this.onSetSortBy(e.target.value)}
              >
                <option value="created">Sort by date created</option>
                <option value="modified">Sorty by last modified</option>
              </select>
            </div>
          )}
        </header>
        <div className="entries-container">
          <div ref="entries">
            <EntryPreviews
              logbook={logbook}
              entries={this.state.entries}
              search={this.props.location.search}
              selectedEntryId={entryId}
              sortBy={this.state.sortBy}
            />
            {loadMore}
          </div>
        </div>
      </div>
    );
  }
}

export default Logbook;
