const msalConfig = {
  auth: {
    clientId: CONFIG.clientId,
    authority: "https://login.microsoftonline.com/consumers",
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
    if (accounts.length > 0) {
      currentAccount = accounts[0];
      return true;
    }
    await msalInstance.loginRedirect({ scopes: CONFIG.scopes });
    return false;
  } catch (e) {
    console.error("Error login:", e);
    mostrarError("No se pudo iniciar sesión. Intenta de nuevo.");
    return false;
  }
}

async function obtenerToken() {
  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: CONFIG.scopes,
      account: currentAccount
    });
    return result.accessToken;
  } catch (e) {
    try {
      const result = await msalInstance.acquireTokenPopup({ scopes: CONFIG.scopes });
      return result.accessToken;
    } catch (e2) {
      console.error("Error token:", e2);
      mostrarError("Sesión expirada. Por favor inicia sesión nuevamente.");
      return null;
    }
  }
}

async function cerrarSesion() {
  await msalInstance.logoutRedirect();
}

function obtenerUsuario() {
  return currentAccount ? currentAccount.name || currentAccount.username : null;
}
