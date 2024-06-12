import { resolve } from 'path'
import { UserConfig } from 'vite'


const config = {
    build: {
        lib: {

            entry: resolve(__dirname, 'app.ts'),
            name: 'Hapi',
            formats: ['iife']
        },
        outDir: resolve(__dirname, '../server/assets/build'),
        target: 'es2020',
        sourcemap: true,
        minify: true,
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {

                    let extType = assetInfo.name!.split('.').at(1);
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType!)) {

                        extType = 'images';
                    }

                    return `${extType}/[name][extname]`;
                },
                manualChunks: false as any,
                entryFileNames: 'js/[name].js'
            }
        },
    },

    css: {
        preprocessorOptions: {
            scss: {}
        }
    },
}

export default config