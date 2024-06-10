import Ejs from 'ejs';
import Vision from '@hapi/vision';

const visionOptions =  {

    plugin: Vision.plugin,
    options: {
        engines: {
            html: Ejs,
            ejs: Ejs,
            md: {

            }
        },
        path: `${__dirname}/views`,
        layout: true,
        layoutPath: `${__dirname}/views/layouts`,
        partialsPath: `${__dirname}/views/partials`,
        helpersPath: `${__dirname}/views/helpers`,
    }
};


export default visionOptions;