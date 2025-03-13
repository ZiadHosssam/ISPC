import express, {type Application, type Response, type Request} from "express";
import https from "https";
import http from "http";
import path from "path";
import fs from "node:fs";

//makes an app using express (networking stuff)
const certificate = fs.readFileSync("certificates/websignedcertziad.crt");
const key = fs.readFileSync("certificates/websignedkeyziad.key");

const app : Application = express();
//port number, 80 is standard for http protocols (use either 80 for http or 443 for https)
const port : number = 443;

const routes : Map<string, ((req:Request, res:Response) => void)> = new Map([
    //** HOME PAGE **/
    ["home", (req : Request, res : Response) => {
        res.status(200).sendFile(path.join(__dirname, "static/home.html"))
    }], 
    //** SOCIAL PAGE **/
    ["social", (req : Request, res : Response) => {
        res.send("social page");
    }],
    //** ABOUT US PAGE **/
    ["aboutus", (req : Request, res : Response) => {
        res.send("about us page");
    }],
    //** FEED PAGE **/
    ["feed", (req : Request, res : Response) => {
        res.send("feed page");
    }],
    //** FILES PAGE **/
    ["files", (req : Request, res : Response) => {
        res.send("files page");
    }],
    //** CONTACT US PAGE **/
    ["contactus", (req : Request, res : Response) => {
        res.send("contact us page");
    }],
    //** SIGN IN PAGE **/
    ["signin", (req : Request, res : Response) => {
        res.status(200).sendFile(path.join(__dirname, "static/sign_in.html"));
    }]
]);

fs.readdir("./js/", (err : NodeJS.ErrnoException | null, files : string[]) => {
    if (err != null) console.log("an error has arose from reading the js folder: " + err);
    files.forEach(file => {
        console.log(file);
        app.get('/js/'.concat(file), (req:Request, res:Response)=>{
            res.setHeader('Content-Type', 'application/javascript');
            fs.readFile('js/'.concat(file), 'utf8', (err, data) => {
                if (err === null)
                    res.end(data);
                else res.end(`console.log("An error has occurred while uploading file ${err}")`);
            });
        });
    });
});

//** PROCESSES THE LANDING PAGE **/
app.get('/', (req : Request, res : Response) => {
    res.status(200).sendFile(path.join(__dirname, "static/landing_page.html"));
});

app.post('/', (req : Request, res : Response) => {
    console.log(req.rawHeaders);
    res.status(200).send("hi hello");
});

/* Loops through every key-value pair in routes and sets the route in the express application properly with the callback written 
against the corresponding page name*/
routes.forEach((pageCallback : ((req: Request, res : Response) => void), pageName : string) => {
    app.get('/'.concat(pageName), pageCallback);  
});

//Listens on port 80 (set to 80 because thats the standard for http protocols, need to issue a certificate for the domain when gotten.)
//note to future self, when issuing certificates either issue a certificate for http when you want to use port 80, for port 443 issue an
//https certificate
https.createServer({key: key, cert: certificate}, app).listen(port, () => {
    console.log("listening on port %d", port);
});