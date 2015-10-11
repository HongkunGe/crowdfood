// public/models/restaurants.js

var mongoose = require('mongoose');
var report = require('./report.js');
var Schema = mongoose.Schema;

var restaurantsSchema = new Schema({
	loc: {
		type: { type: String },
		coordinates: [Number]
	},
	name: String,
	waiting: Number,
	last_updated: Number,
	confirm: Number,
	reports:[{type: Schema.Types.ObjectId, ref: 'reports'}]
});

module.exports = mongoose.model('all_restaurants', restaurantsSchema);
