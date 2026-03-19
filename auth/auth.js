/**
 * auth.js — AuthService
 * Shared authentication logic used by login.html, signup.html, and index.html.
 * Users are stored in localStorage. Session is tracked in sessionStorage.
 *
 * Storage keys:
 *   localStorage  → 'notes_users'    : array of { email, passwordHash, createdAt }
 *   sessionStorage → 'notes_session' : { email, loginAt }
 */

const AuthService = (() => {
  const USERS_KEY = "notes_users";
  const SESSION_KEY = "notes_session";

  // ── Simple deterministic hash (not cryptographic — for demo only) ──
  function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return "h_" + Math.abs(hash).toString(16);
  }

  // ── Read/write helpers ──
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return true;
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        console.error("localStorage quota exceeded while saving users.");
        return false;
      }
      throw e;
    }
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  }

  function setSession(email) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ email, loginAt: new Date().toISOString() }),
      );
    } catch {
      /* session storage full — proceed without session */
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Public API ──

  /**
   * Register a new user.
   * Returns { success: true } or { success: false, field, message }
   */
  function register(email, password) {
    if (!email || !email.includes("@") || !email.includes(".")) {
      return {
        success: false,
        field: "email",
        message: "Please enter a valid email address.",
      };
    }
    if (password.length < 8) {
      return {
        success: false,
        field: "password",
        message: "Password must be at least 8 characters.",
      };
    }

    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return {
        success: false,
        field: "email",
        message: "An account with this email already exists.",
      };
    }

    const newUser = {
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    const saved = saveUsers([...users, newUser]);
    if (!saved) {
      return {
        success: false,
        field: null,
        message: "Storage full. Please clear some space and try again.",
      };
    }

    setSession(email);
    return { success: true };
  }

  /**
   * Log in an existing user.
   * Returns { success: true } or { success: false, field, message }
   */
  function login(email, password) {
    if (!email || !email.includes("@")) {
      return {
        success: false,
        field: "email",
        message: "Please enter a valid email address.",
      };
    }
    if (!password) {
      return {
        success: false,
        field: "password",
        message: "Please enter your password.",
      };
    }

    const users = getUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (!user) {
      return {
        success: false,
        field: "email",
        message: "No account found with this email.",
      };
    }
    if (user.passwordHash !== hashPassword(password)) {
      return {
        success: false,
        field: "password",
        message: "Incorrect password. Please try again.",
      };
    }

    setSession(email);
    return { success: true };
  }

  /**
   * Simulate Google OAuth — creates or logs in a demo Google user.
   */
  function loginWithGoogle() {
    const email = "demo.google@example.com";
    const users = getUsers();
    if (!users.find((u) => u.email === email)) {
      saveUsers([
        ...users,
        {
          email,
          passwordHash: "",
          createdAt: new Date().toISOString(),
          isGoogle: true,
        },
      ]);
    }
    setSession(email);
    return { success: true };
  }

  /** Returns true if there is an active session */
  function isLoggedIn() {
    return getSession() !== null;
  }

  /** Returns the current session email, or null */
  function getCurrentUser() {
    const s = getSession();
    return s ? s.email : null;
  }

  /** Log out: clear session (keeps localStorage notes/users intact) */
  function logout() {
    clearSession();
  }

  return {
    register,
    login,
    loginWithGoogle,
    isLoggedIn,
    getCurrentUser,
    logout,
  };
})();
