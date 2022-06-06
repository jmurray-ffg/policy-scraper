# Local Scraper Setup

To run locally you will need to install the following:
- node version 16
- npm version 8

You will also need to install poppler-utils to get accesss to the pdftotext command
https://blog.alivate.com.au/poppler-windows/

Additionally you will need to run an npm install of the Apify cheerio crawler
``` npm install apify cheerio ```

The rest of the dependencies can be added with
``` npm install ```

## Input
The INPUT.json file contains the parameters for the run, including the list of keywords and their weights, as well as the list of urls
