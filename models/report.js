// public/models/bear.js

var mongoose = require('mongoose');
var report = require('./restaurants.js');
var Schema = mongoose.Schema;

var reportSchema = new Schema({
	userId: String,
	waiting: Number,
	confirm: Number,
	photoUrl: String,
	creatAt: Number,
	last_updated: Number,
	restaurantId: {type: Schema.Types.ObjectId, ref: 'all_restaurants'}

});

module.exports = mongoose.model('reports', reportSchema);