/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as assignments from "../assignments.js";
import type * as courses from "../courses.js";
import type * as emails from "../emails.js";
import type * as enrollments from "../enrollments.js";
import type * as files from "../files.js";
import type * as grades from "../grades.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as reports from "../reports.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  assignments: typeof assignments;
  courses: typeof courses;
  emails: typeof emails;
  enrollments: typeof enrollments;
  files: typeof files;
  grades: typeof grades;
  "lib/auth": typeof lib_auth;
  "lib/rbac": typeof lib_rbac;
  reports: typeof reports;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
