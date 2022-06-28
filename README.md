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

## Required installation
In order to run the scraper, some additional software will need to be installed. Below is a list of software along with instructions on how to install it.
- nodejs version 16.13.1 or higher
  <ol><li>To Downoad go to https://nodejs.org/en/download/</li>
    <li>Make sure you select the tab that says "Reccommended for most users"</li>
    <li>click either windows installer or macOS installer depending on your device</li>
    <li>click the downloaded installer to run it</li>
    <li>step through the setup wizard:<ol>
    <li>click next on the first page</li>
    <li>accept the End-User Liscence agreement and click next</li>
    <li>Choose your install location (The default location should be a good place to install it)</li>
    <li>Make sure "Node.js runtime", "npm package manager", and "Add to PATH" are all shown in the custom setup window (there may be a few other things as well, this is okay), and click next</li>
     <li>click next on "Tools for Native Modules"</li>
     <li>click install</li>
     <li>if asked to allow app to make changes click yes</li></ol>
    </ol>
- npm version 8.1 
  - This should have been installed as a part of the node installation
- poppler
  - This should already be in thr project for windows devices
  - For Mac:
    - Open Terminal by pressing command+space then type terminal and hit Enter key.
    - Install homebrew by copy pasting in the following and pressing enter:    
```ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)" < /dev/null 2> /dev/null``` 
    - Install poppler by typing the following and pressing enter:
```brew install poppler```
    



## Scraper Setup
These instructions are for running the scraper on a windows machine. The scraper should also work on mac, but some of the instructions on extracting zip files and installing software may be slightly different.
<ol>
<li> Download the code using the following link: https://github.com/jmurray-ffg/policy-scraper/archive/refs/heads/run-local.zip </li>
<li> Extract the contents of the zip file into the folder of your choice (right-click -> click Extract all -> select a folder -> click extract)</li>
<li> Edit the scraper input file: There is a template file in the project called INPUT.csv. This file can be opened in Excel and edited with different urls etc. It has the following columns:
<ol>
  <li>urls: Enter all of the LEA urls you wish to scrape into this column</li>
  <li>keywords: enter the keywordss you are looking for into this column</li>
  <li>weights: these weights correspond to keywords to determine how important each keyword is</li>
  <li>maxPagesPerLEA: The number of pages to check before deciding on a policy. Larger numbers will make it more likely to locate the policy document, but will make the run take longer</li>
NOTE: Do not change the first row of this file, it may cause errors later on</ol>
</li>
<li> Open the project in the command line: <ol>
  <li> On windows: <ol>
    <li>navigate to the policy-scraper-run-local folder in file explorer</li>
    <li> Click on the location bar (top center bar containing the route to your current folder) and type `CMD` then press enter</li></ol>
    </li>
    <li> On Mac:
     <ol><li>Open Terminal by pressing command+space then type terminal and hit Enter key.</li>
     <li> Navigate to the folder by typing `cd` then dragging the target folder into the terminal window (this should fill out the file path into the terminal) then press enter</li></ol></li></ol>
<li> in the command line type `node main.js` this should start running the scraper</li>
<li> The scraper will ask you to enter an input csv file. drag and drop your INPUT.csv (or other matching csv file you have created) into the command line and press enter</li>
<li> the scraper should now start running for several minutes to several hours depending on the number of URLs</li>
<li> When the crawler finished ther terminal should show a message like:
total processing: 0.077
total sleep: 5.009
</li>
<li> the resulst will be in a csv file in the policy-scraper-run-local folder with a name like result_1656105149302 (the number may be  a little different)</li></ol></ol>

### reading the results
the resulst will be in a csv file in the policy-scraper-run-local folder with a name like result_1656105149302 (the number may be  a little different)
- This file will contain a list of all of your keywords as well as "URL"	"LEA Homepage URL"	and "Total Score"
  - URL is the location of the possible policy document
  - LEA Homepage URL is the homepage of the LEA. You can use this to match the result with an LEA
  - Total Score is the wieghted total of all of the keywords found on that page, pages with higher scores better match you policy document search terms
