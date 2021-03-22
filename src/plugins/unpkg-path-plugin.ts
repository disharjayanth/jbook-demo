import * as esbuild from 'esbuild-wasm';
import axios from "axios";
import localforage from "localforage";

const fileCache = localforage.createInstance({
    name: "filecache"
});

export const unpkgPathPlugin = (inputCode: string) => {
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

            build.onLoad({ filter: /.*/ }, async (args: any) => {
                console.log('onLoad', args);
                if (args.path === 'index.js') {
                    return {
                        loader: 'jsx',
                        contents: inputCode,
                    };
                }

                // Check to see if we already fetched this file
                // and if it is in cache 
                const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);

                // if it is then return it immiditely
                if (cachedResult) {
                    return cachedResult;
                }

                const { data, request } = await axios.get(args.path);
                const result: esbuild.OnLoadResult = {
                    loader: 'jsx',
                    contents: data,
                    resolveDir: new URL("./", request.responseURL).pathname
                };
                // otherwise store response in cache
                await fileCache.setItem(args.path, result);

                return result;
            });
        },
    };
};