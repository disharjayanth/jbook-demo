import * as esbuild from 'esbuild-wasm';
import axios from "axios";
import localforage from "localforage";

const fileCache = localforage.createInstance({
    name: "filecache"
});

export const fetchPlugin = (inputCode: string) => {
    return {
        name: "fetch-plugins",
        setup(build: esbuild.PluginBuild) {
            build.onLoad({ filter: /(^index\.js$)/ }, () => {
                return {
                    loader: "jsx",
                    contents: inputCode
                };
            });

            build.onLoad({ filter: /.css$/ }, async (args: any) => {
                const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);
                if (cachedResult) {
                    return cachedResult;
                }
            });

            build.onLoad({ filter: /.css$/ }, async (args: any) => {
                // Check to see if we already fetched this file
                // and if it is in cache 
                const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);

                // // if it is then return it immiditely
                if (cachedResult) {
                    return cachedResult;
                }

                const { data, request } = await axios.get(args.path);
                const escaped = data
                    .replace(/\n/g, "")
                    .replace(/"/g, '\\"')
                    .replace(/'/g, "\\'");
                const contents =
                    `
                const style = document.createElement("style");
                style.innerText = '${escaped}';
                document.head.appendChild(style);
                `;

                const result: esbuild.OnLoadResult = {
                    loader: "jsx",
                    contents: contents,
                    resolveDir: new URL("./", request.responseURL).pathname
                };
                // otherwise store response in cache
                await fileCache.setItem(args.path, result);

                return result;

            });

            build.onLoad({ filter: /.*/ }, async (args: any) => {
                const { data, request } = await axios.get(args.path);

                const result: esbuild.OnLoadResult = {
                    loader: "jsx",
                    contents: data,
                    resolveDir: new URL("./", request.responseURL).pathname
                };
                // otherwise store response in cache
                await fileCache.setItem(args.path, result);

                return result;
            });
        }
    };
};