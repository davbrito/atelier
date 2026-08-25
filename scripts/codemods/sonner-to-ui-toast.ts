/**
 * Codemod: migrate `sonner` toast usage to the local ui toast component.
 *
 * Converts:
 *   import { toast } from "sonner";
 * to:
 *   import { toast } from "#/components/ui/toast.tsx";
 *
 * And:
 *   toast.success(message)
 *   toast.error(message)
 *   toast.info(message)
 *   toast.warning(message)
 *   ...
 * to:
 *   toast.add({ type: "success", description: message })
 *   toast.add({ type: "error", description: message })
 *   toast.add({ type: "info", description: message })
 *   toast.add({ type: "warning", description: message })
 *   ...
 *
 * When the call already has an options object with its own `description`
 * (e.g. toast.error(message, { description })), the message argument is kept
 * as `title` instead of being dropped:
 *   toast.error(message, { description })
 * to:
 *   toast.add({ type: "error", title: message, description })
 *
 * Usage:
 *   pnpm jscodeshift -t scripts/codemods/sonner-to-ui-toast.ts "src/**\/*.{ts,tsx}"
 */

import type { API, FileInfo, ObjectExpression, Options } from "jscodeshift";

type ObjectExpressionProperty = ObjectExpression["properties"][number];

const SONNER_SOURCE = "sonner";
const UI_TOAST_SOURCE = "#/components/ui/toast.tsx";

export default function transformer(file: FileInfo, api: API, _options?: Options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  let mutated = false;

  // Only touch files that actually import `toast` from "sonner".
  const sonnerImports = root.find(j.ImportDeclaration, {
    source: { value: SONNER_SOURCE },
  });

  if (sonnerImports.size() === 0) {
    return file.source;
  }

  let toastLocalName: string | null = null;

  sonnerImports.forEach((path) => {
    let hadToastSpecifier = false;

    const specifiers = (path.node.specifiers ?? []).filter((spec) => {
      if (j.ImportSpecifier.check(spec) && spec.imported.name === "toast") {
        toastLocalName = j.Identifier.check(spec.local) ? spec.local.name : spec.imported.name;
        hadToastSpecifier = true;
        return false;
      }
      return true;
    });

    if (!hadToastSpecifier) {
      return;
    }

    if (specifiers.length === 0) {
      // Whole import declaration only imported `toast` — swap its source.
      path.node.source = j.literal(UI_TOAST_SOURCE);
    } else {
      // Other named imports remain from "sonner"; add a separate import for toast.
      path.node.specifiers = specifiers;
      j(path).insertAfter(
        j.importDeclaration([j.importSpecifier(j.identifier("toast"))], j.literal(UI_TOAST_SOURCE)),
      );
    }
    mutated = true;
  });

  if (!toastLocalName) {
    return mutated ? root.toSource({ quote: "double", trailingComma: true }) : file.source;
  }

  // toast.<method>(args) -> toast.add({ type: "<method>", message: args[0] })
  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        object: { type: "Identifier", name: toastLocalName },
        property: { type: "Identifier" },
        computed: false,
      },
    })
    .forEach((path) => {
      const callee = path.node.callee;
      if (!j.MemberExpression.check(callee) || !j.Identifier.check(callee.property)) {
        return;
      }
      const method = callee.property.name;

      if (method === "add") {
        return;
      }

      const args = path.node.arguments;
      if (args.length === 0) {
        return;
      }

      const [messageArg, ...restArgs] = args;
      if (j.SpreadElement.check(messageArg)) {
        return;
      }
      const optionsArg =
        restArgs.length > 0 && j.ObjectExpression.check(restArgs[0]) ? restArgs[0] : null;

      const optionsHasDescription = optionsArg
        ? optionsArg.properties.some(
            (prop) =>
              j.ObjectProperty.check(prop) &&
              j.Identifier.check(prop.key) &&
              prop.key.name === "description",
          )
        : false;

      const properties: ObjectExpressionProperty[] = [
        j.objectProperty(j.identifier("type"), j.literal(method)),
      ];

      // If the options object already carries its own `description`, the message
      // argument becomes the `title` instead of being dropped.
      properties.push(
        j.objectProperty(j.identifier(optionsHasDescription ? "title" : "description"), messageArg),
      );

      // Preserve a second options-object argument (e.g. toast.error(msg, { description })).
      // Any keys it defines (e.g. its own `description`) replace our default so we never
      // emit a duplicate property.
      if (optionsArg) {
        for (const prop of optionsArg.properties) {
          const key =
            j.ObjectProperty.check(prop) && j.Identifier.check(prop.key) ? prop.key.name : null;
          const existingIndex = key
            ? properties.findIndex(
                (p) => j.ObjectProperty.check(p) && j.Identifier.check(p.key) && p.key.name === key,
              )
            : -1;

          if (existingIndex !== -1) {
            properties[existingIndex] = prop;
          } else {
            properties.push(prop);
          }
        }
      }

      callee.property = j.identifier("add");
      path.node.arguments = [j.objectExpression(properties)];
      mutated = true;
    });

  return mutated ? root.toSource({ quote: "double", trailingComma: true }) : file.source;
}
