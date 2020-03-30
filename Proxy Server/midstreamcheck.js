const https = require('https');
let restapi = require('./restapi');
const promise = require('promise');
let bc_tokengenerator = require('./bc_tokengenerator');
const BC_PLAYBACKRIGHTS_BASEURL = 'https://playback-rights.api.brightcove.com/v1/accounts/';
const BC_CMSAPI_BASEURL = 'https://cms.api.brightcove.com/v1/accounts/';
const IPLOC_FINDER_URL = 'https://tools.keycdn.com/geo.json?host=';

let getCurrentLocation = (ipaddress) => {
    return new promise((resolve, reject) => {
        method = 'GET'
        url = IPLOC_FINDER_URL + ipaddress
        headers = ''
        body = ''
        restapi.callRestAPI(method, url, headers, body).then(response => {
            var currentzip
            var loc = JSON.parse(response.body);
            currentzip = loc.data.geo['postal_code']
            console.log("\nCurrent zip code: " + currentzip+"\n");
            return resolve(currentzip);
        }).catch(error => {
            return reject("Zip not resolved");
        })

    })
}

let getPlaybackRights = (videoId, accountId) => {
    return new promise((resolve, reject) => {
        bc_tokengenerator.getAccessToken().then(accesstoken => {
            this.accesstoken = accesstoken
            getPlaybackRightsId(videoId, accountId, accesstoken).then(playbackrightId => {
                method = 'GET'
                url = BC_PLAYBACKRIGHTS_BASEURL + accountId + '/playback_rights/' + playbackrightId
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accesstoken
                }
                body = ''
                restapi.callRestAPI(method, url, headers, body).then(response => {
                    resp = JSON.parse(response.body)
                    timerestrictioncheck(resp).then(response => {
                        allowedzip = []
                        allowedzip = allowedzip.concat(resp.geo.allowed_zip_codes)
                        allowedzip_striped = []
                        for (zip of allowedzip) {
                            stripedzip = zip.replace('US-', '')
                            allowedzip_striped.push(stripedzip)
                        }
                        return resolve(allowedzip_striped);
                    }).catch(error =>{
                        return reject("This content is not authorised to play at this time");
                    })
                }).catch(error => {
                    return reject("Playback rights access failed");
                })
            }).catch(error => {
                return reject("Playback rights id request failed");
            });
        }).catch(error => {
        return reject("Auth token generation failed");
        });
    })
}

let getPlaybackRightsId = (videoId, accountId, accesstoken) => {
    return new promise((resolve, reject) => {
        method = 'GET'
        url = BC_CMSAPI_BASEURL + accountId + '/videos/' + videoId
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accesstoken
        }
        body = ''
        restapi.callRestAPI(method, url, headers, body).then(response => {
            resp = JSON.parse(response.body)
            var playbackrightId = resp.playback_rights_id
            // console.log("playback_rights_id=" + playbackrightId)
            var assetId = resp.reference_id
            module.exports.assetId = resp.reference_id
            return resolve(playbackrightId)
        }).catch(error => {
            return reject("Playback rights id request failed");
        })
    })
}

let midstreamCheck = (currentzip, allowedzip) => {
    return new promise((resolve, reject) => {
        const count = allowedzip.indexOf(currentzip)
        if (count < 0) {
            console.log("\nMidstream check status: false\n")
            return reject("Not Authorised in your location");
        }
        else {
            console.log("\nMidstream check status: true\n")
            return resolve(true);
        }
    })
}

let timerestrictioncheck = (rights) => {
    return new promise((resolve, reject) => {
        var now = new Date().getTime();
        status = true
        if (rights.start_time != undefined) {
            start_time = rights.start_time
            if (rights.end_time != undefined) {
                end_time = rights.end_time
                if (start_time <= now && now <= end_time) {
                    status = true
                } else {
                    status = false
                }
            } else {
                if (start_time <= now) {
                    status = true
                } else {
                    status = false
                }
            }
        }if (status == true) {
            console.log("\Time restriction check status: true\n")
            return resolve(true);
        } else {
            console.log("\nTime restriction check status: false\n")
            return reject("This content is not authorised to play at this time");
        }
    })
}

module.exports = { getCurrentLocation, getPlaybackRights, midstreamCheck }
