const express = require('express');
const bodyParser = require('body-parser');
require("dotenv").config();
const request = require('request');

//Express configuration
const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;


//Main configuration variables
const urlToCheck = process.env.URL_TO_CHECK;
const elementsToSearchFor = ['MINT - Releasing Soon'];
const checkingFrequency = 1 * 60000; //first number represent the checkingFrequency in minutes

//Slack Integration
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const slack = require('slack-notify')(SLACK_WEBHOOK_URL);

//SendGrid Email Integration
const SENDGRID_APY_KEY = process.env.SENDGRID_APY_KEY;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(SENDGRID_APY_KEY);
const emailFrom = process.env.EMAIL_FROM
const emailsToAlert = [process.env.EMAIL_FROM];


const checkingNumberBeforeWorkingOKEmail = 1440 / (checkingFrequency / 60000);   //1 day = 1440 minutes
let requestCounter = 0;


//Main function
const intervalId = setInterval(function () {

    request(urlToCheck, function (err, response, body) {
        //if the request fail
        if (err) {
            console.log(`Request Error - ${err}`);
        }
        else {
            //if the target-page content is empty
            if (!body) {
                console.log(`Request Body Error - ${err}`);
            }
            //if the request is successful
            else {

                //if any elementsToSearchFor exist
                if (elementsToSearchFor.some((el) => body.includes(el))) {

                    // Slack Alert Notification
                    slack.alert(`🔥🔥🔥  <${urlToCheck}/|Change detected in ${urlToCheck}>  🔥🔥🔥 `, function (err) {
                        if (err) {
                            console.log('Slack API error:', err);
                        } else {
                            console.log('Message received in slack!');
                        }
                    });

                    // Email Alert Notification
                    const msg = {
                        to: emailsToAlert,
                        from: emailFrom,
                        subject: `🔥🔥🔥 Change detected in ${urlToCheck} 🔥🔥🔥`,
                        html: `Change detected in <a href="${urlToCheck}"> ${urlToCheck} </a>  `,
                    };
                    sgMail.send(msg)
                        .then(()=>{console.log("Alert Email Sent!");})
                        .catch((emailError)=>{console.log(emailError);});
                }

            }
        }
    });

    requestCounter++;


    // "Working OK" email notification logic
    if (requestCounter > checkingNumberBeforeWorkingOKEmail) {

        requestCounter = 0;

        const msg = {
            to: emailsToAlert,
            from: emailFrom,
            subject: '👀👀👀 Website Change Monitor is working OK 👀👀👀',
            html: `Website Change Monitor is working OK - <b>${new Date().toLocaleString("en-US", {timeZone: "America/New_York"})}</b>`,
        };
        sgMail.send(msg)
            .then(()=>{console.log("Working OK Email Sent!");})
            .catch((emailError)=>{console.log(emailError);});
    }

}, checkingFrequency);


//Index page render
app.get('/', function (req, res) {
    res.render('index', null);
});


//Server start
app.listen(PORT, function () {
    console.log(`Example app listening on port ${PORT}!`)
});
