/*jshint node:true*/


var cfenv = require('cfenv');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var fs = require('fs');

var restaurantsModel = require('./models/restaurants');
var reportModel = require('./models/report');
var RestaurantsCtrl = require('./controllers/RestaurantsCtrl');

// get the app environment from Cloud Foundry
var app = express();
// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

var appEnv = cfenv.getAppEnv();


// connect to mongDB and test if the connection is successful.
var url = 'mongodb://test:1234@ds031223.mongolab.com:31223/crowdfood';
// connect to our database
mongoose.connect(url, function(err, res){
	if (err){
		console.log('ERROR connecting to mongoDB!', err);
		fs.appendFile('./consoleLog', 'ERROR connecting to mongoDB!\r\n');
	}else{
		console.log("Connected to mongolab.");
		fs.appendFile('./consoleLog', 'Connected to mongolab.\r\n');
	}
}); 
 //CORS middleware
var allowCrossDomain = function(request, response, next) {
	response.header('Access-Control-Allow-Origin', '*');
	response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	response.header('Access-Control-Allow-Headers', 'Content-Type');
	// intercept OPTIONS method for preflight request from chrome
	if ('OPTIONS' === request.method)  return response.sendStatus(200);
	else next();
};
app.use(allowCrossDomain); 

// configure app to use bodyParser()
// this will get the data from a POST for us.
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.set('json spaces', 2);
app.set('json replacer', null);

//ROUTE FOR OUR API
//get an instance of the express Router
var router = express.Router(); 
//middleware to use for all requests.
router.use(function(request, response, next) {
	console.log('API call is happening...');
	fs.appendFile('./consoleLog', 'API call is happening...\r\n');
	next();  // make sure we go to the next routes and don't stop here.
});

router.get('/', function(request, response){
	response.json({message: 'CrowFood API'});
});

// load all the restaurants within max miles in short report version.
router.route('/restaurants/short').get(RestaurantsCtrl.load);
router.route('/restaurants/:restaurantId').get(RestaurantsCtrl.details)
										  .post(RestaurantsCtrl.reportTime);
router.route('/report/confirm/:reportId').put(RestaurantsCtrl.confirm);
router.route('/report/:reportId').get(RestaurantsCtrl.reportDetail);
// router.route('/report/erase/:reportId').put(RestaurantsCtrl.eraseReport);

//REGISTER OUR routes
//all the routes will be prefixed with /api
app.use('/api', router);

//STAER THE SERVER 
fs.appendFile('./consoleLog', 'Crowdfood Begin now!\r\n');

// start server on the specified port and binding host
app.listen(appEnv.port, function() {

	// print a message when the server starts listening
  fs.appendFile('./consoleLog', 'Magic happens on http://' + appEnv.url + '\r\n');
});
