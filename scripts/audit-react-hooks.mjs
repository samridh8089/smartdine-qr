import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HOOK_REGEX = /^use[A-Z]/;

function isHook(name) {
  return HOOK_REGEX.test(name);
}

function getCalleeName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  return null;
}

function findHooksInNode(node, sf) {
  const hooks = [];
  function walk(n) {
    // Stop at nested function boundaries (callbacks, helpers inside component)
    if (n !== node && (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n))) {
      return;
    }
    if (ts.isCallExpression(n)) {
      const name = getCalleeName(n.expression);
      if (name && isHook(name)) {
        const { line, character } = sf.getLineAndCharacterOfPosition(n.getStart(sf));
        hooks.push({ name, line: line + 1, col: character + 1 });
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return hooks;
}

function hasReturnStatement(node) {
  let found = false;
  function walk(n) {
    if (found) return;
    if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
      return; // Do not inspect returns inside nested functions
    }
    if (ts.isReturnStatement(n)) {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return found;
}

export function auditFile(filePath, code) {
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const violations = [];

  function checkFunction(funcNode) {
    const body = funcNode.body;
    if (!body || !ts.isBlock(body)) return;

    let earlyReturnLoc = null;

    for (const stmt of body.statements) {
      // Check if this statement is an early return or conditional return
      if (ts.isIfStatement(stmt)) {
        if (hasReturnStatement(stmt.thenStatement) || (stmt.elseStatement && hasReturnStatement(stmt.elseStatement))) {
          if (!earlyReturnLoc) {
            const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart(sf));
            earlyReturnLoc = line + 1;
          }
        }
        // Also: calling a hook directly inside an if-branch is a violation
        const hooksInIf = findHooksInNode(stmt, sf);
        for (const h of hooksInIf) {
          violations.push({
            filePath,
            hook: h.name,
            line: h.line,
            col: h.col,
            reason: `Hook "${h.name}" called conditionally inside an if statement.`
          });
        }
      } else if (ts.isReturnStatement(stmt)) {
        if (!earlyReturnLoc) {
          const { line } = sf.getLineAndCharacterOfPosition(stmt.getStart(sf));
          earlyReturnLoc = line + 1;
        }
      }

      if (earlyReturnLoc) {
        const hooks = findHooksInNode(stmt, sf);
        for (const h of hooks) {
          if (h.line > earlyReturnLoc) {
            violations.push({
              filePath,
              hook: h.name,
              line: h.line,
              col: h.col,
              reason: `Hook "${h.name}" declared after early return at line ${earlyReturnLoc}.`
            });
          }
        }
      }
    }
  }

  function visit(node) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      checkFunction(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return violations;
}

export function getTargetFiles() {
  const args = process.argv.slice(2);
  const explicitFiles = args.filter(a => !a.startsWith('--'));
  const isStagedOnly = args.includes('--staged');
  const isAll = args.includes('--all');

  if (explicitFiles.length > 0) {
    return explicitFiles.filter(f => fs.existsSync(f));
  }

  if (isAll) {
    const all = [];
    function walkDir(dir) {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir)) {
        const p = path.join(dir, item);
        if (fs.statSync(p).isDirectory()) {
          if (item !== 'node_modules' && item !== '.next') walkDir(p);
        } else if (p.endsWith('.tsx') || p.endsWith('.jsx')) {
          all.push(p);
        }
      }
    }
    walkDir('src');
    return all;
  }

  const gitBin = fs.existsSync('C:\\Program Files\\Git\\cmd\\git.exe') ? '"C:\\Program Files\\Git\\cmd\\git.exe"' : 'git';

  if (isStagedOnly) {
    try {
      const out = execSync(`${gitBin} diff --cached --name-only --diff-filter=ACMR`, { encoding: 'utf8' });
      return out.split('\n').map(s => s.trim()).filter(f => (f.endsWith('.tsx') || f.endsWith('.jsx')) && fs.existsSync(f));
    } catch {
      return [];
    }
  }

  // Default: check staged files first, then unstaged modified files, then default core files
  try {
    const staged = execSync(`${gitBin} diff --cached --name-only --diff-filter=ACMR`, { encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(f => (f.endsWith('.tsx') || f.endsWith('.jsx')) && fs.existsSync(f));
    if (staged.length > 0) return staged;

    const modified = execSync(`${gitBin} diff --name-only --diff-filter=ACMR`, { encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(f => (f.endsWith('.tsx') || f.endsWith('.jsx')) && fs.existsSync(f));
    if (modified.length > 0) return modified;
  } catch {}

  const defaultFile = 'src/app/(dashboard)/dashboard/orders/page.tsx';
  return fs.existsSync(defaultFile) ? [defaultFile] : [];
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('audit-react-hooks.mjs')) {
  const targetFiles = getTargetFiles();
  if (targetFiles.length === 0) {
    console.log('[PASS] React Hook Safety Audit: No modified React files to audit.');
    console.log('> React Hook Safety Audit: PASS');
    process.exit(0);
  }

  console.log(`[CleverOps Guardrail] Auditing ${targetFiles.length} React file(s) for Hook Safety...`);
  let totalViolations = [];

  for (const file of targetFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const violations = auditFile(file, code);
    if (violations.length > 0) {
      totalViolations.push(...violations);
    }
  }

  if (totalViolations.length > 0) {
    console.error('\n❌ [FAIL] React Hook Safety Rule Violations Detected:');
    for (const v of totalViolations) {
      console.error(`  - ${v.filePath}:${v.line}:${v.col} -> ${v.reason}`);
    }
    console.error('\nRules:');
    console.error('  1. All React hooks (useState, useRef, useMemo, useCallback, useEffect) MUST be declared above any early return.');
    console.error('  2. Never declare or call hooks conditionally or below an if/return statement.');
    console.error('  3. Run "npm run audit:hooks" before committing.\n');
    process.exit(1);
  } else {
    console.log(`[PASS] React Hook Safety Audit: 0 violations found across ${targetFiles.length} file(s).`);
    console.log('> React Hook Safety Audit: PASS\n');
    process.exit(0);
  }
}
