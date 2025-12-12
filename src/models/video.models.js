import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
    {
        videoFile : {
            type: String, // (cloudinary) URL 
            required: true,
        },
        thumbnail : {
            type: String, // (cloudinary) URL
            required: true,
        },
        title : {
            type: String,
            required: true,
        },
        description : {
            type: String,
            required: true,
        },
        duration : {
            type: Number,
            required: true,
        },
        views : {
            type: Number,
            default: 0,
        },
        isPublished : {
            type: Boolean,
            default: false,
        },
        owner : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // required: true,
        }
    }, { timestamps: true });




export const Video = mongoose.model("Video", videoSchema);