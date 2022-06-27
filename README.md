# Local Scraper Setup

To run locally you will need to install the following:
- node version 16
- npm version 8

You will also need to install poppler-utils to get accesss to the pdftotext command
to do that on windows you will need to get the pdftotext binary from here, and add it to your path
https://blog.alivate.com.au/poppler-windows/

Additionally you will need to run an npm install of the Apify cheerio crawler
``` npm install apify cheerio ```

The rest of the dependencies can be added with
``` npm install ```

## Input
When running the program it will ask for an input csv file. INPUT.csv is provided as a template file that can be modified with yoour desired input parameters. When actually running the program you will be asked to enter the path to INPUT.csv, or you can enter the path of a different csv file as long as it matches the format of the template
