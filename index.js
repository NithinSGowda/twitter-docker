const uri = "mongodb+srv://stockapp:88888888@cluster0.o8iuu.mongodb.net/smmpanel?authSource=admin&replicaSet=atlas-yebdcz-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true";
const mongoose = require('mongoose');
const express = require('express')
const app = express()
const port = 8080
var multer = require('multer');
var upload = multer();
app.use(express.urlencoded({ extended: true })); 
app.use(upload.array()); 
app.use(express.json()); 
var cors = require('cors')
app.use(cors())
var request = require('request');
const psswd = "pass"
var stream;
var streamStatus = false

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
    })
    .then(() => {
    console.log('Connected')
}).catch(err => console.log(err))
const tweetModel = new mongoose.Schema({ tweetid: 'string', data: 'string', tag: 'string'},{timestamps: true});
const tweeter = mongoose.model('tweets', tweetModel);

const needle = require('needle');

const token = 'AAAAAAAAAAAAAAAAAAAAAN6hOAEAAAAA4PVHTg%2Fqr2d2ll1wqS2Z5q%2Bwo%2Fs%3DFgYv9JWu7xlzNyq30KvpEjSkydfR7wzlyrK3R5x0zFZcIIu8jP';

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';

async function getAllRules(res) {

    const response = await needle('get', rulesURL, {
        headers: {
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 200) {
        console.log("Error:", response.statusMessage, response.statusCode)
        throw new Error(response.body);
    }

    res.json(JSON.parse(JSON.stringify(response.body)));
    res.end()
}

function deleteRule(term,res) {
    var options = {
    'method': 'POST',
    'url': 'https://api.twitter.com/2/tweets/search/stream/rules',
    'headers': {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "delete": {
            "values": [
                term
            ]
        }
    })

    };
    request(options, function (error, response) {
        if (error){
            res.json(error)
          }else{
            res.json(JSON.parse(response.body))
            res.end()
          }
    });
}

function addRule(term,name,res) {
    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://api.twitter.com/2/tweets/search/stream/rules',
      'headers': {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "add": [
          {
            "value": term,
            "tag": name
          }
        ]
      })
    
    };
    request(options, function (error, response) {
      if (error){
        res.json(error)
      }else{
        res.json(JSON.parse(response.body))
        res.end()
      }
    });
    
}

app.post('/add', (req, res) => {
    data = JSON.parse(JSON.stringify(req.body))
    addRule(data.term,data.name,res)
})

app.post('/delete', (req, res) => {
    data = JSON.parse(JSON.stringify(req.body))
    deleteRule(data.term,res)
})

app.get('/getAll', (req, res) => {
    data = JSON.parse(JSON.stringify(req.body))
    getAllRules(res)
})

app.get('/start/:psswd', (req, res) => {
    if(req.params.psswd == psswd){
        if(streamStatus){
            res.end("Stream already Started")
        }else{
            stream = needle.get(streamURL, {
                headers: {
                    "User-Agent": "v2FilterStreamJS",
                    "Authorization": `Bearer ${token}`
                },
                timeout: 20000
            });
            stream.on('data', data => {
                try {
                    const json = JSON.parse(data);
                    // console.log(json);
                    obj={}
                    obj["tweetid"]=json["data"]["id"]
                    obj["data"]=json["data"]["text"]
                    obj["tag"]=json["matching_rules"][0]["tag"]
                    console.log(obj);
                    tweeter.create(obj, function (err, obj2) {
                        if (err)
                            console.log(err);
                        console.log(obj2)
                    });
                    // A successful connection resets retry count.
                    retryAttempt = 1;
                } catch (e) {
                    if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                        console.log(data.detail)
                        process.exit(1)
                    } else {
                        // Keep alive signal received. Do nothing.
                    }
                }
            }).on('err', error => {
                if (error.code !== 'ECONNRESET') {
                    console.log(error.code);
                    process.exit(1);
                } else {
                    console.log("AlertAdmin");
                }
            });
            streamStatus=true
            res.end("Stream started successfully")
        }
    }else{
        res.end("Unauthorised")
    }
})
app.get('/stop/:psswd', (req, res) => {
    if(req.params.psswd == psswd){
        if(streamStatus){
            stream.request.abort()
            streamStatus=false
            res.end("Stream stopped successfully")
        }else{
            res.end("Stream already Stopped")
        }
    }else{
        res.end("Unauthorised")
    }
})




app.listen(process.env.PORT||port, () => console.log(`Example app listening on port port!`))