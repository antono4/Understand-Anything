import type { Language, SourceLocation, FunctionDef, ClassDef, ImportInfo, Parameter } from '../types/index.js';
import type { Tree, SyntaxNode } from 'web-tree-sitter';

// Language to file extensions mapping
export const LANGUAGE_EXTENSIONS: Record<Language, string[]> = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  python: ['.py', '.pyw'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hh', '.hxx', '.h++'],
  csharp: ['.cs'],
  php: ['.php'],
  ruby: ['.rb'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
  markdown: ['.md', '.mdx'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less']
};

// Language to tree-sitter grammar mapping
export const TREE_SITTER_LANGUAGES: Partial<Record<Language, string>> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  go: 'go',
  rust: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'c_sharp',
  php: 'php',
  ruby: 'ruby',
  json: 'json',
  yaml: 'yaml',
  html: 'html',
  css: 'css'
};

export interface ParserContext {
  filePath: string;
  content: string;
  tree: Tree;
  language: Language;
}

export interface ParseResult {
  functions: FunctionDef[];
  classes: ClassDef[];
  imports: ImportInfo[];
  exports: string[];
}

// Extract function name from syntax node
function getFunctionName(node: SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name') || 
                   node.childForFieldName('identifier');
  return nameNode?.text || null;
}

// Extract parameters from function declaration
function extractParameters(funcNode: SyntaxNode, content: string): Parameter[] {
  const params: Parameter[] = [];
  const paramsNode = funcNode.childForFieldName('parameters') ||
                     funcNode.childForFieldName('parameters');
  
  if (!paramsNode) return params;

  paramsNode.children.forEach(child => {
    if (child.type.includes('parameter') || child.type === 'identifier') {
      const name = child.text;
      const typeNode = child.nextNamedSibling;
      params.push({
        name,
        type: typeNode?.text || 'any',
        optional: child.text.includes('?') || child.type.includes('optional')
      });
    }
  });

  return params;
}

// Extract return type
function extractReturnType(node: SyntaxNode): string | undefined {
  const typeNode = node.childForFieldName('type') ||
                   node.child(node.childCount - 1);
  if (typeNode && typeNode.type !== ')') {
    return typeNode.text;
  }
  return undefined;
}

// Detect if function is async
function isAsync(node: SyntaxNode): boolean {
  return node.children.some(child => child.type === 'async');
}

// Detect if function is generator
function isGenerator(node: SyntaxNode): boolean {
  return node.children.some(child => child.type === '*');
}

// Get call targets from function body
function getCallTargets(node: SyntaxNode, content: string): string[] {
  const calls: string[] = [];
  
  function traverse(n: SyntaxNode) {
    if (n.type === 'call_expression') {
      const funcNode = n.childForFieldName('function');
      if (funcNode) {
        calls.push(funcNode.text);
      }
    }
    n.children.forEach(traverse);
  }
  
  traverse(node);
  return [...new Set(calls)];
}

// JavaScript/TypeScript parser
export function parseJavaScript(ctx: ParserContext): ParseResult {
  const { tree, content } = ctx;
  const functions: FunctionDef[] = [];
  const classes: ClassDef[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];

  const root = tree.rootNode;

  // Find all function declarations
  function findFunctions(node: SyntaxNode) {
    if (node.type === 'function_declaration' || 
        node.type === 'function' ||
        node.type === 'arrow_function') {
      const name = getFunctionName(node);
      if (name) {
        const location = getLocation(node, content);
        functions.push({
          name,
          location,
          parameters: extractParameters(node, content),
          returnType: extractReturnType(node),
          isAsync: isAsync(node),
          isGenerator: isGenerator(node),
          calls: getCallTargets(node, content)
        });
      }
    }
    node.children.forEach(findFunctions);
  }

  // Find all class declarations
  function findClasses(node: SyntaxNode) {
    if (node.type === 'class_declaration' || node.type === 'class') {
      const nameNode = node.childForFieldName('name') || node.child(1);
      const name = nameNode?.text || 'Anonymous';
      const location = getLocation(node, content);
      
      const methods: FunctionDef[] = [];
      const properties: any[] = [];

      node.children.forEach(child => {
        if (child.type === 'method_definition') {
          const methodName = getFunctionName(child);
          if (methodName) {
            methods.push({
              name: methodName,
              location: getLocation(child, content),
              parameters: extractParameters(child, content),
              returnType: extractReturnType(child),
              isAsync: isAsync(child),
              isGenerator: isGenerator(child),
              calls: getCallTargets(child, content)
            });
          }
        }
        if (child.type === 'property' || child.type === 'field_definition') {
          const propName = child.child(0)?.text || 'unknown';
          properties.push({
            name: propName,
            type: child.child(1)?.text,
            accessibility: 'public' as const,
            isStatic: child.children.some(c => c.type === 'static')
          });
        }
      });

      classes.push({ name, location, methods, properties });
    }
    node.children.forEach(findClasses);
  }

  // Find imports
  function findImports(node: SyntaxNode) {
    if (node.type === 'import_statement' || node.type === 'import') {
      const sourceNode = node.childForFieldName('source');
      if (sourceNode) {
        const source = sourceNode.text.replace(/['"]/g, '');
        const imported: string[] = [];
        const alias: Record<string, string> = {};
        let isDefault = false;

        node.children.forEach(child => {
          if (child.type === 'identifier') {
            imported.push(child.text);
          }
          if (child.type === 'import_clause') {
            if (child.child(0)?.type === 'identifier') {
              isDefault = true;
              imported.push(child.child(0).text);
            }
          }
          if (child.type === 'alias') {
            const name = child.child(1)?.text;
            const aliasName = child.child(3)?.text;
            if (name && aliasName) {
              alias[name] = aliasName;
            }
          }
        });

        imports.push({ source, imported, alias, isDefault, isDynamic: false });
      }
    }
    node.children.forEach(findImports);
  }

  // Find exports
  function findExports(node: SyntaxNode) {
    if (node.type === 'export_statement' || node.type === 'export') {
      const decl = node.childForFieldName('declaration');
      if (decl) {
        const name = getFunctionName(decl) || getClassName(decl);
        if (name) exports.push(name);
      }
      // Handle: export { foo, bar }
      node.children.forEach(child => {
        if (child.type === 'export_clause') {
          child.children.forEach(c => {
            if (c.type === 'identifier') exports.push(c.text);
          });
        }
      });
    }
    node.children.forEach(findExports);
  }

  findFunctions(root);
  findClasses(root);
  findImports(root);
  findExports(root);

  return { functions, classes, imports, exports };
}

function getClassName(node: SyntaxNode): string | null {
  if (node.type === 'class_declaration') {
    return node.childForFieldName('name')?.text || null;
  }
  return null;
}

// Python parser
export function parsePython(ctx: ParserContext): ParseResult {
  const { tree, content } = ctx;
  const functions: FunctionDef[] = [];
  const classes: ClassDef[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];

  const root = tree.rootNode;

  function findFunctions(node: SyntaxNode) {
    if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name');
      const name = nameNode?.text || 'anonymous';
      functions.push({
        name,
        location: getLocation(node, content),
        parameters: extractPythonParameters(node),
        returnType: extractPythonReturnType(node),
        isAsync: node.children.some(c => c.type === 'async'),
        isGenerator: false,
        calls: getCallTargets(node, content)
      });
    }
    node.children.forEach(findFunctions);
  }

  function findClasses(node: SyntaxNode) {
    if (node.type === 'class_definition') {
      const nameNode = node.childForFieldName('name');
      const name = nameNode?.text || 'Anonymous';
      const methods: FunctionDef[] = [];

      node.children.forEach(child => {
        if (child.type === 'function_definition') {
          const methodName = child.childForFieldName('name')?.text;
          if (methodName) {
            methods.push({
              name: methodName,
              location: getLocation(child, content),
              parameters: extractPythonParameters(child),
              returnType: extractPythonReturnType(child),
              isAsync: child.children.some(c => c.type === 'async'),
              isGenerator: false,
              calls: getCallTargets(child, content)
            });
          }
        }
      });

      classes.push({ name, location: getLocation(node, content), methods, properties: [] });
    }
    node.children.forEach(findClasses);
  }

  function findImports(node: SyntaxNode) {
    if (node.type === 'import_statement' || node.type === 'import_from_statement') {
      const sourceNode = node.childForFieldName('module') || node.child(1);
      const source = sourceNode?.text.replace('.', '/') || '';
      const imported: string[] = [];

      node.children.forEach(child => {
        if (child.type === 'identifier') {
          imported.push(child.text);
        }
        if (child.type === 'dotted_name') {
          imported.push(child.text);
        }
      });

      imports.push({ source, imported, alias: {}, isDefault: false, isDynamic: false });
    }
    node.children.forEach(findImports);
  }

  findFunctions(root);
  findClasses(root);
  findImports(root);

  return { functions, classes, imports, exports };
}

function extractPythonParameters(node: SyntaxNode): Parameter[] {
  const params: Parameter[] = [];
  const paramsNode = node.childForFieldName('parameters');
  if (!paramsNode) return params;

  paramsNode.children.forEach(child => {
    if (child.type === 'identifier') {
      params.push({ name: child.text, type: 'any', optional: false });
    }
    if (child.type === 'typed_parameter') {
      const name = child.child(0)?.text;
      const type = child.child(2)?.text;
      if (name) params.push({ name, type: type || 'any', optional: false });
    }
  });

  return params;
}

function extractPythonReturnType(node: SyntaxNode): string | undefined {
  const ann = node.childForFieldName('return_type');
  return ann?.text;
}

// Generic location extractor
function getLocation(node: SyntaxNode, content: string): SourceLocation {
  const start = node.startPosition;
  const end = node.endPosition;
  return {
    start: { line: start.row + 1, column: start.column },
    end: { line: end.row + 1, column: end.column },
    file: ''
  };
}

// Language parser registry
export type LanguageParser = (ctx: ParserContext) => ParseResult;

const PARSERS: Partial<Record<Language, LanguageParser>> = {
  javascript: parseJavaScript,
  typescript: parseJavaScript,
  python: parsePython
};

export function getParser(language: Language): LanguageParser | null {
  return PARSERS[language] || null;
}

export function getLanguageFromExtension(filename: string): Language | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  
  for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (exts.includes(ext)) {
      return lang as Language;
    }
  }
  return null;
}
