import express, { urlencoded } from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import { LIMIT } from './constants.js';
const app = express()


// here we can add middlewares
// for example : cookie parser , cors , json parser etc

// cors middleware will allow us to handle cross origin requests 
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

// express.json middleware to parse json request body
app.use(express.json({ // for parsing application/json
    limit : LIMIT
}))


app.use(cookieParser())

app.use(urlencoded({ // for parsing application/x-www-form-urlencoded
    extended : true,
    limit : LIMIT
}))

app.use(express.static('public')) // for serving static files


export {app}