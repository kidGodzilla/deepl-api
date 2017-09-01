#!/usr/bin/env nodejs
var bodyParser = require('body-parser');
var express = require('express');
var request = require('request');
var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Options middleware
app.use(function (req, res, next) {
	if (req.method === 'OPTIONS') {
		var headers = {};
		headers["Access-Control-Allow-Origin"] = "*";
		headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Credentials"] = true;
		headers["Access-Control-Max-Age"] = '86400'; // 24 hours
		headers["Access-Control-Allow-Headers"] = "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With,X-HTTP-Method-Override";
		res.writeHead(204, headers);
		res.end();
	} else {
		next();
	}
});

// Rest of CORS
app.use(require('cors')());

var obj = {
	"jsonrpc":"2.0",
	"method":"LMT_handle_jobs",
	"params":{
		"jobs":[],
		"lang":{
			"target_lang":"EN"
		}
	}
};

function stringToBeams (s) {
	if (!s) return;

	var sentences = s.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
	return sentences;
}

function createRequest(s, iso) {
	var o2 = Object.assign({}, obj);
	o2.params.jobs = [];
	o2.params.lang.target_lang = iso.toUpperCase();

	var key = `raw_${ iso.toLowerCase() }_sentence`;
	var beams = s;

	if (typeof s == 'string')
		beams = stringToBeams(s);

	beams.forEach((beam) => {
		var o3 = {
			"kind":"default",
		};

		o3[key] = beam;
		o2.params.jobs.push(o3);
	});

	return o2;
}

function processRequest (o) {
	var out = "";

	if (o && o.result && o.result.translations)
		o.result.translations.forEach((translation) => {
			if (translation && translation.beams && translation.beams[0] && translation.beams[0].postprocessed_sentence)
				out += translation.beams[0].postprocessed_sentence + " ";
		});

	return out.trim();
}

app.post('/', function (req, res) {
	var body = req.body;
	var text = body.text;
	var targetLanguage = body.iso || 'en';

	if (!text) return res.send('Nothing to Translate.');

	var o = createRequest(text, targetLanguage);

	request.post({
		headers: {'content-type' : 'application/json'},
		url:     'https://www.deepl.com/jsonrpc',
		body:    JSON.stringify(o)
	}, function (error, response, body) {
		// console.log(body);

		try {
			body = JSON.parse(body);
		} catch(e){}

		res.send(processRequest(body));
	});
});


// Serve our public directory (For testing)
app.use('/', express.static('public'));

app.listen(3001, function () {
	console.log('App listening on port 3001!')
});
