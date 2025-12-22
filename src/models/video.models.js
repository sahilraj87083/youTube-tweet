import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new mongoose.Schema(
    {
        videoFile : {
            type : {
                url : String, // (cloudinary) URL 
                public_id : String,
            },
            required: true
        },
        thumbnail : {
            type : {
                url : String, // (cloudinary) URL 
                public_id : String,
            },
            required: true
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
        },
        likesCount: {
            type: Number,
            default: 0
        },
        commentsCount: {
            type: Number,
            default: 0
        }
    }, { timestamps: true });


videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);