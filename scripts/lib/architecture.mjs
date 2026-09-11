import path from "node:path";
import { builtinModules } from "node:module";
import ts from "typescript";

export const sourcePattern = /^(app|components|config|core|features|hooks|lib|server|services|types)\/.*\.[cm]?[jt]sx?$/;
const envReaders = new Set(["config/env.ts", "config/runtime.ts", "config/auth.ts", "config/database.ts", "next.config.ts"]);
const nodeModules = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
const dataPackages = /^(?:pg(?:\/|$)|postgres(?:\/|$)|drizzle-orm(?:\/|$)|@better-auth\/drizzle-adapter(?:\/|$)|better-auth(?:\/api|\/plugins|\/next-js|$))/;
const nextServerPackages = /^next\/(?:headers|server|cache|og)(?:\/|$)/;

// Canonical project-layer policy. Type-only imports follow the same ownership
// rules; only runtime edges participate in browser reachability and cycles.
const allowed = {
  app: null,
  ui: ["ui", "lib", "domain-types"],
  shared: ["ui", "shared", "lib", "core", "public-config", "domain-types"],
  feature: ["feature", "feature-server", "ui", "shared", "lib", "core", "services", "hooks", "public-config", "api-types", "domain-types"],
  "feature-server": ["feature", "feature-server", "lib", "core", "server", "public-config", "private-config", "api-types", "domain-types"],
  server: ["server", "lib", "core", "public-config", "private-config", "api-types", "domain-types"],
  services: ["services", "lib", "core", "public-config", "api-types", "domain-types"],
  hooks: ["hooks", "services", "lib", "core", "public-config", "api-types", "domain-types"],
  core: ["core", "domain-types"],
  lib: ["lib", "domain-types"],
  "public-config": ["public-config", "lib", "domain-types"],
  "private-config": ["private-config", "public-config", "lib", "core", "domain-types"],
  "api-types": ["api-types", "domain-types"],
  "domain-types": ["domain-types"],
};

function layer(file, action) {
  if (file.startsWith("components/ui/")) return "ui";
  if (file.startsWith("components/shared/")) return "shared";
  if (file.startsWith("features/")) {
    return action || /^features\/[^/]+\/(?:lib\/server\/|server\.)/.test(file) ? "feature-server" : "feature";
  }
  if (file.startsWith("config/")) return file === "config/site.ts" ? "public-config" : "private-config";
  if (file.startsWith("types/api/")) return "api-types";
  if (file.startsWith("types/domain/")) return "domain-types";
  return file.split("/")[0];
}

function directive(source, text) {
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === text) return true;
  }
  return false;
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) return node.argumentExpression.text;
}

function isProcess(node) {
  return ts.isIdentifier(node) && node.text === "process"
    || (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && ts.isIdentifier(node.expression) && node.expression.text === "globalThis" && propertyName(node) === "process";
}

function readsEnvironment(node) {
  if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
    && isProcess(node.expression) && propertyName(node) === "env") return true;
  return ts.isVariableDeclaration(node) && node.initializer && isProcess(node.initializer)
    && ts.isObjectBindingPattern(node.name)
    && node.name.elements.some((element) => (element.propertyName ?? element.name).getText() === "env");
}

function isServerPackage(specifier) {
  return specifier === "server-only" || specifier.startsWith("node:")
    || nodeModules.has(specifier) || dataPackages.test(specifier) || nextServerPackages.test(specifier);
}

/** Parse imports without executing source. Accepts virtual sources for regression tests. */
export function analyzeArchitecture({ sources, rootDir, compilerOptions = {} }) {
  const options = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    baseUrl: rootDir,
    paths: { "@/*": ["./*"] },
    ...compilerOptions,
  };
  const relative = (file) => path.relative(rootDir, file).split(path.sep).join("/");
  const host = {
    fileExists: (file) => sources.has(relative(file)) || ts.sys.fileExists(file),
    readFile: (file) => sources.get(relative(file)) ?? ts.sys.readFile(file),
    directoryExists: (dir) => [...sources.keys()].some((file) => file.startsWith(`${relative(dir)}/`)) || ts.sys.directoryExists(dir),
    getCurrentDirectory: () => rootDir,
  };
  const cache = ts.createModuleResolutionCache(rootDir, (file) => file, options);
  const modules = new Map();
  const issues = [];
  const report = (file, rule, message, node) => {
    const source = modules.get(file)?.source;
    const line = source && node ? source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 : 1;
    issues.push({ file, line, rule, message });
  };

  for (const [file, code] of sources) {
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    const action = directive(source, "use server");
    const info = {
      source, action, client: directive(source, "use client"),
      layer: layer(file, action), imports: [],
      domain: /^features\/([^/]+)\//.exec(file)?.[1],
      publicEntry: /^features\/[^/]+\/[^/]+\.[cm]?[jt]sx?$/.test(file),
      serverOnly: false,
    };
    modules.set(file, info);
    for (const error of source.parseDiagnostics) {
      report(file, "syntax", ts.flattenDiagnosticMessageText(error.messageText, " "));
    }
    if (file.startsWith("components/") && !/^components\/(ui|shared)\//.test(file)) {
      report(file, "directory", "Components belong in components/ui or components/shared.");
    }

    function add(expression, typeOnly, node) {
      if (!expression || !ts.isStringLiteralLike(expression)) {
        report(file, "dynamic-import", "Use a literal module path (or an explicit map of literal imports) so dependencies can be checked.", node);
        return;
      }
      const specifier = expression.text;
      if (specifier === "server-only" && !typeOnly) info.serverOnly = true;
      // Styles/assets are validated by Next.js; this graph covers JS/TS modules.
      if (/\.(?:css|svg|png|jpe?g|webp|woff2?)$/.test(specifier)) return;
      const resolved = ts.resolveModuleName(specifier, path.join(rootDir, file), options, host, cache).resolvedModule;
      const target = resolved ? relative(resolved.resolvedFileName) : undefined;
      const local = specifier.startsWith(".") || specifier.startsWith("/")
        || Object.keys(options.paths ?? {}).some((pattern) => {
          const [prefix, suffix = ""] = pattern.split("*");
          return pattern.includes("*") ? specifier.startsWith(prefix) && specifier.endsWith(suffix) : specifier === pattern;
        });
      if (local && (!target || !sources.has(target))) {
        report(file, "unresolved-import", `Cannot resolve project module ${specifier}.`, node);
      }
      info.imports.push({ specifier, target: sources.has(target) ? target : undefined, typeOnly, node });
    }

    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        const named = clause?.namedBindings;
        const typeOnly = Boolean(clause?.isTypeOnly || !clause?.name && named && ts.isNamedImports(named)
          && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly));
        add(node.moduleSpecifier, typeOnly, node);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const named = node.exportClause;
        const typeOnly = node.isTypeOnly || named && ts.isNamedExports(named)
          && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly);
        if (info.publicEntry && (!named || ts.isNamespaceExport(named))) {
          report(file, "public-exports", "Feature entry points use explicit named exports, not export *.", node);
        }
        add(node.moduleSpecifier, Boolean(typeOnly), node);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        add(node.moduleReference.expression, node.isTypeOnly, node);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        add(node.argument.literal, true, node);
      } else if (ts.isCallExpression(node)
        && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        add(node.arguments[0], false, node);
      }
      if (!envReaders.has(file) && readsEnvironment(node)) {
        report(file, "environment", "Read environment variables only through the approved config environment readers.", node);
      }
      // Ignore comments and prose, but flag public env names in executable code.
      if ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && node.text.startsWith("NEXT_PUBLIC_")) {
        report(file, "public-environment", "A public environment variable needs an explicit reviewed browser use case.", node);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  for (const [file, info] of modules) {
    if (info.client && info.action) report(file, "directives", "A module cannot declare both use client and use server.");
    const needsMarker = info.layer === "feature-server" || info.layer === "server" && !file.startsWith("server/db/schema/");
    if (needsMarker && !info.serverOnly && !info.source.isDeclarationFile) {
      report(file, "server-marker", "Server modules must import server-only; schema files are the CLI-compatible exception.");
    }
    for (const edge of info.imports) {
      if (!envReaders.has(file) && ["process", "node:process"].includes(edge.specifier)) {
        report(file, "environment", "Import the process module only in the environment configuration boundary.", edge.node);
      }
      const target = modules.get(edge.target);
      if (target) {
        const permitted = allowed[info.layer];
        if (permitted && !permitted.includes(target.layer)) {
          report(file, "layer", `${info.layer} must not depend on ${target.layer}: ${edge.target}.`, edge.node);
        }
        if (info.layer === "feature-server" && target.layer === "feature"
          && (!info.domain || !edge.target.startsWith(`features/${info.domain}/lib/`))) {
          report(file, "layer", "Feature server logic may use its own shared lib, but must not depend on UI components or UI entries.", edge.node);
        }
        if (target.domain && info.domain !== target.domain && !target.publicEntry) {
          report(file, "feature-private", `Use a public entry of features/${target.domain}; ${edge.target} is private.`, edge.node);
        }
      } else {
        const serverCapable = ["app", "server", "feature-server", "private-config"].includes(info.layer);
        if (!serverCapable && edge.specifier !== "server-only" && isServerPackage(edge.specifier)) {
          report(file, "server-package", `${edge.specifier} belongs in server code.`, edge.node);
        }
        if (["core", "lib", "domain-types", "api-types"].includes(info.layer)
          && /^(?:react|react-dom|next)(?:\/|$)/.test(edge.specifier)) {
          report(file, "framework", `${info.layer} must not depend on ${edge.specifier}.`, edge.node);
        }
      }
    }
  }

  // Follow every runtime import/re-export, including neutral intermediary files.
  for (const [root, info] of modules) {
    const browser = info.client || info.layer === "hooks";
    const serverLogic = ["server", "feature-server"].includes(info.layer);
    const broadEntry = /^features\/[^/]+\/index\.[jt]s$/.test(root);
    if (!browser && !broadEntry && !serverLogic) continue;
    const seen = new Set();
    function walk(file, chain) {
      if (seen.has(file)) return;
      seen.add(file);
      const current = modules.get(file);
      if (serverLogic && current.client) {
        report(root, "server-client", `Server logic reaches client code: ${chain.join(" -> ")}.`);
        return;
      }
      if (browser && file !== root && current.action) return; // Next.js emits a Server Action reference.
      if (browser && (current.serverOnly || ["server", "feature-server", "private-config"].includes(current.layer))) {
        report(root, "client-server", `Browser dependency reaches server code: ${chain.join(" -> ")}.`);
        return;
      }
      if (broadEntry && file !== root && current.client && current.domain === info.domain) {
        report(root, "feature-index-client", `Move interactive entry ${file} to a focused feature entry instead of index.ts.`);
        return;
      }
      for (const edge of current.imports.filter((edge) => !edge.typeOnly)) {
        if (edge.target) walk(edge.target, [...chain, edge.target]);
        else if (browser && isServerPackage(edge.specifier)) {
          report(root, "client-server", `Browser dependency reaches ${[...chain, edge.specifier].join(" -> ")}.`);
        }
      }
    }
    walk(root, [root]);
  }

  const visited = new Set();
  const active = new Set();
  function cycles(file, chain) {
    if (visited.has(file)) return;
    active.add(file);
    for (const edge of modules.get(file).imports.filter((edge) => edge.target && !edge.typeOnly)) {
      if (active.has(edge.target)) {
        report(file, "cycle", `Runtime import cycle: ${[...chain.slice(chain.indexOf(edge.target)), edge.target].join(" -> ")}.`, edge.node);
      } else cycles(edge.target, [...chain, edge.target]);
    }
    active.delete(file);
    visited.add(file);
  }
  for (const file of modules.keys()) cycles(file, [file]);
  return issues;
}
