import mongoose from "mongoose";


const userSchema = new mongoose.Schema(
    {
        username : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true,
            // minLength : 3,
            // maxLength : 30
        },
        email : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
        },
        fullName : {
            type : String,
            required : true,
            trim : true,
            index : true,
        },
        avatar : {
            type : String, // image url (use cloudinary or any other service)
            required : true,
        },
        coverImage : {
            type : String, // image url (use cloudinary or any other service)
        },
        watchHistory : {
            type : [
                {
                    type : mongoose.Schema.Types.ObjectId,
                    ref : "Video"
                }
            ]
        },
        password : {
            type : String,
            required : [true, "Password is required"],
        },
        refreshToken : {
            type : String,
            
        }
    }, {timestamps:true})


export const User = mongoose.model("User", userSchema);
