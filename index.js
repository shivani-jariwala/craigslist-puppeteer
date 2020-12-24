const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const Listing = require('./model/Listing')
require('dotenv').config()

const db = process.env.MONGO_URI;

async function connectToMongoDb() {
    await mongoose.connect(db,{useNewUrlParser : true})
    console.log("connected to mongodb");
}
async function scrapeListings(page){
    //const browser = await puppeteer.launch({headless:false}); //makes an instance of a browser
    //const page = await browser.newPage();  //opens a new tab in the browser
    //await page.goto("https://www.google.com")
    await page.goto("https://bangladesh.craigslist.org/d/legal-services/search/lgs") //open the url written in the inverted commas
    const html = await page.content(); //in puppeteer use page.content in request, use request.get
    const $ = cheerio.load(html)
    //$(".result-title").each((index,element)=>{console.log($(element).text())})
    //$(".result-title").each((index,element)=>{console.log($(element).attr("href"))})
    const listings = $(".result-info").map((index,element)=>{ //by using this we take out title as well as url of the job
        const titleElement = $(element).find(".result-title");
        const timeElement = $(element).find(".result-date");
        const hoodElement = $(element).find(".nearby");
        const title = $(titleElement).text();
        const url = $(titleElement).attr("href");
        const datePosted = new Date($(timeElement).attr("datetime"))
        const hood = $(hoodElement).text().trim().replace("(","").replace(")","");
        return {title,url,datePosted,hood}
    }).get();  //in cheerio we use .get method with .map but in jquery we use only .map
    return listings;
}

async function scrapeJobDescriptions(listings,page) {
    for (var i=0; i< listings.length; i++){
        await page.goto(listings[i].url)
        const html  = await page.content()
        const $ = cheerio.load(html)
        const jobDescription = $("#postingbody").text()
        //const compensation = $("p.attrgroup > span:nth-child(1) > b").text(); //for the salary
        listings[i].jobDescription = jobDescription;
        //listings[i].compensation = compensation;  //for adding salary to the object
        console.log(listings[i].jobDescription);
        //console.log(listings[i].compensation);
        const listingModel = new Listing(listings[i]); //creating a database schema
        await listingModel.save()
        await sleep(1000) //1 second sleep
    }
}

async function sleep(miliseconds) { //resolve a promise once the said miliseconds are completed
    return new Promise(resolve => setTimeout(resolve,miliseconds)) //resolve is call back function once the miliseconds has passed
} //this returns a new promise after the said miliseconds, meaning the promise is resolved

async function main() {
    await connectToMongoDb();
    const browser = await puppeteer.launch({headless:false});
    const page = await browser.newPage(); 
    const listings = await scrapeListings(page);
    const listingsWithJobDesciptions = await scrapeJobDescriptions(listings,page)
    console.log(listings);
}
main();