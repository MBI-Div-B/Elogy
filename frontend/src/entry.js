/* Display a full entry together with any followups */

import React from "react";
import { findDOMNode } from "react-dom";
import { Link } from "react-router-dom";
import Mark from "mark.js";
import { notification, Loading } from "./widgets.js";
import "./entry.css";
import { formatDateTimeString } from "./util.js";
import { parseQuery } from "./util.js";
import EntryAttributes from "./entryattributes.js";
import EntryAttachments from "./entryattachments.js";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

// This component renders an entry.
// An "entry" may have "followup" entries attached, and so on, so in
// practice we may display a whole tree of related entries here.
export class InnerEntry extends React.Component {
  constructor() {
    super();
    this.download = this.download.bind(this);
    this.state = { downloading: false, newerVersion: false};
  }
  componentDidMount() {
    this.highlightContentFilter();
    this.scrollToCurrentEntry();
    this.interval = setInterval(async () => {
      try{
        const response = await fetch(`/api/entries/${this.props.id}/edited`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const json = await response.json();
        const date = new Date();
        const diff =  Date.parse(json) - Date.parse(this.props.last_changed_at || 0);
        console.log(diff);
        if (diff > 1000){
          this.setState({newerVersion: true})
        }
      }catch(error){
      }
    }, 5000);
  }

  componentDidUpdate() {
    this.highlightContentFilter();
    this.scrollToCurrentEntry();
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  async download() {
    this.setState({ downloading: true });
    const url = `/api/download/?entry_id=${this.props.id}&include_attachments=true`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/zip" },
    });
    const blob = await response.blob();
    var newBlob = new Blob([blob], { type: "application/zip" });

    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(newBlob);
      this.setState({ downloading: false });
      return;
    }

    // For other browsers:
    // Create a link pointing to the ObjectURL containing the blob.
    const data = window.URL.createObjectURL(newBlob);
    var link = document.createElement("a");
    link.href = data;
    link.setAttribute("type", "hidden");
    link.download = "elogy_entry_" + this.props.id + ".zip";
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(data);
      link.remove();
    }, 1000);
    this.setState({ downloading: false });
  }

  scrollToCurrentEntry() {
    if (this.props.currentEntryId === this.props.id) {
      var node = findDOMNode(this.refs.article);
      setTimeout(node.scrollIntoView(true));
    }
  }

  highlightContentFilter() {
    // highlight the current content filter string in the content
    if (this.props.contentFilter) {
      const mark = new Mark(findDOMNode(this.refs.content));
      mark.markRegExp(new RegExp(this.props.contentFilter, "gmi"));
    }
  }

  render() {
    const { downloading, newerVersion } = this.state;
    const logbook = this.props.logbook;
    const followups = this.props.followups
      ? this.props.followups.map((followup, i) => (
          <InnerEntry
            key={followup.id}
            className="followupd"
            followupNumber={i}
            logbook={this.props.logbook}
            currentEntryId={this.props.currentEntryId}
            contentFilter={this.props.contentFilter}
            fetchEntry={this.props.fetchEntry}
            {...followup}
          />
        ))
      : null;

    const nonEmbeddedAttachments = this.props.attachments.filter(
      (a) => !a.embedded
    );
    const attachments =
      nonEmbeddedAttachments.length > 0 ? (
        <EntryAttachments attachments={nonEmbeddedAttachments} />
      ) : null;
    const followupNumber =
      this.props.followupNumber !== undefined ? (
        <span className="followup" title="This is a follow-up">
          <span className="fa fa-comment" />
          &nbsp;&nbsp;
        </span>
      ) : null;
    const lastChangedAt = this.props.last_changed_at ? (
      <span
        className="timestamp last-changed-at"
        title="The entry was last edited at this time"
      >
        &nbsp;&nbsp;
        <i className="fa fa-pencil" />
        &nbsp;
        {formatDateTimeString(this.props.last_changed_at)}
      </span>
    ) : null;
    const lock = this.props.lock ? (
      <span
        title={`The entry is locked for editing by ${this.props.lock.owned_by_ip} since ${this.props.lock.created_at}`}
        className="lock fa fa-lock"
      />
    ) : null;

    const authors = this.props.authors.map((author, i) => (
      <span
        key={i}
        className="author"
        title={`${author.email || "No email"} (${author.login || "No login"})`}
      >
        {author.name}
      </span>
    ));

    const attributes = this.props.logbook ? (
      <EntryAttributes {...this.props} />
    ) : null;

    const content =
      this.props.content_type.slice(0, 9) === "text/html" ? (
        <div
          className="content html"
          ref="content"
          dangerouslySetInnerHTML={{ __html: this.props.content }}
        />
      ) : (
        <div className="content plain">{this.props.content}</div>
      );

    const editLink = !this.props.hideEditLink ? (
      <Link
        className="btn btn-link"
        role="button"
        to={{
          pathname: `/logbooks/${logbook.id}/entries/${this.props.id}/edit`,
          search: window.location.search,
        }}
        title="Make changes to this entry"
      >
        {lock} Edit
      </Link>
    ) : null;
    return (
      <div>
        {downloading && notification("Downloading entry, please wait...")}
        <article ref="article">
          <div
            className={
              "info" +
              (this.props.currentEntryId === this.props.id ? " current" : "")
            }
          >
            <div className="commands">
              {editLink}
              <button
                type="button"
                className="btn btn-link"
                title={`Download this entry and all its attachments`}
                onClick={() => this.download(logbook.id)}
              >
                Download
              </button>
              {newerVersion && <button
                type="button"
                className="btn btn-link"
                title={`Someone has updated this entry. Click to refresh`}
                onClick={() => this.props.fetchEntry(
                  this.props.logbook.id,
                  this.props.id,
                )}
              >
                <FontAwesomeIcon icon={faSyncAlt} />
              </button>}
            </div>
            <div>
              {followupNumber}
              <span
                className="timestamp created-at"
                title="The entry was created at this time"
              >
                {" "}
                {formatDateTimeString(this.props.created_at)}
              </span>
              {lastChangedAt}
            </div>
            <div className="authors">
              <span className="fa fa-user" /> {authors}
            </div>
            {attributes}
          </div>
          {content}
          {attachments}
        </article>

        <div className="followups">{followups}</div>
      </div>
    );
  }
}

// entry display including a header
class Entry extends React.Component {
  constructor() {
    super();
    this.state = {
      loading: false,
      downloading: false,
      id: null,
      logbook: null,
      title: "",
      authors: [],
      content: "",
      loadError: "",
    };
  }

  async fetchEntry(logbookId, entryId) {
    this.setState({ loading: true });
    const response = await fetch(
      `/api/logbooks/${logbookId}/entries/${entryId}/?thread=true`,
      {
        headers: { Accept: "application/json" },
      }
    );
    if (!response.ok) {
      switch (response.status) {
        case 401:
          this.setState({
            loading: false,
            loadError: "You are not authorized to view this entry",
          });
          break;
        default:
          this.setState({
            loading: false,
            loadError:
              "Unable to load entry, the server responsed with code " +
              response.status,
          });
      }
      return;
    }
    const json = await response.json();
    this.setState({ loadError: "", loading: false, ...json.entry });
  }

  async UNSAFE_componentWillMount() {
    await this.fetchEntry(
      this.props.match.params.logbookId,
      this.props.match.params.entryId
    );
  }
  async UNSAFE_componentWillReceiveProps(newProps) {
    if (
      newProps.match.params.entryId !== this.state.id ||
      (this.state.logbook &&
        newProps.match.params.logbookId !== this.state.logbook.id)
    ) {
      await this.fetchEntry(
        newProps.match.params.logbookId,
        newProps.match.params.entryId
      );
    }
  }

  render() {
    const { logbook, id, loadError, loading } = this.state;
    if (loading) {
      return <Loading />;
    }
    if (loadError) {
      return (
        <div style={{ padding: "2em", fontSize: "1.2em", textAlign: "center" }}>
          {loadError}
        </div>
      );
    }
    if (!(id && logbook)) {
      return <div />; // placeholder on no logbook
    }

    const query = parseQuery(this.props.location.search);
    return (
      <div className="container">
        <button
          className="mobile-back-button"
          onClick={() => this.props.history.push("/logbooks/" + logbook.id)}
        >
          {" "}
          Back{" "}
        </button>
        {/* The header will always stay at the top */}
        <header>
          {logbook ? (
            <span className="commands">
              {this.state.follows ? (
                <Link
                  className="btn btn-link"
                  role="button"
                  to={{
                    pathname: `/logbooks/${logbook.id}/entries/${this.state.follows}`,
                    search: window.location.search,
                  }}
                  title="Go to the entry this one is a followup to"
                >
                  Parent
                </Link>
              ) : null}
              <Link
                className="btn btn-link"
                role="button"
                to={{
                  pathname: `/logbooks/${logbook.id}/entries/${this.state.id}/new`,
                  search: window.location.search,
                }}
                title="Create a new entry that follows this one."
              >
                <i className="fa fa-comment" /> New Follow-up
              </Link>
              <Link
                className="btn btn-link"
                role="button"
                to={{
                  pathname: `/logbooks/${logbook.id}/entries/new`,
                  search: window.location.search,
                }}
                title="Create a new entry in this logbook"
              >
                New Entry
              </Link>
            </span>
          ) : null}

          <Link
            to={{
              pathname: `/logbooks/${logbook.id}/entries/${this.state.id}`,
              search: window.location.search,
            }}
          >
            <span className="logbook">
              {/* <i className="fa fa-book" />{" "} */}
              {this.state.logbook && this.state.logbook.name}
            </span>
          </Link>

          <div className="title">{this.state.title}</div>
        </header>

        {/* The body is scrollable */}
        <div className="body">
          <div>
            <InnerEntry
              {...this.state}
              contentFilter={query.content}
              currentEntryId={parseInt(this.props.match.params.entryId, 10)}
              fetchEntry={(logbookid, entryid) => this.fetchEntry(logbookid, entryid)}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Entry;
