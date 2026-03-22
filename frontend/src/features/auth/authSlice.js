// =============================================================================
// features/auth/authSlice.js — Auth Redux Slice with Async Thunks
// =============================================================================
// CONCEPT: createAsyncThunk
//   An async thunk is a function that returns another function that can
//   dispatch actions. RTK's createAsyncThunk handles the boilerplate:
//
//   For each thunk, RTK auto-generates 3 action types:
//     loginUser.pending   → dispatched when the async call starts
//     loginUser.fulfilled → dispatched when the async call succeeds
//     loginUser.rejected  → dispatched when the async call fails
//
//   In the slice's extraReducers, you handle these 3 states to update UI.
//
//   Docs: https://redux-toolkit.js.org/api/createAsyncThunk
// =============================================================================

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// =============================================================================
// ASYNC THUNKS
// =============================================================================

// loginUser thunk — POST /auth/login
export const loginUser = createAsyncThunk(
  "auth/loginUser",  // action type prefix
  async (credentials, { rejectWithValue }) => {
    // CONCEPT: rejectWithValue
    // Normally, thrown errors become the action payload as an Error object.
    // rejectWithValue lets you pass a custom payload for the rejected action,
    // so you can show specific error messages in the UI.
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        return rejectWithValue(error.detail || "Login failed");
      }

      const data = await res.json();
      // Persist token to localStorage for page refreshes
      localStorage.setItem("blog_token", data.access_token);
      return data; // becomes action.payload in fulfilled reducer
    } catch (err) {
      return rejectWithValue("Network error — is the server running?");
    }
  }
);

// registerUser thunk — POST /auth/register
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const error = await res.json();
        return rejectWithValue(error.detail || "Registration failed");
      }

      const data = await res.json();
      localStorage.setItem("blog_token", data.access_token);
      return data;
    } catch (err) {
      return rejectWithValue("Network error");
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { getState, rejectWithValue }) => {
    const token = getState().auth?.token || localStorage.getItem("blog_token");
    if (!token) return rejectWithValue("Missing auth token");

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) localStorage.removeItem("blog_token");
        return rejectWithValue("Session expired");
      }

      return await res.json();
    } catch {
      return rejectWithValue("Could not restore session");
    }
  }
);

// =============================================================================
// SLICE
// =============================================================================
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("blog_token") || null, // rehydrate on page load
    loading: false,
    error: null,
  },

  reducers: {
    // Synchronous logout — clear everything
    logout: (state) => {
      state.user  = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("blog_token");
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },

  // =========================================================================
  // extraReducers — handle async thunk lifecycle actions
  // =========================================================================
  // CONCEPT: builder.addCase() lets you handle actions from other slices
  // or async thunks. This is how you wire async results into state.
  // =========================================================================
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token   = action.payload.access_token;
        state.user    = {
          id:       action.payload.user_id,
          username: action.payload.username,
        };
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload; // the rejectWithValue message
      })

      // REGISTER — same pattern
      .addCase(registerUser.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token   = action.payload.access_token;
        state.user    = { id: action.payload.user_id, username: action.payload.username };
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        if (action.payload === "Session expired") {
          state.token = null;
          state.user = null;
        }
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;

// Selectors
export const selectCurrentUser  = (state) => state.auth.user;
export const selectAuthToken    = (state) => state.auth.token;
export const selectAuthLoading  = (state) => state.auth.loading;
export const selectAuthError    = (state) => state.auth.error;
export const selectIsLoggedIn   = (state) => !!state.auth.token;

export default authSlice.reducer;
