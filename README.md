# Blog App — React 18 + FastAPI Publishing Platform

A full-stack blog application built with React 18, FastAPI, and PostgreSQL.
It now includes:

- authentication
- post creation and editing
- draft and published states
- author dashboard
- slug-based post URLs
- tags and archive pages
- RSS feed support

The codebase is still heavily commented as a learning reference, but the app now behaves much more like a real publishing platform.

---

## Quick Start

### 1. Start PostgreSQL

The easiest option is Docker:

```bash
docker-compose up -d db
```

### 2. Create backend env file

Create [backend/.env](/Users/apple/Documents/blog-app/backend/.env) with:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/blogapp
SECRET_KEY=replace-this-with-a-long-random-secret
```

Generate a strong secret with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Create frontend env file

Create [frontend/.env](/Users/apple/Documents/blog-app/frontend/.env) with:

```env
VITE_API_URL=http://localhost:8000
```

### 4. Run the backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open:

- [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- [http://localhost:5173](http://localhost:5173)

### 6. Test the main flows

After both servers are running:

1. Register a user
2. Create a post
3. Save another post as draft
4. Open Dashboard
5. Edit a post
6. Open a post by slug
7. Open Archives
8. Open a tag page
9. Open an author profile page

---

## Deployment

### Minimum things you need for production

- a PostgreSQL database
- backend environment variables
- frontend environment variable pointing to the backend URL
- a place to host the frontend
- a place to host the backend
- a domain and HTTPS

### Recommended production stack

- Frontend: Vercel or Netlify
- Backend: Render, Railway, Fly.io, or a VPS
- Database: Neon, Supabase Postgres, Railway Postgres, or managed Postgres
- Media storage: Cloudinary, S3, or Supabase Storage
- Email: Resend, SendGrid, Mailgun, or SES

### Backend production env

At minimum:

```env
DATABASE_URL=your-production-postgres-url
SECRET_KEY=your-long-random-secret
```

### Frontend production env

```env
VITE_API_URL=https://your-api-domain.com
```

### Build commands

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Important production upgrades still recommended

- move schema changes to Alembic migrations
- add password reset
- add email verification
- replace image URLs with real uploads
- add monitoring and backups

---

## 🗂 Project Structure

```
blog-app/
├── backend/                   # FastAPI + PostgreSQL
│   ├── main.py                # App entry point, CORS, lifespan
│   ├── database.py            # Async SQLAlchemy engine + session
│   ├── models.py              # ORM models (DB tables as Python classes)
│   ├── schemas.py             # Pydantic schemas (request/response validation)
│   ├── auth.py                # JWT auth, password hashing
│   ├── tasks.py               # Background tasks (email notifications)
│   ├── requirements.txt
│   └── routers/
│       ├── auth.py            # POST /auth/login, /register, GET /auth/me
│       ├── posts.py           # CRUD for posts + pagination + search
│       └── comments.py        # Comments + background task trigger
│
└── frontend/                  # React 18 + Vite
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx           # createRoot, StrictMode
        ├── App.jsx            # Router, lazy routes, layout, protected routes
        ├── styles.css         # CSS variables, dark/light theming
        ├── app/
        │   └── store.js       # Redux configureStore
        ├── features/
        │   ├── posts/
        │   │   └── postsApi.js        # RTK Query — createApi, endpoints, tags
        │   ├── bookmarks/
        │   │   └── bookmarksSlice.js  # createSlice + createSelector
        │   ├── theme/
        │   │   └── themeSlice.js      # Dark/light mode slice
        │   └── auth/
        │       └── authSlice.js       # createAsyncThunk, login/register
        ├── store/
        │   └── zustandStore.js        # Zustand comparison store
        ├── hooks/
        │   └── index.js               # useDebounce, useIntersectionObserver,
        │                              #   useFetch, useLocalStorage, useThrottle
        ├── pages/
        │   ├── Home.jsx               # useTransition, useDeferredValue, useId
        │   ├── PostDetail.jsx         # useOptimistic, optimistic comments
        │   ├── Login.jsx              # Controlled forms, async thunks
        │   └── Bookmarks.jsx          # Memoized selectors, RTK cache hit
        └── components/
            ├── PostCard.jsx           # React.memo, useCallback, event bubbling
            └── index.jsx              # SearchBar, CommentSection, Navbar, ThemeToggle
```

---

## 🚀 Legacy Setup Notes

### Backend

```bash
cd backend

# 1. Create & activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set environment variables (create .env file)
echo "DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/blogapp" > .env
echo "SECRET_KEY=your-super-secret-key-here" >> .env

# 4. Make sure PostgreSQL is running, then:
uvicorn main:app --reload --port 8000

# 5. Visit http://localhost:8000/docs — interactive Swagger UI
```

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# 3. Start dev server
npm run dev

# 4. Visit http://localhost:5173
```

> Note: the app is now designed around the FastAPI backend. Run both frontend and backend for the full experience.

---

## 📚 Concepts Reference — Beginner to Advanced

### BEGINNER

---

#### ✅ React Controlled Inputs
Inputs where React state is the single source of truth.
- **File:** `src/pages/Login.jsx` — `handleChange`, `formData` state
- **Docs:** https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable

---

#### ✅ useState
Basic state management in function components.
- **File:** `src/pages/Home.jsx` — `searchInput`, `selectedCategory`, `page`
- **Docs:** https://react.dev/reference/react/useState

---

#### ✅ useEffect + Cleanup
Run side effects after render; cleanup prevents memory leaks.
- **File:** `src/hooks/index.js` — `useDebounce` (clears setTimeout on re-run)
- **File:** `src/hooks/index.js` — `useFetch` (aborts fetch on unmount)
- **Docs:** https://react.dev/reference/react/useEffect

---

#### ✅ Props & Component Composition
Passing data from parent to child components.
- **File:** `src/components/index.jsx` — `SearchBar` receives `value`, `onChange`
- **Docs:** https://react.dev/learn/passing-props-to-a-component

---

#### ✅ Conditional Rendering
Render different UI based on state/props.
- **File:** `src/pages/PostDetail.jsx` — login check before showing comment form
- **File:** `src/App.jsx` — `ProtectedRoute` redirects if not logged in
- **Docs:** https://react.dev/learn/conditional-rendering

---

#### ✅ Array Rendering + Keys
Render lists of items; keys help React identify changes.
- **File:** `src/components/index.jsx` — `CommentSection` maps comments
- **Docs:** https://react.dev/learn/rendering-lists

---

### INTERMEDIATE

---

#### ✅ useRef
Persist values across renders without causing re-renders; access DOM elements.
- **File:** `src/pages/PostDetail.jsx` — `textareaRef` to focus after comment submit
- **File:** `src/hooks/index.js` — `useThrottle` uses ref to track last update time
- **Docs:** https://react.dev/reference/react/useRef

---

#### ✅ useCallback
Memoize functions to maintain stable references across renders.
- **File:** `src/components/PostCard.jsx` — `handleBookmark`, `handleCardClick`
- **When to use:** when passing functions as props to `memo`'d children, or in `useEffect` deps
- **Docs:** https://react.dev/reference/react/useCallback

---

#### ✅ useMemo
Memoize expensive computations; only recompute when dependencies change.
- **File:** `src/pages/Home.jsx` — `postsWithRecentFlag` (merges posts + recent IDs)
- **File:** `src/pages/Bookmarks.jsx` — `reversedIds`
- **When to use:** expensive calculations, or needing referential equality for child props
- **Docs:** https://react.dev/reference/react/useMemo

---

#### ✅ React.memo
Prevent a component from re-rendering if its props haven't changed (shallow compare).
- **File:** `src/components/PostCard.jsx` — `const PostCard = memo(function PostCard(...))`
- **Docs:** https://react.dev/reference/react/memo

---

#### ✅ forwardRef
Forward a ref from a parent into a child component's DOM element.
- **File:** `src/components/index.jsx` — `SearchBar` wraps its input with `forwardRef`
- **Docs:** https://react.dev/reference/react/forwardRef

---

#### ✅ Custom Hooks
Extract and reuse stateful logic across components.
- **File:** `src/hooks/index.js`
  - `useDebounce(value, delay)` — debounce any value
  - `useIntersectionObserver(options)` — infinite scroll sentinel
  - `useLocalStorage(key, initialValue)` — persistent state
  - `useFetch(url)` — fetch with AbortController
  - `useThrottle(value, interval)` — throttle any value
- **Docs:** https://react.dev/learn/reusing-logic-with-custom-hooks

---

#### ✅ Redux Toolkit — createSlice
Combines initial state + reducers + action creators in one place. Uses Immer for safe "mutations".
- **File:** `src/features/bookmarks/bookmarksSlice.js`
- **File:** `src/features/auth/authSlice.js`
- **Docs:** https://redux-toolkit.js.org/api/createSlice
- **Immer:** https://immerjs.github.io/immer/

---

#### ✅ Redux Toolkit — createAsyncThunk
Handle async operations (API calls) with auto-generated pending/fulfilled/rejected actions.
- **File:** `src/features/auth/authSlice.js` — `loginUser`, `registerUser`
- **Pattern:** dispatch → pending → fulfilled/rejected → update state in extraReducers
- **Docs:** https://redux-toolkit.js.org/api/createAsyncThunk

---

#### ✅ React Router v6 — Basics
Declarative routing; `<Routes>`, `<Route>`, `<Link>`, `<NavLink>`, `useParams`, `useNavigate`.
- **File:** `src/App.jsx`
- **File:** `src/pages/PostDetail.jsx` — `useParams`
- **File:** `src/pages/Login.jsx` — `useNavigate`, `<Navigate>`
- **Docs:** https://reactrouter.com/en/main/start/overview

---

#### ✅ Closures & Lexical Scope
Functions that capture variables from their surrounding scope.
- **File:** `src/pages/Login.jsx` — `handleSubmit` closes over `formData` and `mode`
- **File:** `src/features/posts/postsApi.js` — `prepareHeaders` closes over `getState`
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures

---

#### ✅ Async / Await + Promises
Modern syntax for asynchronous code; avoids callback hell.
- **File:** `src/hooks/index.js` — `useFetch`
- **File:** `src/features/auth/authSlice.js` — `loginUser` thunk
- **Docs:** https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises

---

#### ✅ Debounce
Delay execution until a quiet period after the last call. Prevents excessive API calls.
- **File:** `src/hooks/index.js` — `useDebounce`
- **Usage:** `src/pages/Home.jsx` — search input
- **Docs:** https://developer.mozilla.org/en-US/docs/Glossary/Debounce

---

#### ✅ Throttle
Limit execution to at most once per time window. Good for scroll/resize events.
- **File:** `src/hooks/index.js` — `useThrottle`
- **Docs:** https://css-tricks.com/the-difference-between-throttling-and-debouncing/

---

### ADVANCED

---

#### ✅ useTransition
Mark state updates as "non-urgent" so React can keep UI responsive during heavy re-renders.
- **File:** `src/pages/Home.jsx` — wraps search/category/page updates
- **File:** `src/pages/PostDetail.jsx` — wraps optimistic comment + mutation
- **Key insight:** `isPending` is true while the transition is running → show subtle loader
- **Docs:** https://react.dev/reference/react/useTransition

---

#### ✅ useDeferredValue
Defer re-rendering a value at lower priority. Keeps current content visible while new content loads.
- **File:** `src/pages/Home.jsx` — `deferredSearch = useDeferredValue(searchInput)`
- **vs useTransition:** use `useDeferredValue` when you receive a value (can't wrap the setter)
- **Docs:** https://react.dev/reference/react/useDeferredValue

---

#### ✅ useId
Generate stable unique IDs safe for SSR (server-side rendering). Use for `htmlFor`/`id` pairs.
- **File:** `src/pages/Home.jsx` — `searchId`, `categoryId`
- **File:** `src/pages/Login.jsx` — `emailId`, `passwordId`
- **Why not Math.random():** breaks SSR hydration (server and client generate different IDs)
- **Docs:** https://react.dev/reference/react/useId

---

#### ✅ useOptimistic
Show an optimistic (assumed-success) UI update immediately, roll back on failure.
- **File:** `src/pages/PostDetail.jsx` — comment appears instantly before server confirms
- **Pattern:** `addOptimisticComment` → `createComment` mutation → auto-replaced or rolled back
- **Docs:** https://react.dev/reference/react/useOptimistic

---

#### ✅ RTK Query — createApi
Data fetching layer with automatic caching, cache invalidation, and generated hooks.
- **File:** `src/features/posts/postsApi.js`
- **Key concepts:**
  - `builder.query` — for GET (reads)
  - `builder.mutation` — for POST/PATCH/DELETE (writes)
  - `providesTags` / `invalidatesTags` — cache invalidation
  - `keepUnusedDataFor` — cache TTL
- **Docs:** https://redux-toolkit.js.org/rtk-query/overview

---

#### ✅ Memoized Selectors — createSelector (Reselect)
Derive computed values from Redux state; only recompute when inputs change.
- **File:** `src/features/bookmarks/bookmarksSlice.js` — `selectBookmarkCount`, `selectIsBookmarked`
- **Docs:** https://reselect.js.org/
- **Built into RTK:** https://redux-toolkit.js.org/api/createSelector

---

#### ✅ Zustand
Minimal state management library. Compare with Redux for simpler use cases.
- **File:** `src/store/zustandStore.js`
- **vs Redux:** no Provider, no dispatch, no action creators — just call functions
- `useRecentlyViewedStore` — recently viewed posts with `persist` middleware
- `useUIStore` — transient UI state (modals, toasts)
- **Docs:** https://docs.pmnd.rs/zustand/getting-started/introduction

---

#### ✅ AbortController
Cancel in-flight fetch requests to prevent memory leaks and stale state.
- **File:** `src/hooks/index.js` — `useFetch` creates controller per effect, aborts on cleanup
- **Why it matters:** Without abort, an unmounted component's fetch could call `setState` → error
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/API/AbortController

---

#### ✅ IntersectionObserver
Browser API to detect when elements enter/exit the viewport. Powers infinite scroll.
- **File:** `src/hooks/index.js` — `useIntersectionObserver`
- **Usage:** `src/pages/Home.jsx` — sentinel div at bottom triggers next page load
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver

---

#### ✅ Code Splitting — React.lazy + Suspense
Split JS bundle into per-route chunks; load on demand. Reduces initial page load.
- **File:** `src/App.jsx` — `lazy(() => import("./pages/Home"))`
- **Docs:** https://react.dev/reference/react/lazy

---

#### ✅ React Router v6 — Layout Routes + Outlet
Share layout (Navbar, footer) across routes without repeating it in every page.
- **File:** `src/App.jsx` — `RootLayout` with `<Outlet />`
- **Docs:** https://reactrouter.com/en/main/components/outlet

---

#### ✅ Event Delegation
Attach one listener to a parent instead of many listeners to each child. React uses this internally.
- **File:** `src/components/PostCard.jsx` — explained in comment; clickable div with keyboard support
- **Docs:** https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Event_bubbling

---

### BACKEND (FastAPI + Python)

---

#### ✅ Async SQLAlchemy
Non-blocking database queries. Lets FastAPI handle many concurrent requests.
- **File:** `backend/database.py` — `create_async_engine`, `AsyncSession`
- **Docs:** https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

---

#### ✅ ORM (Object Relational Mapping)
Python classes = database tables. SQLAlchemy generates SQL for you.
- **File:** `backend/models.py`
- **Docs:** https://docs.sqlalchemy.org/en/20/orm/

---

#### ✅ Pydantic v2 — Request/Response Validation
Automatic type validation, serialization, and documentation.
- **File:** `backend/schemas.py`
- **Key features:** `field_validator`, `model_dump(exclude_unset=True)`, `from_attributes`
- **Docs:** https://docs.pydantic.dev/latest/

---

#### ✅ JWT Authentication
Stateless auth via signed tokens. No session storage needed.
- **File:** `backend/auth.py`
- **Flow:** login → sign JWT → client stores token → sends in `Authorization: Bearer` header → server verifies signature
- **JWT spec:** https://jwt.io/introduction
- **FastAPI docs:** https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/

---

#### ✅ Dependency Injection
FastAPI resolves and injects dependencies (`get_db`, `get_current_user`) automatically.
- **File:** `backend/auth.py`, `backend/routers/posts.py`
- **Docs:** https://fastapi.tiangolo.com/tutorial/dependencies/

---

#### ✅ Background Tasks
Run slow operations (email, analytics) after the HTTP response is sent.
- **File:** `backend/tasks.py`, `backend/routers/comments.py`
- **Docs:** https://fastapi.tiangolo.com/tutorial/background-tasks/

---

#### ✅ CORS Middleware
Allow cross-origin requests from the React dev server.
- **File:** `backend/main.py`
- **Docs:** https://fastapi.tiangolo.com/tutorial/cors/

---

#### ✅ Pagination
Load data in chunks. `OFFSET + LIMIT` SQL pattern.
- **File:** `backend/routers/posts.py` — `GET /posts?page=1&limit=10`
- **Docs:** https://docs.sqlalchemy.org/en/20/orm/query.html#sqlalchemy.orm.Query.offset

---

## 🧠 JavaScript Quick Reference

| Concept | Example | File |
|---|---|---|
| Optional chaining | `post.author?.username` | PostDetail.jsx |
| Nullish coalescing | `stored ?? []` | bookmarksSlice.js |
| Spread operator | `{ ...prev, [name]: value }` | Login.jsx |
| Computed property | `{ [name]: value }` | Login.jsx |
| Array destructuring | `const [ref, isVisible] = useIntersectionObserver()` | hooks/index.js |
| Short-circuit eval | `isLoggedIn && <Component />` | Navbar |
| Ternary operator | `isDark ? "☀️" : "🌙"` | ThemeToggle |
| Rest/spread props | `{...rest}` on input | SearchBar |
| Array.map | posts.map(post => `<PostCard />`) | Home.jsx |
| Array.filter | `ids.filter(id => id !== postId)` | zustandStore.js |
| Set for O(1) lookup | `new Set(recentIds).has(id)` | Home.jsx |

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | React 18 | Concurrent features (useTransition, useDeferredValue) |
| Build tool | Vite | Instant HMR, fast builds |
| Global state | Redux Toolkit | Structured, scalable, great devtools |
| Data fetching | RTK Query | Caching, invalidation, generated hooks |
| UI state | Zustand | Simple, no boilerplate |
| Routing | React Router v6 | Layout routes, lazy loading, loaders |
| Backend | FastAPI | Async Python, auto-docs, Pydantic |
| Database | PostgreSQL | Production-grade relational DB |
| ORM | SQLAlchemy (async) | Type-safe DB access |
| Auth | JWT + bcrypt | Stateless, secure |
| API (fallback) | JSONPlaceholder | Free dummy REST API |

---

## 📖 Further Reading

- React 18 What's New: https://react.dev/blog/2022/03/29/react-v18
- Redux Toolkit Guide: https://redux-toolkit.js.org/introduction/getting-started
- RTK Query Guide: https://redux-toolkit.js.org/rtk-query/overview
- FastAPI Full Guide: https://fastapi.tiangolo.com/
- Zustand Docs: https://docs.pmnd.rs/zustand/getting-started/introduction
- React Router v6: https://reactrouter.com/en/main/start/tutorial
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- JWT.io (decoder + explainer): https://jwt.io/
- MDN Web Docs (JS fundamentals): https://developer.mozilla.org/en-US/docs/Web/JavaScript
