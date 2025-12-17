import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint Configuration - Opinionated Zero-Warnings Approach
 *
 * Philosophy:
 * - Use "error" or "off", NEVER "warn" (warnings are an anti-pattern)
 * - Useful warnings = errors (fix them immediately)
 * - Useless warnings = off (don't clutter output)
 * - Run with --max-warnings 0 to enforce zero tolerance
 *
 * Sources:
 * - https://dev.to/thawkin3/eslint-warnings-are-an-anti-pattern-33np
 * - https://typescript-eslint.io/users/configs/
 * - https://cmdcolin.github.io/posts/2023-08-20-typescriptlint/
 */

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.config.js'],
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // ============================================================
      // USEFUL RULES - Keep as errors, fix violations immediately
      // ============================================================

      // Catches unhandled promises that cause silent failures
      // One of the most valuable rules - prevents "Uncaught (in promise)" errors
      '@typescript-eslint/no-floating-promises': 'error',

      // Prevents promise misuse in places expecting non-promises
      '@typescript-eslint/no-misused-promises': 'error',

      // Allow underscore prefix for intentionally unused vars (common pattern)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // Enforces braces around conditionals - prevents bugs from adding statements
      'curly': 'error',

      // Prefer for-of over forEach - better performance, better type narrowing
      '@typescript-eslint/prefer-for-of': 'error',

      // Use @ts-expect-error instead of @ts-ignore - fails when no longer needed
      '@typescript-eslint/prefer-ts-expect-error': 'error',

      // Catches accidental any usage from JSON.parse, etc.
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // Explicit any requires a conscious decision
      '@typescript-eslint/no-explicit-any': 'error',

      // ============================================================
      // DISABLED RULES - Noisy, unhelpful, or redundant with TypeScript
      // ============================================================

      // TypeScript already enforces return types through inference
      // Explicit return types add noise without catching bugs
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Non-null assertion (!) is a useful escape hatch
      // Workarounds create more complex, harder to understand code
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Empty functions are often intentional (no-op callbacks, etc.)
      '@typescript-eslint/no-empty-function': 'off',

      // console.info/warn/error are legitimate for CLI tools and debugging
      // Only console.log is typically problematic in production
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],

      // Restrict template expressions is overly pedantic
      // TypeScript handles type coercion in templates fine
      '@typescript-eslint/restrict-template-expressions': 'off',

      // This rule has false positives with array access and optional chaining
      // TypeScript's own checks are sufficient
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Inferring types is often cleaner than explicit type arguments
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',

      // This rule is noisy and has edge cases
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',

      // Void expressions rule is too strict for practical use
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // Redundant type constituents - TypeScript handles this
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  }
);
