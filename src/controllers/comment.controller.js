import mongoose, { isValidObjectId } from 'mongoose'
import Comment from '../models/comment.models.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asyncHandler.js'


const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query


    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort : {
                createdAt : -1
            }
        },
        {
            $lookup : {
                from : 'users',
                localField : 'owner',
                foreignField : '_id',
                as : 'owner',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            'avatar.url': 1
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from : 'likes',
                localField : '_id',
                foreignField : 'comment',
                as : 'likes'
            }
        },
        {
            $addFields : {
                likesCount : {
                    $size : '$likes'
                },
                owner : {
                    $first : '$owner'
                },
                isLiked : {
                    $in : [req.user?._id, '$likes.likedBy']
                }
            }
        },
        {
            $project : {
                content : 1,
                createdAt : 1,
                likesCount : 1,
                owner : {
                    username : 1,
                    fullName :1,
                    'avatar.url' : 1
                },
                isLiked : 1
            }
        }
    ]);

    const options  = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const comments = await Comment.aggregatePaginate(commentsAggregate,options)

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
})