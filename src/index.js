import mongoose from "mongoose";
import dotenv from 'dotenv'
dotenv.config({path : './.env'})
import connectDB from './db/index.js'
import {app} from './app.js'


const PORT = process.env.PORT || 8000;

// handle error 
app.on('error' , (err) => {
    console.log("SERVER ERROR:", err);
    process.exit(1); // graceful shutdown the server
})

connectDB()
.then(() => {
    app.listen(PORT , () => {
        console.log(`App is listening on port ${PORT}`);
    })
})
.catch((error) => {
    console.log(`DATABASE CONNECTION FAILED ${error}`)
})




/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("SERVER ERROR: ", error);
            process.exit(1);
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()

*/