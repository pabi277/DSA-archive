/**
 * Minimal typings for `@live-codes/clang-wasm` (MIT), whose package publishes no
 * `.d.ts`. Only the surface `src/runner/worker.ts` uses is declared — the
 * package's own documentation is the source for the shapes below.
 */
declare module '@live-codes/clang-wasm' {
  export type ClangRunResult = {
    stdout: string
    stderr: string
    output: string
    /** Compiler diagnostics, one line each; empty when the program compiled. */
    errors: string[]
    exitCode: number | null
    compileMs: number
    runMs: number | null
  }

  export type ClangCompiler = {
    run(
      code: string,
      input?: string | Uint8Array,
      options?: { args?: string[]; compileArgs?: string[]; std?: string | null; fileName?: string },
    ): Promise<ClangRunResult>
    dispose(): void
    readonly std: string | null
  }

  export type CompilerOptions = {
    baseUrl?: string | URL
    std?: string | null
    compileArgs?: string[]
    args?: string[]
    fileName?: string
    onProgress?: (fraction: number) => void
    maxAssetBytes?: number
  }

  export function createCompiler(language: string, options?: CompilerOptions): Promise<ClangCompiler>
  export const LANGUAGE_IDS: string[]
  export function standardsFor(language: string): string[]
}
