import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models";
import { Tweet } from "../models/tweet.models.js";
import { Video } from "../models/video.models.js";
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import mongoose, {isValidObjectId} from "mongoose";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, 'Invalid VideoId')
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const alreadyLiked = await Like.findOne({
        video : videoId,
        likedBy : req.user?._id
    });

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        // decrease the like count in the video
        await Video.findByIdAndUpdate(videoId,
            {
                $inc : {
                    likesCount : -1
                },
                $max : {
                    likesCount : 0
                }
            }
        )

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    
    const like = await Like.create({
        video : videoId,
        likedBy : req.user?._id
    })

    // increase the like count in the video
    await Video.findByIdAndUpdate(videoId, 
        {
            $inc : {
                likesCount : 1
            }
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true })); 

})


const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, 'Invalid commentId')
    }

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404, 'Comment not found')
    }

    const alreadyLiked = await Like.findOne({
        comment : commentId,
        likedBy : req.user?._id
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        comment : commentId,
        likedBy : req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, 'Invalid tweetId')
    }
    
    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, 'tweet not found')
    }

    const alreadyLiked = await Like.findOne({
        tweet : tweetId,
        likedBy : req.user?._id
    });


    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id)

        return res
                .status(200)
                .json(new ApiResponse(200, {tweetId, isLiked : false}))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {tweetId, isLiked: true }));

})


export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike
}