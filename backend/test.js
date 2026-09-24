const dns = require('dns');
// Set public DNS servers to resolve MongoDB Atlas SRV records
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');

// Your MongoDB connection string with the password inserted
const uri = 'mongodb+srv://kenkeyz:thisismeken1@cluster0.3d892cn.mongodb.net/?appName=Cluster0';

mongoose.connect(uri)
  .then(() => {
    console.log('Connected successfully to MongoDB!');
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('Connection closed successfully.');
  })
  .catch((err) => {
    console.error('Connection error:', err);
  });