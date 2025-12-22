import {Video} from '../models/video.models.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import mongoose, { isValidObjectId } from 'mongoose'
import { Like } from '../models/like.models.js'

const getAllVideos = asyncHandler( async (req, res) => {
    //TODO: get all videos based on query, sort, pagination

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    console.log(userId)

    const pipeline = []

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'

    if(query){
        pipeline.push({
            $search : {
                $index : 'search-videos',
                text : {
                    query : query,
                    path : ["title", "description"] //search only on title, desc
                }
            }
        })
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, 'Invalid userId')
        }

        pipeline.push({
            $match : {
                owner : new mongoose.Types.ObjectId(userId)
            }
        })
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({
        $match : {
            isPublished : true
        }
    })

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)

    if(sortBy && sortType){
        pipeline.push({
            $sort : {
                [sortBy] : sortType === 'asc' ? 1 : -1
            }
        });
    }else{
        pipeline.push({
            $sort : {
                createdAt : -1
            }
        })
    }


    pipeline.push(
        {
            $lookup : {
                from : 'users',
                localField : 'owner',
                foreignField: "_id",
                as : 'ownerDetails',
                pipeline : [
                    {
                        $project : {
                            username : 1,
                            'avatar.url' : 1
                        }
                    }
                ]
            }
        },
        {
            $unwind : '$ownerDetails'
        }
    )

    const videoAggregate = Video.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
     
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if([title, description].some((field) => !field || typeof field !== "string" || field?.trim() === '')){
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;


    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file is required");
    }

    if(!thumbnailLocalFilePath){
        throw new ApiError(400, "Thumbnail file is required");
    }

    // upload on cloudinary

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalFilePath);

    if (!videoFile || !thumbnailFile) {
        throw new ApiError(500, "Error uploading media to Cloudinary");
    }


    // create video object - create entry in db
    let video ;
    
    try {
        video = await Video.create({
            title,
            description,
            thumbnail : {
                url : thumbnailFile.url,
                public_id : thumbnailFile.public_id
            },
            videoFile : {
                url : videoFile.url,
                public_id : videoFile.public_id
            },
            duration : videoFile.duration,
            owner : req.user?._id,
            isPublished : false
        })
    } catch (error) {
        await deleteFromCloudinary(thumbnailFile.public_id)
        await deleteFromCloudinary(videoFile.public_id)
        throw error
    }

    // get the uploaded video from the database

    const uploadedVideo = await Video.findById(video._id)

    if(!uploadedVideo){
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, uploadedVideo, "Video uploaded successfully"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }


    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId),
                isPublished : true
            }
        },
        {
            $lookup : {
                from : 'users',
                localField : 'owner',
                foreignField : '_id',
                as : 'owner',
                pipeline : [
                    {
                        $lookup : {
                            from : 'subscriptions',
                            localField : '_id',
                            foreignField : 'channel',
                            as : 'subscribers'
                        }
                    },
                    {
                        $addFields : {
                            subscribersCount : {
                                $size : '$subscribers'
                            },
                            isSubscribed : {
                                $in : [req.user?._id, "$subscribers.subscriber"]
                            }
                        }
                    },
                    {
                        $project : {
                            username : 1,
                            'avatar.url' : 1,
                            subscribersCount : 1,
                            isSubscribed : 1

                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                owner : {
                    $first : '$owner'
                }
                
            }
        },
        {
            $project : {
                title : 1,
                description : 1,
                duration : 1,
                views : 1,
                isPublished : 1,
                'videoFile.url' : 1,
                createdAt : 1,
                owner : 1,
                likesCount : 1,
                commentsCount : 1
            }
        }
    ])

    if(!video.length){
        throw new ApiError(404, "Video not found");
    }
    
    // ✅ isLiked (cheap & indexed)
    const isLiked = await Like.exists({
        video: videoId,
        likedBy: req.user?._id
    });

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc : {
            views : 1
        }
    });

    // add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet : {
            watchHistory : videoId
        }
    });

    

    return res.status(200).json(
        new ApiResponse(
            200, 
            {
                ...video[0],
                isLiked: Boolean(isLiked)
            }, 
            "Video details fetched successfully")
    );
})


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // ownership check
    if (req.user._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "You are not allowed to edit this video");
    }

    let updatedFields = {
        title,
        description
    };

    let oldThumbnailPublicId = null;

    // thumbnail update (optional)
    if (req.file?.path) {
        const thumbnail = await uploadOnCloudinary(req.file.path);

        if (!thumbnail) {
            throw new ApiError(500, "Thumbnail upload failed");
        }

        oldThumbnailPublicId = video.thumbnail?.public_id;

        updatedFields.thumbnail = {
            public_id: thumbnail.public_id,
            url: thumbnail.url
        };
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updatedFields },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video");
    }

    // delete old thumbnail AFTER successful update
    if (oldThumbnailPublicId) {
        await deleteFromCloudinary(oldThumbnailPublicId);
    }

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "No video found");
    }

    if(req.user?._id.toString() !== video.owner.toString()){
        throw new ApiError(
            403,
            "You can't delete this video as you are not the owner"
        );
    }

    // delete the data on cloudinary
    await deleteFromCloudinary(video.videoFile?.public_id);
    await deleteFromCloudinary(video.thumbnail?.public_id);



    const videoDeleted = await Video.findByIdAndDelete(videoId)

    if (!videoDeleted) {
        throw new ApiError(500, "Failed to delete the video please try again");
    }


    // delete video likes
    await Like.deleteMany({
        video : videoId
    })

    // delete video comments
    await Comment.deleteMany({
        video : videoId
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
})


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(
            400,
            "You are not allowed to toggle publish status"
        );
    }
    const toggleVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video?.isPublished
            }
        },
        {
            new : true
        }
    )


    if(!toggleVideoPublish){
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            { isPublished: toggleVideoPublish.isPublished },
            "Video publish toggled successfully"
        )
    )
})


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus

}