import React, { Component } from "react";
import { Button, Modal, FormGroup, FormControl } from "react-bootstrap";
import { login } from "./jwt-auth-api";

class Login extends Component {
  constructor(props, context) {
    super(props, context);
    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.handleValueChange = this.handleValueChange.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.state = {
      formValues: {
        username: "",
        password: ""
      },
      loggingIn: false, //if true, 'loading..'
      LoginFailed: false, //error in modal
      showModal: false
    };
  }
  render() {
    const { loggingIn, LoginFailed, showModal } = this.state;
    const { loggedInUser } = this.props;
    return (
      <React.Fragment>
        <div
          style={{
            fontSize: "0.9em",
            padding: "0.2em 0.4em",
            borderBottom: "1px solid #ddd",
            background: "#f7f7f9"
          }}
        >
          <span>{loggedInUser && <b>{loggedInUser}</b>}</span>
          <span style={{ float: "right" }}>
            {loggedInUser ? (
              <button
                onClick={this.onLogout}
                className="btn btn-link"
                style={{ fontSize: "0.95em" }}
              >
                Log out
              </button>
            ) : (
              <button
                onClick={() => this.setState({ showModal: true })}
                className="btn btn-link"
                style={{ fontSize: "0.95em" }}
                title="Login to view or create group specific logbooks"
              >
                Login
              </button>
            )}
          </span>
        </div>
        <Modal
          show={showModal}
          onHide={() => this.setState({ showModal: false })}
          backdrop="static"
        >
          <Modal.Header closeButton>
            <h5>Login to view and manage group specific logbooks</h5>
          </Modal.Header>
          <Modal.Body>
            <FormGroup>
              <FormControl
                type="text"
                label="username"
                placeholder="Username"
                onChange={this.handleValueChange}
              />
              <div style={{ padding: "0.5em 0em" }} />
              <FormControl
                type="password"
                label="password"
                placeholder="Password"
                onChange={this.handleValueChange}
                onKeyUp={this.onKeyUp}
              />
              <div style={{ color: "red", padding: "0.2em", height: "1em" }}>
                {LoginFailed && "Login failed"}
              </div>
            </FormGroup>
          </Modal.Body>
          <Modal.Footer>
            {loggingIn && (
              <span style={{ marginRight: "0.5em" }}>Logging in</span>
            )}
            <Button
              onClick={this.onLogin}
              disabled={this.state.loggingIn}
              className="btn btn-success"
            >
              Login
            </Button>
          </Modal.Footer>
        </Modal>
      </React.Fragment>
    );
  }
  onLogout() {
    this.setState({ LoginFailed: false, loggingIn: false, showModal: false });
    this.props.onLogout();
  }
  async onLogin() {
    this.setState({ loggingIn: true });
    const { username, password } = this.state.formValues;
    try {
      const json = await login(username, password);
      const { onLogin } = this.props;
      onLogin(json);
      this.setState({ LoginFailed: false, loggingIn: false, showModal: false });
    } catch (err) {
      this.setState({ LoginFailed: true, loggingIn: false, showModal: true });
    }
  }
  onKeyUp(e) {
    if (e.key === "Enter") {
      this.onLogin();
    }
  }
  handleValueChange(e) {
    this.setState({
      formValues: {
        ...this.state.formValues,
        [e.target.attributes.getNamedItem("label").value]: e.target.value
      }
    });
  }
}
export default Login;
