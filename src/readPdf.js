// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

// Import Apify SDK. For more information, see https://sdk.apify.com/
const Apify = require('apify');
const fs = require('fs')
const pdfExtract = require('pdf-text-extract');
const requestPromise = require('request-promise');
const path = require('path');
const util = require("util");

module.exports.readPdf = async(input) => {
    // Get input of the actor (here only for demonstration purposes).
    // If you'd like to have your input checked and have Apify display
    // a user interface for it, add INPUT_SCHEMA.json file to your actor.
    // For more information, see https://docs.apify.com/actors/development/input-schema
    console.log('Input:');
    console.dir(input);

    if (!input || !input.url) throw new Error('Input must be a JSON object with the "url" field!');

    const options = {
        url: input.url,
        encoding: null // set to `null`, if you expect binary data.
    };

    const response = await requestPromise(options);
    const buffer = Buffer.from(response);

    const tmpTarget = 'temp.pdf';
    console.log('Saving file to: ' + tmpTarget);
    fs.writeFileSync(tmpTarget, buffer)
    console.log('File saved.');

    const pathToPdf = path.join(__dirname, tmpTarget);
    const extract = util.promisify(pdfExtract);

    console.log('Extracting PDF...');
    const pagesText = await extract(pathToPdf);
    console.log('Crawling result...');

    console.dir(JSON.stringify(pagesText, null, 2));

    console.log('Setting OUTPUT...')
    await Apify.setValue('OUTPUT', pagesText);
    console.log('Finished');
}