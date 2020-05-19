
const request = require('request');
const querystring = require('querystring');
const express = require('express');
const path = require('path');
const config = require('./config.js');

// Establishing Express server
var app = express();
var authCode = null;
var access_token = null;
var refresh_token = null;

// Renders homepage
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname + '/html/login.html'));
    console.log("Request made to localhost:8888");
})

// Triggers login action
app.get('/login', function(req, res){

    // Create authorization query string
    // Add scopes later
    var authStr = querystring.stringify(
        {
            client_id: config.CLIENT_ID,
            response_type: 'code',
            redirect_uri: config.REDIRECT_URL,
            scope: "user-read-currently-playing",
            show_dialog: true
        }
    )

    // Authorization endpoint given in documentation
    var requestURL = 'https://accounts.spotify.com/authorize?'

    res.redirect(requestURL + authStr)

    console.log("Request made to localhost:8888/login");
})

// Triggers callback action
app.get('/callback', function(req, res){
    res.sendFile(path.join(__dirname + '/html/callback.html'));
    var authCode = req.query.code;
    var authState = req.query.state;
    console.log("Request made to localhost:8888/callback");

    // Need to exchange authCode with access token

    // authorization endpoint given in documentation
    var requestURL = "https://accounts.spotify.com/api/token";

    // Create JSON query object
    var authObj = {
        url: requestURL,
        form: {
            code: authCode,
            redirect_uri: config.REDIRECT_URL,
            grant_type: "authorization_code"
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64'))
        },
        json: true
    };

    // Make POST Request
    request.post(authObj, function(err, response, body){
        if (err) {
            console.log(err);
            return;
        }

        // Used for making additional responses to API
        access_token = body.access_token;
        // Used to get additional access tokens upon expiration
        refresh_token = body.refresh_token;
        
        checkNowPlaying(access_token, res);
    });
});

function checkNowPlaying(accessParam, res){
    // Make authorization Object
    nowPlayingURL = "https://api.spotify.com/v1/me/player/currently-playing";
    access_token = accessParam;
    authObj = {
        url: nowPlayingURL,
        headers:{
            'Authorization': 'Bearer ' + access_token
        },
        json: true
    }

    var refreshInterval = 1000;
    var nowPlaying = null;
    var oldPlaying = null;
    
    // Check the Now Playing Track
    setInterval(function() {
        request(authObj, function(err, response, body){
            if (err) {
                console.log("Error: " + err);
            }
    
            if (response.statusCode == 204){
                nowPlaying = "No music playing...";
                console.log(nowPlaying);
            }
    
            if (response.statusCode == 200){
                oldPlaying = nowPlaying;
                nowPlaying = body.item.name;
            }

            if (nowPlaying != oldPlaying){
                console.log(nowPlaying);
                console.log(body.item.artists[0].name);
                console.log(body.item.album.name);
                console.log("........................");
            }
        });
    }, refreshInterval)
}

// Triggers callback action
app.get('/refresh', function(req, res){
    var refresh_token = res.refresh_token;

    console.log("Old refresh_token: " + refresh_token);
    getNewAccessToken(refresh_token);
    console.log("New refresh_token: " + refresh_token);
    
     res.redirect('/callback');
});

// Listen for Express server traffic
app.listen(8888);