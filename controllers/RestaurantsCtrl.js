var cfenv = require('cfenv');
var express = require('express');
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var fs = require('fs');

var restaurantsModel = require('../models/restaurants');
var reportModel = require('../models/report');

exports.load = function (request, response){

	restaurantsModel
		.find({
			/* TODO: find all the restaurants.*/
		    // loc:{ 
		    //     $near : {
		    //         $geometry: { type: "Point",  coordinates: [ lon, lat ] },
		    //         $maxDistance: max // 5 miles
		    //     }
		    // }
		}).exec(function(err,restaurantsList){
			if(err){
				fs.appendFile('./consoleLog', 'GET: restaurant Data got failed!\r\n');
				response.send(err);
			}else{
				// console.log("There are", restaurantsList.length, "posts within", max, "miles of "+lon+", "+lat);
				
				var shortLists = [],
					item;
				for(var i = 0; i < restaurantsList.length; i ++){
					item = {};
					item["_id"] = restaurantsList[i]._id;
					item["type"] = "restaurants";
					if(restaurantsList[i].confirm == null){
						restaurantsList[i].confirm = 0;
					}
					item["attribute"] = {
						name : restaurantsList[i].name,
						waiting : parseInt(restaurantsList[i].waiting),
						confirm : restaurantsList[i].confirm,
						last_updated : restaurantsList[i].last_updated,
						loc : {
							type: "Point",
							coordinates: [
								restaurantsList[i].loc.coordinates[0], 
								restaurantsList[i].loc.coordinates[1]
							]
						}					
					};
					shortLists.push(item);
				}
				var responseJSON = {
					"status": 200,
					"data": shortLists
				}
				response.json(responseJSON);				
			}

		});
}

exports.details =  function (request, response) {
		restaurantsModel.findById(request.params.restaurantId, function(err, restaurantData) {
			if (err){
				fs.appendFile('./consoleLog', 'GET: restaurant Data got failed!\r\n');
				response.send(err);
			}else{
				var restaurantRes = {};

				restaurantRes["_id"] = restaurantData._id;
				restaurantRes["type"] = "restaurants";
				if(restaurantData.confirm == null){
					restaurantData.confirm = 0;
				}
				restaurantRes["attribute"] = {
					name : restaurantData.name,
					waiting : parseInt(restaurantData.waiting),
					confirm : restaurantData.confirm,
					last_updated : restaurantData.last_updated,
					loc : {
						type: "Point",
						coordinates: [
							restaurantData.loc.coordinates[0], 
							restaurantData.loc.coordinates[1]
						]
					},
					reports: []
				};

				// Add all the reports within 15 minutes.
				var creatTimeJudge = new Date();
				creatTimeJudge = creatTimeJudge.getTime();

				restaurantsModel
					.find({"_id": request.params.restaurantId}).populate('reports')
					.exec(function(err, restaurantData){
						for(var i = 0; i < restaurantData[0].reports.length; i ++){
							var lastUpdateJudge = restaurantData[0].reports[i]["last_updated"];

							if(creatTimeJudge - lastUpdateJudge < 9000000000000){
								if(restaurantData[0].reports[i].confirm == null){
									restaurantData[0].reports[i].confirm = 0;
								}
								restaurantData[0].reports[i].confirm = Math.floor((Math.random() * 15) + 1);
								var timeSubmitted = Math.floor((creatTimeJudge - lastUpdateJudge) / 1000 / 60);
								var newReport = JSON.parse(JSON.stringify(restaurantData[0].reports[i]));

								newReport.timeSubmitted = timeSubmitted;
								restaurantRes.attribute.reports.push(newReport);
							}
						}
						var responseJSON = {
							"status":200,
							"data":	restaurantRes
						};
						response.json(responseJSON);
						fs.appendFile('./consoleLog', 'GET: restaurant Data got Successfully!\r\n');		
					});
			}
		});
}

exports.reportTime = function (request, response) {
	var date = new Date();
	// var creatTime = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "Z";
	var creatTime = date.getTime();
	var reportData = new reportModel();
	var body = request.body;

	reportData.userId = body.userId;
	reportData.photoUrl = body.photoUrl;
	reportData.waiting = parseInt(body.waiting);
	reportData.creatAt = creatTime;
	reportData.last_updated = creatTime;
	reportData.confirm = null;
	reportData.restaurantId = request.params.restaurantId;
	console.log(body);

	// only push the report _id to the reports array of restaurants.
	restaurantsModel.findById(request.params.restaurantId, function(err, restaurantData) {
		if (err){
			response.send(err);
			fs.appendFile('./consoleLog', 'Restaurant Data Not Found!\r\n');
		}else{
			restaurantData.reports.push(reportData._id);
			restaurantData.waiting = parseInt(body.waiting);
			restaurantData.confirm = 0;
			restaurantData.last_updated = creatTime;

			restaurantData.save(function(err){
				if (err){
					response.send(err);
					fs.appendFile('./consoleLog', 'POST: Report attach failed!\r\n');
				}

				reportData.save(function(err){
					if (err){
						response.send(err);
						fs.appendFile('./consoleLog', 'POST: Report Save Failed!\r\n');
						return;
					}else{
						// if file is saved successfully, return the message and doc id.
						fs.appendFile('./consoleLog', 'POST: Report Saved Successfully!\r\n');
					}
				});	


				// if file is updated successfully, return the message and doc id.
				fs.appendFile('./consoleLog', 'POST: Report attached to the restaurant!\r\n');
				response.json({
					message: 'Report Saved Successfully! Report attached to the restaurant!', 
					reportId: reportData._id,
					restaurantId: request.params.restaurantId,
					data: {
						restaurantData: restaurantData
					}
				});
			});			
		}
	});
}

exports.confirm = function (request, response) {

	reportModel.find({"_id": request.params.reportId}).exec(function(err, reportData){
		if(err){
			response.send(err);
			fs.appendFile('./consoleLog', 'PUT: Restaurant Data Not Found!\r\n');
		}else{
			var body = request.body;
			var date = new Date();
			var creatTimeJudge = date.getTime();
			var lastUpdateJudge = reportData[0].last_updated;
			var oldUser = reportData[0].userId;
			var timePass = creatTimeJudge - lastUpdateJudge;
			if(oldUser != body.userId){
				if(timePass < 900000){// 15 min
					
					reportData[0].last_updated = creatTimeJudge;

					reportData[0].userId = body.userId;
					reportData[0].confirm += 1;
					reportData[0].save(function(err){
						if(err){
							response.send(err);
							fs.appendFile('./consoleLog', 'PUT: Report Updated Failed');
						}else{
							fs.appendFile('./consoleLog', 'PUT: Report Updated Successfully');
						}
					});
					response.json({
						message: 'Report Updated Successfully!', 
						data: {
							report: reportData[0]
						}
					});

				}else{
					response.json({
						message: 'Time out!',
						Time: timePass
					});
				}		
			}else{
				response.json({
					message: 'Duplicate Confirm of the same user!'
				});
			}
		}
	});
}
exports.reportDetail = function(request, response) {
	reportModel.find({"_id": request.params.reportId}).exec(function(err, reportData){
		if(err){
			response.send(err);
			fs.appendFile('./consoleLog', 'GET: Report Data Not Found!\r\n');
		}else{
			response.json(reportData[0]);
			fs.appendFile('./consoleLog', 'GET: Report Data Successfully!\r\n');
		}
	});
}
// exports.eraseReport = function(request, response){
// 	reportModel.remove({
// 		"_id": request.params.reportId
// 	}, function(err, reportData){
// 		if (err){
// 			response.send(err);		
// 		}else{
// 			collection.update(
// 				{ 
// 					_id: id 
// 				},
// 				{ 
// 					$pull: { 'contact.phone': { number: '+1786543589455' } } 
// 			});
// 		}
// 	});
// }

// exports.validateRequest = function (b) {
// 	console.log("Request body:", b);
// 	if(!b.name) {
// 		return "Missing 'name' attribute";
// 	} else if(!b.time) {
// 		return "Missing 'time' attribute";
// 	} else if(!b.loc) {
// 		return "Missing 'loc' attribute";
// 	} else if(b.loc && !b.loc.type) {
// 		return "Missing 'loc.type' attribute";
// 	} else if(b.loc && !b.loc.coordinates) {
// 		return "Missing 'loc.coordinates' attribute";
// 	}
// 	else return 0;
// }
