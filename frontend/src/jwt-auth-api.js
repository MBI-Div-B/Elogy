export async function login(username, password) {
  try {
    const resp = await fetch("/api/auth/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password,
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