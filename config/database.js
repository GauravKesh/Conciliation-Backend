const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
const logger = require("../logger");
const dot = require("dotenv").config();

let dbConnection;

// MongoDB URI  ANOTHER METHODS

// const uri = `mongodb+srv://${process.env.ACCESS_ID}:${process.env.ACCESS_KEY}@cluster0.ribtrjl.mongodb.net/${process.env.ACCESS_COLLECTION}?retryWrites=true&w=majority`;

const uri = process.env.API_URI; // url to connect with database

// Connecting remotely
const connectToDo = (cb) => {
  MongoClient.connect(uri)
    .then((client) => {
      dbConnection = client.db();
      logger.info("Connected to MongoDB online");
      cb(null); // Pass null for the error parameter to indicate successful connection
    })
    .catch((err) => {
      logger.error("Error connecting to MongoDB:", err);
      cb(err); // Pass the error to the callback function
    });
};

const getDb = () => dbConnection;

// // Mongoose connection
mongoose
  .connect(uri)
  .then(() => logger.info("Mongoose connected to MongoDB"))
  .catch((err) => logger.error("Mongoose connection error:", err));

module.exports = { connectToDo, getDb };
