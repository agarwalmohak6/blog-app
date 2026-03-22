// =============================================================================
// features/posts/postsApi.js — RTK Query API Service
// =============================================================================
// CONCEPT: RTK Query
//   RTK Query is a powerful data fetching + caching solution built into RTK.
//   It auto-generates React hooks from your API endpoint definitions.
//
//   Problems it solves:
//     ❌ Manual fetch + useState + useEffect (boilerplate heavy)
//     ❌ Managing loading/error states per component
//     ❌ Duplicate requests when multiple components need same data
//     ❌ Cache invalidation after mutations
//
//   RTK Query gives you:
//     ✅ Auto-generated hooks: useGetPostsQuery(), useCreatePostMutation()
//     ✅ Automatic caching with configurable TTL
//     ✅ Loading/error states out of the box
//     ✅ Cache invalidation via tags
//     ✅ Background re-fetching (stale-while-revalidate pattern)
//
//   Docs: https://redux-toolkit.js.org/rtk-query/overview
// =============================================================================

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const FASTAPI_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// =============================================================================
// createApi — The core RTK Query builder
// =============================================================================
export const postsApi = createApi({
  // reducerPath: the key this API's cache lives under in the Redux store
  reducerPath: "postsApi",

  // CONCEPT: baseQuery — how RTK Query makes HTTP requests
  // fetchBaseQuery is a thin wrapper around the browser's fetch() API
  baseQuery: fetchBaseQuery({
    baseUrl: FASTAPI_URL,

    // CONCEPT: prepareHeaders — runs before every request
    // Perfect for injecting auth tokens from the Redux store
    prepareHeaders: (headers, { getState }) => {
      // CONCEPT: Closure — getState() is a closure over the Redux store
      // It can access the current state at the moment the request is made
      const token = getState().auth?.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),

  // =============================================================================
  // CACHE TAGS
  // CONCEPT: Tags are used to invalidate cache after mutations.
  // When you create a post (mutation), you "invalidate" the "Posts" tag,
  // which causes any active useGetPostsQuery() to refetch automatically.
  // This keeps UI in sync with the server without manual cache updates.
  // Docs: https://redux-toolkit.js.org/rtk-query/usage/automated-refetching
  // =============================================================================
  tagTypes: ["Post", "Comment", "User"],

  endpoints: (builder) => ({

    // =========================================================================
    // QUERY: getPosts — GET /posts
    // =========================================================================
    // CONCEPT: builder.query — for READ operations (GET)
    // builder.mutation — for WRITE operations (POST, PUT, PATCH, DELETE)
    // =========================================================================
    getPosts: builder.query({
      query: ({
        page = 1,
        limit = 10,
        search = "",
        category = "",
        tag = "",
        author = "",
        status = "published",
      } = {}) => {
        const params = new URLSearchParams({
          page, limit,
          status,
          ...(search && { search }),
          ...(category && { category }),
          ...(tag && { tag }),
          ...(author && { author }),
        });
        return `/posts?${params}`;
      },

      // providesTags: this query's result is tagged as "Post"
      // When "Post" is invalidated, this query refetches
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map(({ id }) => ({ type: "Post", id })), // per-item tags
              { type: "Post", id: "LIST" },                            // list-level tag
            ]
          : [{ type: "Post", id: "LIST" }],

      // keepUnusedDataFor: how many seconds to keep cache after component unmounts
      // Default is 60 seconds — good for pagination (don't refetch going back)
      keepUnusedDataFor: 60,
    }),

    // =========================================================================
    // QUERY: getPost — GET /posts/:id
    // =========================================================================
    getPost: builder.query({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: "Post", id }],
    }),

    getPostBySlug: builder.query({
      query: (slug) => `/posts/slug/${slug}`,
      providesTags: (result) =>
        result ? [{ type: "Post", id: result.id }] : [{ type: "Post", id: "SLUG" }],
    }),

    // =========================================================================
    // QUERY: getComments — GET /posts/:id/comments (JSONPlaceholder fallback)
    // =========================================================================
    getComments: builder.query({
      query: (postId) => `/posts/${postId}/comments`,
      providesTags: (result, error, postId) => [{ type: "Comment", id: postId }],
    }),

    getMyPosts: builder.query({
      query: ({ page = 1, limit = 20, status = "all" } = {}) =>
        `/posts/dashboard/me?page=${page}&limit=${limit}&status=${status}`,
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map(({ id }) => ({ type: "Post", id })),
              { type: "Post", id: "DASHBOARD" },
            ]
          : [{ type: "Post", id: "DASHBOARD" }],
    }),

    getAuthorProfile: builder.query({
      query: (username) => `/posts/authors/${username}`,
      providesTags: (result, error, username) => [{ type: "User", id: username }],
    }),

    getArchiveSummary: builder.query({
      query: () => "/posts/archives/summary",
    }),

    getTagsSummary: builder.query({
      query: () => "/posts/tags/summary",
    }),

    // =========================================================================
    // MUTATION: createPost — POST /posts
    // =========================================================================
    createPost: builder.mutation({
      query: (newPost) => ({
        url: "/posts",
        method: "POST",
        body: newPost,
      }),
      // invalidatesTags: after this mutation succeeds, invalidate the list
      // → causes all active getPosts queries to refetch automatically
      invalidatesTags: [{ type: "Post", id: "LIST" }],
    }),

    updatePost: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Post", id },
        { type: "Post", id: "LIST" },
        { type: "Post", id: "DASHBOARD" },
      ],
    }),

    // =========================================================================
    // MUTATION: createComment — POST /posts/:id/comments
    // =========================================================================
    createComment: builder.mutation({
      query: ({ postId, body }) => ({
        url: `/posts/${postId}/comments`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: "Comment", id: postId }
      ],
    }),

    // =========================================================================
    // MUTATION: deletePost — DELETE /posts/:id
    // =========================================================================
    deletePost: builder.mutation({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Post", id },
        { type: "Post", id: "LIST" },
        { type: "Post", id: "DASHBOARD" },
      ],
    }),
  }),
});

// =============================================================================
// EXPORT AUTO-GENERATED HOOKS
// CONCEPT: RTK Query generates these hooks from your endpoint definitions.
// The naming convention is: use{EndpointName}Query / use{EndpointName}Mutation
// =============================================================================
export const {
  useGetPostsQuery,
  useGetPostQuery,
  useGetPostBySlugQuery,
  useGetCommentsQuery,
  useGetMyPostsQuery,
  useGetAuthorProfileQuery,
  useGetArchiveSummaryQuery,
  useGetTagsSummaryQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useCreateCommentMutation,
  useDeletePostMutation,
} = postsApi;
