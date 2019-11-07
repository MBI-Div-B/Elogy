export async function login(username, password) {
  try {
    const resp = await fetch("https://jwt-auth.maxiv.lu.se/v1/login", {
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