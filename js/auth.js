const msalConfig = {
  auth: {
    clientId:    CONFIG.clientId,
    authority:   "https://login.microsoftonline.com/consumers",
    redirectUri: CONFIG.redirectUri
  },
  cache: { cacheLocation: "sessionStorage" }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);
let currentAccount = null;

async function iniciarSesion() {
  try {
    await msalInstance.handleRedirectPromise();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) { currentAccount = accounts[0]; return true; }
    await msalInstance.loginRedirect({ scopes: CONFIG.scopes });
    return false;
  } catch(e) {
    console.error("Login error:", e);
    mostrarError("No se pudo iniciar sesión.");
    return false;
  }
}

async function obtenerToken() {
  try {
    const r = await msalInstance.acquireTokenSilent({ scopes: CONFIG.scopes, account: currentAccount });
    return r.accessToken;
  } catch(e) {
    try {
      const r = await msalInstance.acquireTokenPopup({ scopes: CONFIG.scopes });
      return r.accessToken;
    } catch(e2) {
      mostrarError("Sesión expirada. Inicia sesión nuevamente.");
      return null;
    }
  }
}

async function cerrarSesion() { await msalInstance.logoutRedirect(); }
function obtenerUsuario() { return currentAccount ? (currentAccount.name || currentAccount.username) : null; }
