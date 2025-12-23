import mongoose, { isValidObjectId, set } from 'mongoose'
import Comment from '../models/comment.models.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {Video} from '../models/video.models.js'
import { Like } from '../models/like.models.js'


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

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params;
    const {content} = req.body;

    if(!content || typeof content !== 'string' || !content.trim()){
        throw new ApiError(400, 'Content is required')
    }

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, 'Video not Found')
    }

    const comment = await Comment.create({
        content : content,
        video : videoId,
        owner : req.user?._id
    })

    if(!comment){
        throw new ApiError(500, "Failed to add comment please try again");
    }

    // increase the comment count on the video
    await Video.findByIdAndUpdate(videoId,
        {
            $inc : {
                commentsCount : 1
            }
        }
    )

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
})


const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {content} = req.body
    const {commentId} = req.params

    if(!content || typeof content !== "string" || !content.trim()){
        throw new ApiError(400, 'Content is required')
    }

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, 'Invalid commentId')
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found");
    }

    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, 'You are not authorized to update the comment')
    }

    const updatedComment = await Comment.findByIdAndUpdate(comment?._id , 
        {
            $set : {
                content : content
            }
        },
        {
            new : true
        }
    )

    if(!updatedComment){
        throw new ApiError(500, 'Unable to update comment please try again later')
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, 'Comment updated Successfully'));
})


const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, 'Invalid CommentId')
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new ApiError(404, 'Comment not found')
    }

    if(comment.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, 'You are not allowed to delete the comment')
    }

    await Comment.findByIdAndDelete(commentId)

    // delete the likes 
    await Like.deleteMany({
        comment : commentId,
    })

    // decrease the comment count

    await Video.findByIdAndUpdate(comment.video,
        {
            $inc : {
                commentsCount : -1
            },
            $max : {
                commentsCount : 0
            }
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, { commentId }, "Comment deleted successfully")
        );
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}