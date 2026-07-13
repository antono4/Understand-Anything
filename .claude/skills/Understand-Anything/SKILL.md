```markdown
# Understand-Anything Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns found in the Understand-Anything repository, a TypeScript codebase with a focus on clear, conventional commit messages, consistent code style, and modular design. You'll learn how to structure files, write imports/exports, and follow the project's conventions for maintainable, scalable TypeScript code. While no specific frameworks are used, the repository emphasizes best practices and testable code.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myComponent.ts`, `dataFetcher.test.ts`

### Import Style
- Use **relative imports** for all modules.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Export Style
- Use **named exports** rather than default exports.
  - Example:
    ```typescript
    // In dataFetcher.ts
    export function fetchData() { /* ... */ }
    ```

    ```typescript
    // In another file
    import { fetchData } from './dataFetcher';
    ```

### Commit Messages
- Follow the **conventional commit** style.
- Use the `feat` prefix for new features.
- Keep commit messages descriptive (average length: ~91 characters).
  - Example:
    ```
    feat: add support for dynamic question parsing in answer module
    ```

## Workflows

### Adding a New Feature
**Trigger:** When you want to introduce new functionality.
**Command:** `/add-feature`

1. Create a new TypeScript file using camelCase naming.
2. Implement your feature using named exports.
3. Write or update tests in a corresponding `*.test.ts` file.
4. Use a relative import to include your new module where needed.
5. Commit your changes with a conventional commit message:
   ```
   feat: describe your new feature in detail
   ```

### Writing Tests
**Trigger:** When you add or modify code that needs verification.
**Command:** `/write-test`

1. Create a test file named after the module, using the pattern `moduleName.test.ts`.
2. Write your tests using your preferred testing framework (not specified in repo).
3. Use named imports to bring in the functions or modules under test.
   ```typescript
   import { fetchData } from './dataFetcher';
   ```
4. Run your tests using the project's test runner (check project scripts or documentation).

## Testing Patterns

- Test files follow the `*.test.ts` naming convention.
- Tests are colocated with or near the modules they test.
- Use named imports for functions/modules under test.
- Testing framework is not specified—refer to project documentation or package.json for details.

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /add-feature   | Scaffold and commit a new feature            |
| /write-test    | Create and run tests for a module            |
```
