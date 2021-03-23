import * as esbuild from 'esbuild-wasm';

export const unpkgPathPlugin = () => {
    return {
        name: 'unpkg-path-plugin',
        setup(build: esbuild.PluginBuild) {
            // for index.js file (since all module starts with index.js as root)
            build.onResolve({ filter: /(^index.js$)/ }, () => {
                return { path: "index.js", namespace: "a" };
            });

            // for nested module or handle relative paths in module
            build.onResolve({ filter: /^\.+\// }, (args: any) => {
                return { path: new URL(args.path, "https://unpkg.com/" + args.resolveDir + "/").href, namespace: "a" };
            });

            // for root file of module or handle main file of module
            build.onResolve({ filter: /.*/ }, async (args: any) => {
                return {
                    namespace: "a",
                    path: `https://unpkg.com/${args.path}`
                };
            });
        },
    };
};