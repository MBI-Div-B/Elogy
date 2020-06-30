/* The main file that ties together the various components into an "app" */

import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { Link } from "react-router-dom";
import Cookies from "universal-cookie";
import Entry from "./entry.js";
import Login from "./login.js";
import EntryEditor from "./entryeditor.js";
import Logbook from "./logbook.js";
import LogbookEditor from "./logbookeditor.js";
import LogbookTree from "./logbooktree.js";
import QuickSearch from "./search.js";
import EventBus from "./eventsystem.js";
import { withProps } from "./util.js";
import "./app.css";

// A common eventbus that allows simple communication between
// components. Should only be used for simple things like
// asking a component to reload. If we start using it for passing
// data around we'd better switch to Redux or something.
const eventbus = new EventBus();

// wrap the relevant component with the eventbus as a prop

const LogbookTreeWithEventbus = withProps(LogbookTree, { eventbus });
const LogbookWithEventbus = withProps(Logbook, { eventbus });

// dummy components for when no logbook is selected
class NoLogbook extends React.Component {
  render() {
    return (
      <div className="empty">
        <i className="fa fa-arrow-left" /> Select a logbook
        <div>
          {" "}
          or{" "}
          <Link
            to={{
              pathname: "/logbooks/0/new",
              search: window.location.search
            }}
          >
            create a new one
          </Link>
          .
        </div>
      </div>
    );
  }
}

class NoEntry extends React.Component {
  // a dummy for when no entry is selected

  render() {
    const logbookId = parseInt(this.props.match.params.logbookId, 10);

    return (
      <div className="empty">
        <i className="fa fa-arrow-left" /> Select an entry to read it
        {logbookId ? (
          <div>
            {" "}
            or{" "}
            <Link
              to={{
                pathname: `/logbooks/${logbookId}/entries/new`,
                search: window.location.search
              }}
            >
              click here to make a new entry.
            </Link>
          </div>
        ) : null}
      </div>
    );
  }
}

class HiddenColumn extends React.Component {
  render() {
    return (
      <div className="hiddenColumn">
        <a href="#">
          <i
            className="fa fa-plus showColumn"
            onClick={() => this.props.show()}
          />
        </a>
        <p className="vertical-text">{this.props.text}</p>
      </div>
    );
  }
}

class Elogy extends React.Component {
  constructor() {
    super();
    this.state = {
      hideLogbookTree: false,
      hideLogbook: false,
      userCredentials: {},
      loggedIn: false
    };
    this._hideLogbookTree = this._hideLogbookTree.bind(this);
    this._hideLogbook = this._hideLogbook.bind(this);
    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
  }

  async componentDidMount() {
    eventbus.subscribe("logbooktree.hide", this._hideLogbookTree);
    eventbus.subscribe("logbook.hide", this._hideLogbook);
    const cookies = new Cookies();
    const jwt = cookies.get("jwt");
    if (jwt) {
      try {
        const decoded = JSON.parse(atob(jwt.split(".")[1]));
        if (decoded) {
          const loggedIn = new Date().getTime() * 0.001 < decoded.exp;
          if (loggedIn) {
            this.setState({ userCredentials: decoded, loggedIn });
          } else {
            this.setState({ userCredentials: {}, loggedIn });
          }
        }
      } catch (err) {
        console.log("Invalid jwt token");
        this.setState({ userCredentials: {}, loggedIn: false });
      }
    } else {
      this.setState({ userCredentials: {}, loggedIn: false });
    }
  }

  componentWillUnmount() {
    eventbus.unsubscribe("logbooktree.hide", this._hideLogbookTree);
    eventbus.unsubscribe("logbook.hide", this._hideLogbook);
  }

  _hideLogbookTree(hide) {
    this.setState({ hideLogbookTree: hide });
  }

  _hideLogbook(hide) {
    this.setState({ hideLogbook: hide });
  }

  onLogin(userCredentials) {
    const cookies = new Cookies();
    cookies.set("jwt", userCredentials.jwt, { path: "/" });
    this.setState({ userCredentials, loggedIn: true });
    eventbus.publish(
      "logbook.reload",
      null
    );
  }
  onLogout() {
    const cookies = new Cookies();
    cookies.remove("jwt", { path: "/" });
    this.setState({ userCredentials: {}, loggedIn: false });
    eventbus.publish(
      "logbook.reload",
      null
    );
  }
  render() {
    const { userCredentials, loggedIn } = this.state;
    const userGroups =
      userCredentials && loggedIn ? userCredentials.groups : [];
    const loggedInUser =
      userCredentials && loggedIn ? userCredentials.name : "";
    const loggedInUsername =
      userCredentials && loggedIn ? userCredentials.username : "";
    return (
      /* Set up a browser router that will render the correct component
       in the right places, all depending on the current URL.  */

      <Router>
        <div id="app">
          {!this.state.hideLogbookTree ? (
            <div id="logbooks">
              <Login
                loggedInUser={loggedInUser}
                onLogin={this.onLogin}
                onLogout={this.onLogout}
              ></Login>
              <Switch>
                <Route
                  path="/logbooks/:logbookId"
                  component={LogbookTreeWithEventbus}
                />
                <Route component={LogbookTreeWithEventbus} />
              </Switch>
              <Switch>
                <Route path="/logbooks/:logbookId" component={QuickSearch} />
                <Route component={QuickSearch} />
              </Switch>
            </div>
          ) : (
            <HiddenColumn
              text={"Show LogbookTree"}
              show={this._hideLogbookTree.bind(this, false)}
            />
          )}

          {!this.state.hideLogbook ? (
            <div id="logbook">
              <Switch>
                <Route
                  path="/logbooks/:logbookId/entries/:entryId"
                  component={LogbookWithEventbus}
                />
                <Route
                  path="/logbooks/:logbookId"
                  component={LogbookWithEventbus}
                />
                <Route component={NoLogbook} />
              </Switch>
            </div>
          ) : (
            <HiddenColumn
              text={"Show Logbook"}
              show={this._hideLogbook.bind(this, false)}
            />
          )}

          <div id="entry">
            <Switch>
              <Route
                path="/logbooks/:logbookId/entries/new"
                render={props => (
                  <EntryEditor
                    loggedIn={loggedIn}
                    userCredentials={userCredentials}
                    eventbus={eventbus}
                    {...props}
                  />
                )}
              />
              <Route
                path="/logbooks/:logbookId/entries/:entryId/:command"
                render={props => (
                  <EntryEditor
                    loggedIn={loggedIn}
                    userCredentials={userCredentials}
                    eventbus={eventbus}
                    {...props}
                  />
                )}
              />

              <Route
                path="/logbooks/:logbookId/entries/:entryId"
                component={Entry}
              />

              <Route
                path="/logbooks/new"
                render={props => (
                  <LogbookEditor
                    userGroups={userGroups}
                    loggedInUsername={loggedInUsername}
                    eventbus={eventbus}
                    {...props}
                  />
                )}
              />
              <Route
                path="/logbooks/:logbookId/:command"
                render={props => (
                  <LogbookEditor
                    userGroups={userGroups}
                    loggedInUsername={loggedInUsername}
                    eventbus={eventbus}
                    {...props}
                  />
                )}
              />

              <Route path="/logbooks/:logbookId" component={NoEntry} />
            </Switch>
          </div>
        </div>
      </Router>
    );
  }
}
export default Elogy;
