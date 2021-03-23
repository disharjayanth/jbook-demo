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
            build.onLoad({ filter: /.*/ }, async (args: any) => {
                if (args.path === 'index.js') {
                    return {
                        loader: 'jsx',
                        contents: inputCode,
                    };
                }

                // Check to see if we already fetched this file
                // and if it is in cache 
                // const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);

                // // if it is then return it immiditely
                // if (cachedResult) {
                //     return cachedResult;
                // }

                const { data, request } = await axios.get(args.path);
                const fileType = args.path.match(/.css$/) ? "css" : "jsx";
                const contents = fileType === "css" ?
                    `
                const style = document.createElement("style");
                style.innerText = 'body { background-color: "red" }';
                document.head.appendChild(style);
                `
                    :
                    data;

                const result: esbuild.OnLoadResult = {
                    loader: "jsx",
                    contents: contents,
                    resolveDir: new URL("./", request.responseURL).pathname
                };
                // otherwise store response in cache
                await fileCache.setItem(args.path, result);

                return result;
            });
        }
    };
};