/**
 * Codemod: remove the `"use client"` directive from files.
 *
 * Converts:
 *   "use client";
 *
 *   import { useState } from "react";
 * to:
 *   import { useState } from "react";
 *
 * Only removes a leading directive prologue statement whose value is
 * exactly "use client" (or 'use client'); any other directives (e.g.
 * "use strict") are left untouched.
 *
 * Usage:
 *   pnpm jscodeshift -t scripts/codemods/remove-use-client.ts "src/**\/*.{ts,tsx}"
 */

import type { Transform } from "jscodeshift";

const USE_CLIENT_DIRECTIVE = "use client";

export default (function transformer(file, api, _options) {
  const j = api.jscodeshift;
  return j(file.source)
    .find(j.DirectiveLiteral, { value: USE_CLIENT_DIRECTIVE })
    .remove()
    .toSource({ quote: "double", trailingComma: true });
} satisfies Transform);
