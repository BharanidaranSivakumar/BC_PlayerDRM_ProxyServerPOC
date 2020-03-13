let express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
let drmtoday = require('./drmtoday')
let midstreamcheck = require('./midstreamcheck')
let bodyParser = require('body-parser')
const promise = require('promise');
var cors = require('cors')
var atob = require('atob');

let app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

const options = {
    key: fs.readFileSync('C:/Users/work/Downloads/TVMATP1987D.key', 'utf8'),
    cert: fs.readFileSync('C:/Users/work/Downloads/TVMATP1987D.crt', 'utf8')
};

var httpServer = http.createServer(app);
// var httpsServer = https.createServer(options, app);


app.post('/getlicense', (req, resp) => {
    let requestBody = (new Buffer.from(req.body.body, 'base64')).toString('utf8');
    return new promise((resolve, reject) => {
        midstreamcheck.getCurrentLocation(req.body.ipaddress)
            .then(currentzip => {
                this.currentzip = currentzip
                midstreamcheck.getPlaybackRights(req.body.videoId, req.body.accountId)
                    .then(allowedzip => midstreamcheck.midstreamCheck(currentzip, allowedzip))
                    .then(result => {
                        drmtoday.getAuthforDRMrequest(midstreamcheck.assetId)
                            .then(headers => drmtoday.getlicensefromDRMlicenseServer(headers.customData, headers.token, requestBody))
                            .then(drmKey => resp.send(drmKey))
                    }).catch(err => {
                        console.log(err)
                        resp.send(err)
                    })
            })
    })
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
httpServer.listen(3080);
// httpsServer.listen(3443);