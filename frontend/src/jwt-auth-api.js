export async function login(username, password) {
  try {
    const resp = await fetch(process.env.REACT_APP_JWT_AUTH, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password,
        includeDecoded: true
      })
    });
    if (!resp.ok) {
      throw Error("Login failed");
    }
    return await resp.json();
  } catch (err) {
    throw Error("Login failed");
  }
}