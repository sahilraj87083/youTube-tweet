import {Video} from '../models/video.models.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.models.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import mongoose, { isValidObjectId } from 'mongoose'

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





export {getAllVideos}