import React from "react";
import { Route, Prompt, Switch } from "react-router-dom";
import update from "immutability-helper";
import TinyMCEInput from "./TinyMCEInput.js";

import TINYMCE_CONFIG from "./tinymceconfig.js";
import { withProps } from "./util.js";
import { MoveLogbookWidget } from "./moveWidgets.js";
import "./logbookeditor.css";

// Editor for a single logbook attribute
class LogbookAttributeEditor extends React.PureComponent {
  onChangeName(event) {
    this.triggerOnChange({ name: event.target.value });
  }

  onChangeType(event) {
    this.triggerOnChange({ type: event.target.value });
  }

  onChangeOptions(event) {
    this.triggerOnChange({ options: event.target.value.split("\n") });
  }

  onChangeRequired(event) {
    this.triggerOnChange({ required: event.target.checked });
  }

  triggerOnChange(changes) {
    const { name, type, options, required } = this.props;
    const state = { name, type, options, required, ...changes };
    this.props.onChange(this.props.index, state);
  }

  render() {
    return (
      <div className="attribute" style={{ display: "inline-block" }}>
        <label>
          <input
            className="form-control form-control-sm"
            type="text"
            // ref="name"
            value={this.props.name}
            onFocus={event => event.target.select()}
            disabled={this.props.existingAttribute}
            onChange={this.onChangeName.bind(this)}
          />
        </label>
        Type:{" "}
        <select
          className="form-control form-control-sm inline-block"
          style={{ width: "10em" }}
          name="type"
          // ref="type"
          value={this.props.type}
          disabled={this.props.existingAttribute}
          onChange={this.onChangeType.bind(this)}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="option">Option</option>
          <option value="multioption">Multioption</option>
        </select>
        <label>
          <input
            type="checkbox"
            // ref="required"
            checked={this.props.required}
            onChange={this.onChangeRequired.bind(this)}
          />
          Required
        </label>
        <label
          style={{
            display:
              this.props.type === "option" || this.props.type === "multioption"
                ? "inline-block"
                : "none"
          }}
        >
          Options:
          <textarea
            rows="3"
            // ref="options"
            title="Choices available for the attribute (one per line)"
            value={(this.props.options || []).join("\n") || ""}
            onChange={this.onChangeOptions.bind(this)}
          />
        </label>
      </div>
    );
  }
}

// Edit a logbook
class LogbookEditorBase extends React.Component {
  /* Base class for logbook editors
       The idea is to make different subclasses depending on whether
       we're creating a new lognbook or editing an existing one. This
       cuts down on the amount of conditional logic.*/

  UNSAFE_componentWillMount() {
    if (this.props.match.params.logbookId > 0) {
      this.fetch();
    }
  }

  changeName(event) {
    this.setState({ name: event.target.value });
  }
  createUserGroupWidget(userGroups, selectedValue, loggedInUsername, isNewLogbook, onChange) {
    if (!userGroups || userGroups.length === 0) {
      return null;
    }
    //If new logbook, show widget if logged in
    if (isNewLogbook){
      if (!loggedInUsername){
        return null;
      }
    }else{//if existing logbook, show widget if logged in user is the owner
      if (!loggedInUsername || loggedInUsername !== this.state.logbook.owner){
        return null;
      }
    }
    return (
      <React.Fragment>
        <div className="editor-subtitle">Visibility</div>
        Make this logbook available to
        <select
          value={selectedValue}
          onChange={onChange}
          className="form-control form-control-sm inline-block ml-1"
          style={{ width: "15em" }}
        >
          <option value="">Everyone</option>
          {userGroups.map(group => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </React.Fragment>
    );
  }

  changeDescription(event) {
    this.setState({ description: event.target.value });
  }

  getAttributes() {
    const { logbook, attributes } = this.state;

    return attributes.map((attr, i) => {
      const existingAttribute =
        logbook && logbook.attributes.some(({ name }) => name === attr.name);

      return (
        <div className="attribute-panel" key={i}>
          <div className="button-row">
            <button
              title="Remove this attribute"
              type="button"
              className="btn btn-danger btn-xs mr-1"
              onClick={this.removeAttribute.bind(this, i)}
            >
              <i className="fa fa-trash" />
            </button>
            <button
              title="Move this attribute up in the list"
              className="btn btn-secondary btn-xs mr-1"
              type="button"
              onClick={this.moveAttribute.bind(this, i, -1)}
            >
              <i className="fa fa-arrow-up" />
            </button>
            <button
              title="Move this attribute down in the list"
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={this.moveAttribute.bind(this, i, 1)}
            >
              <i className="fa fa-arrow-down" />
            </button>
          </div>
          <LogbookAttributeEditor
            key={i}
            index={i}
            type={attr.type}
            name={attr.name}
            options={attr.options}
            required={attr.required}
            onChange={this.changeAttribute.bind(this)}
            existingAttribute={existingAttribute}
          />
        </div>
      );
    });
  }

  findAttribute(name) {
    const attr = this.state.attributes.find(attr => attr.name === name);
    return this.state.attributes.indexOf(attr);
  }

  changeAttribute(index, attr) {
    this.setState(
      update(this.state, { attributes: { [index]: { $set: attr } } })
    );
  }

  removeAttribute(index, event) {
    event.preventDefault();
    this.setState(
      update(this.state, { attributes: { $splice: [[index, 1]] } })
    );
  }

  insertAttribute(index, event) {
    const existingNames = this.state.attributes.map(({ name }) => name);
    const nameBase = "New attribute";
    let attributeName = nameBase;
    let counter = 1;

    while (existingNames.includes(attributeName)) {
      attributeName = `${nameBase} (${counter})`;
      counter++;
    }

    event.preventDefault();
    const newAttribute = {
      type: "text",
      name: attributeName,
      options: [],
      required: false
    };

    this.setState(
      update(this.state, {
        attributes: { $splice: [[index, 0, newAttribute]] }
      })
    );
  }

  moveAttribute(index, delta, event) {
    event.preventDefault();
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex > this.state.attributes.length - 1) return;
    const attr = this.state.attributes[index];
    var state = update(this.state, {
      attributes: { $splice: [[index, 1]] }
    });
    state = update(state, {
      attributes: { $splice: [[newIndex, 0, attr]] }
    });
    this.setState(state);
  }

  onTemplateChange(value) {
    this.setState({ template: value });
  }

  hasEdits() {
    const original = this.state.logbook || {};
    return (
      !this.submitted &&
      (this.state.name !== original.name ||
        this.state.description !== original.description ||
        this.state.template !== original.template ||
        this.state.attributes !== original.attributes)
    );
  }

  getPromptMessage() {
    if (this.hasEdits())
      return "Looks like you are making edits to a logbook! If you leave, you will lose those.";
  }

  getErrors() {
    if (this.state.error) {
      return (
        <div className="error" title="Error received from the server">
          {JSON.stringify(this.state.error.messages)}
        </div>
      );
    }
  }

  render() {
    return <Route render={this.innerRender.bind(this)} />;
  }
}

class LogbookEditorNew extends LogbookEditorBase {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      metadata: {},
      attributes: [],
      parent: {},
      user_group: "",
      owner: "",
      error: null,
      loadError: "",
    };
  }

  async fetch() {
    const response = await fetch(`/api/logbooks/${this.props.match.params.logbookId || 0}/`, {
      headers: { Accept: "application/json" }
    })
    if (!response.ok) {
      switch (response.status) {
        case 401:
          this.setState({
            loading: false,
            loadError: "You are not authorized to view this logbook"
          });
          break;
        default:
          this.setState({
            loading: false,
            loadError:
              "Unable to load logbook, the server responsed with code " +
              response.status
          });
      }
      return;
    }
    const json = await response.json();
    this.setState({
      loadError: "",
      parent: json.logbook,
      attributes: json.logbook.attributes
    })

  }

  onSubmit(history) {
    this.submitted = true;
    const {
      parent,
      name,
      newDescription,
      description,
      attributes,
      newTemplate,
      template,
      user_group
    } = this.state;
    // creating a new logbook
    // either as a new toplevel, or as a child of the given logbook
    const url = this.props.match.params.logbookId
      ? `/api/logbooks/${this.props.match.params.logbookId}/`
      : "/api/logbooks/";
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent_id: parent ? parent.id : null,
        name,
        description: newDescription || description,
        attributes: attributes,
        template: newTemplate || template,
        template_content_type: "text/html",
        user_group,
        owner: this.props.loggedInUsername,
      })
    })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        response.json().then(
          error => {
            this.setState({ error: error });
          },
          error => {
            this.setState({
              error: {
                message: response.statusText,
                code: response.status
              }
            });
          }
        );
        throw new Error("submit failed");
      })
      .then(
        result => {
          this.props.eventbus.publish("logbook.reload", this.state.id);
          history.push({
            pathname: `/logbooks/${result.logbook.id}`,
            search: window.location.search
          });
        },
        error => console.log(error)
      );
  }

  innerRender({ history }) {
    if (this.state.loadError) {
      return (
        <div style={{ padding: "2em", fontSize: "1.2em", textAlign: "center" }}>
          {this.state.loadError}
        </div>
      );
    }
    const userGroups = this.props.userGroups || [];
    return (
      <div id="logbookeditor">
        <Prompt message={this.getPromptMessage.bind(this)} />

        <header>
          {this.state.parent.id ? (
            <div>
              New logbook in <b>{this.state.parent.name}</b>
            </div>
          ) : (
            <div>New top level logbook</div>
          )}
        </header>

        <form>
          <div className="editor-subtitle">Name</div>
          <input
            className="form-control form-control-sm"
            type="text"
            name="name"
            value={this.state.name}
            onChange={this.changeName.bind(this)}
          />
          {this.createUserGroupWidget(
            userGroups,
            this.state.user_group,
            this.props.loggedInUsername,
            true,
            event => this.setState({ user_group: event.target.value })
          )}
          <div className="editor-subtitle">Description</div>
          <textarea
            className="form-control form-control-sm"
            name="description"
            rows={5}
            value={this.state.description || ""}
            onChange={this.changeDescription.bind(this)}
          />
          <div className="editor-subtitle">Template</div>
          <div className="template">
            <TinyMCEInput
              value={this.state.template || ""}
              tinymceConfig={TINYMCE_CONFIG}
              onChange={this.onTemplateChange.bind(this)}
            />
          </div>
          <div className="editor-subtitle">
            Attributes
            <button
              title="Add a new attribute"
              type="button"
              className="btn btn-link"
              onClick={this.insertAttribute.bind(
                this,
                this.state.attributes.length
              )}
            >
              Add
            </button>
          </div>
          <div className="attributes">{this.getAttributes()}</div>
        </form>

        {this.getErrors()}

        <div>
          <button
            className="btn btn-info float-right mr-1"
            onClick={this.onSubmit.bind(this, history)}
          >
            Submit
          </button>
        </div>
      </div>
    );
  }
}

class LogbookEditorEdit extends LogbookEditorBase {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      metadata: {},
      attributes: [],
      logbook: {},
      archived: false,
      user_group: "",
      error: null,
      loadError: "",
    };
  }

  async fetch() {
    const response = await fetch(`/api/logbooks/${this.props.match.params.logbookId || 0}/`, {
      headers: { Accept: "application/json" }
    })
    if (!response.ok) {
      switch (response.status) {
        case 401:
          this.setState({
            loading: false,
            loadError: "You are not authorized to view this logbook"
          });
          break;
        default:
          this.setState({
            loading: false,
            loadError:
              "Unable to load logbook, the server responsed with code " +
              response.status
          });
      }
      return;
    }
    const json = await response.json()
    this.setState({
      loadError: "",
      logbook: json.logbook,
      ...json.logbook
    })
  }

  onSubmit(history) {
    this.submitted = true;
    const parentId =
      this.state.parentId || (this.state.parent ? this.state.parent.id : null);

    const {
      id,
      name,
      description,
      attributes,
      newTemplate,
      template,
      user_group,
      archived,
    } = this.state;
    fetch(`/api/logbooks/${this.state.id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        parent_id: parentId !== 0 ? parentId : null,
        name,
        description,
        attributes,
        archived,
        template: newTemplate || template,
        template_content_type: "text/html",
        user_group,
      })
    })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        response.json().then(
          error => {
            this.setState({ error: error });
          },
          error => {
            this.setState({
              error: {
                message: response.statusText,
                code: response.status
              }
            });
          }
        );
        throw new Error("submit failed");
      })
      .then(
        result => {
          history.push({
            pathname: `/logbooks/${this.state.id}`,
            search: window.location.search
          });
          this.props.eventbus.publish("logbook.reload", this.state.id);
        },
        error => console.log(error)
      );
  }

  onParentChange(parentId) {
    this.setState({ parentId: parentId });
  }

  onArchivedChange(event) {
    this.setState({ archived: event.target.checked });
  }

  innerRender({ history }) {
    if (this.state.loadError) {
      return (
        <div style={{ padding: "2em", fontSize: "1.2em", textAlign: "center" }}>
          {this.state.loadError}
        </div>
      );
    }
    const userGroups = this.props.userGroups || [];
    const parentId =
      this.state.parentId || (this.state.parent ? this.state.parent.id : 0);

    if (!this.state.id) return <div>Loading...</div>;
    return (
      <div id="logbookeditor">
        <Prompt message={this.getPromptMessage.bind(this)} />

        <header>
          Editing logbook <b>{this.state.logbook.name}</b> in{" "}
          <MoveLogbookWidget
            currentParentId={parentId}
            currentId={this.state.id}
            currentName={this.state.name}
            onLogbookChange={this.onParentChange.bind(this)}
          />
        </header>

        <form>
          <div className="editor-subtitle">Name</div>
          <input
            className="form-control form-control-sm"
            type="text"
            name="name"
            value={this.state.name}
            onChange={this.changeName.bind(this)}
          />
          {this.createUserGroupWidget(userGroups, this.state.user_group, this.props.loggedInUsername, false, event =>
            this.setState({ user_group: event.target.value })
          )}
          <div className="editor-subtitle">Description</div>
          <textarea
            className="form-control form-control-sm"
            name="description"
            rows={5}
            value={this.state.description || ""}
            onChange={this.changeDescription.bind(this)}
          />
          <div className="editor-subtitle">Template</div>
          <div className="template">
            <TinyMCEInput
              value={this.state.template || ""}
              tinymceConfig={TINYMCE_CONFIG}
              onChange={this.onTemplateChange.bind(this)}
            />
          </div>
          <div className="editor-subtitle">
            Attributes
            <button
              title="Add a new attribute"
              type="button"
              className="btn btn-link"
              onClick={this.insertAttribute.bind(
                this,
                this.state.attributes.length
              )}
            >
              Add
            </button>
          </div>
          <div className="info-panel">Some attributes names comes with special features:
            <ul style={{margin: "0.2em 0em"}}>
              <li><b>Mailto</b> - Will send an email to the address specified as the attribute value when the entry is created. Supports the data types Text, Option and Multioption </li>
              <li><b>Tags</b> - Will show the attribute value in the entry preview list (Elogy middle panel). Supported by all data types.</li>
            </ul>
          </div>
          <div className="attributes">{this.getAttributes()}</div>
        </form>

        {this.getErrors()}

        <footer>
          <label>
            <input
              type="checkbox"
              checked={this.state.archived}
              onChange={this.onArchivedChange.bind(this)}
            />
            Archived
          </label>
          <div style={{ height: "3em" }}>
            <button
              className="btn btn-info float-right mr-1"
              onClick={this.onSubmit.bind(this, history)}
              disabled={!this.canSubmit()}
            >
              Submit
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // Disable the submit button if there are duplicate field names
  canSubmit() {
    const attributeNames = this.state.attributes.map(({ name }) => name);
    return !attributeNames.some(
      (name, i) => attributeNames.indexOf(name) !== i
    );
  }
}

class LogbookEditor extends React.Component {
  /* just a dummy component that routes to the correct editor */

  render() {
    return (
      <Switch>
        <Route
          path="/logbooks/new"
          component={withProps(LogbookEditorNew, this.props)}
        />
        <Route
          path="/logbooks/:logbookId/new"
          component={withProps(LogbookEditorNew, this.props)}
        />
        <Route
          path="/logbooks/:logbookId/edit"
          component={withProps(LogbookEditorEdit, this.props)}
        />
      </Switch>
    );
  }
}

export default LogbookEditor;
