import { asyncHandler } from "../utils/asyncHandler.js";
import {Video} from '../models/video.models.js'
import {Like} from '../models/like.models.js'
import {Subscription} from '../models/subscription.models.js'
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import mongoose from "mongoose";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // get the user id which is also a user id (a channel is also a user)
    const userId = req.user._id;


    // get total subscriber
    const totalSubscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $count : "totalSubscribers"
        }
    ])

    

    const videoStats = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField: '_id',
                foreignField : 'video',
                as : 'likes'
            }
        },
        {
            $project : {
                totalLikes : {
                    $size : '$likes'
                },
                totalViews : '$views'
            }
        },
        {
            $group : {
                _id : null,
                totalLikes : {
                    $sum : '$totalLikes'
                },
                totalViews : {
                    $sum : '$totalViews'
                },
                totalVideos : {
                    $sum : 1
                }
            }
        }
        
    ])

    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.totalSubscribers || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalVideos: videoStats[0]?.totalVideos || 0
    };

    

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channelStats,
            "channel stats fetched successfully"
        )
    );

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelId = req.user?._id

    const videoDetails = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField : '_id',
                foreignField : 'video',
                as : 'likes'
            }
        },
        {
            $lookup : {
                from : 'comments',
                localField : '_id',
                foreignField : 'video',
                as : 'comments'
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentCount: { $size: "$comments" }
            }
        },
        {
            $sort: { createdAt: -1 } // sort while still a Date
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" }
                }
            }
        },
        {
            $project : {
                _id : 1,
                videoFile : 1,
                thumbnail : 1,
                description : 1,
                title : 1,
                isPublished : 1,
                likesCount : 1,
                commentCount : 1,
                createdAt : {
                    year : 1,
                    month : 1,
                    day : 1
                }
            }
        }
    ])


    return res
    .status(200)
    .json( new ApiResponse(
        200,
        videoDetails,
        "channel videos fetched successfully"
    ))
})


export {
    getChannelStats,
    getChannelVideos
}