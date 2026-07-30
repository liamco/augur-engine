import { defineConfig } from "vitest/config";
import path from "path";

// The alias block mirrors the "paths" entry in tsconfig.json. Vitest does not
// read tsconfig paths, so any alias app code uses has to be repeated here or
// importing that module from a test fails to resolve.
export default defineConfig({
    test: {
        globals: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
            "#codex": path.resolve(__dirname, "app/codex"),
            "#assets": path.resolve(__dirname, "app/ui/assets"),
            "#components": path.resolve(__dirname, "app/ui/components"),
            "#modules": path.resolve(__dirname, "app/ui/modules"),
            "#scripts": path.resolve(__dirname, "scripts"),
            "#types": path.resolve(__dirname, "app/types"),
            "#utils": path.resolve(__dirname, "app/ui/utils"),
        },
    },
});
