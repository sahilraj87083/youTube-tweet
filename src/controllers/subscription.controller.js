import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, 'Invalid ChannelId');
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }
    if (req.user._id.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself")
    }


    const isSubscribed = await Subscription.findOne({
        subscriber : req.user?._id,
        channel : channelId
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { subscribed: false },
                    "Unsubscribed successfully"
                )
            );
    }

    await Subscription.create({
        subscriber : req.user?._id,
        channel : channelId
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { subscribed: true },
                "subscribed successfully"
            )
        );
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, 'Invalid ChannelId');
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const subscribers = await Subscription.aggregate([
        // 1. Match subscriptions for this channel
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        // 2. Lookup subscriber user details
        {
            $lookup : {
                from : 'users',
                localField : 'subscriber',
                foreignField : '_id',
                as : 'subscriberDetails',
                pipeline : [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        // 3. Convert subscriberDetails array → object
        {
            $addFields : {
                subscriber : {
                    $first : "$subscriberDetails"
                }
            }
        },
        // 4. Optional: check if channel owner subscribed back
        {
            $lookup : {
                from : 'subscriptions',
                let : {subscriberId : "$subscriber._id"},
                pipeline : [
                    {
                        $match : {
                            $expr : {
                                $and : [
                                    { $eq : ['$subscriber', new mongoose.Types.ObjectId(channelId)] },
                                    { $eq: ["$channel", "$$subscriberId"] }
                                ]
                            }
                        }
                    }
                ],
                as: "subscribedBack"
            }
        },
        // 6. Boolean flag
        {
            $addFields: {
                isSubscribedBack: { $gt: [{ $size: "$subscribedBack" }, 0] }
            }
        },
        // 6. Sort latest subscribers first
        {
            $sort: { createdAt: -1 }
        },
        // 7. Remove unused subscriberDetails array
        {
             $unset: ["subscriberDetails", "subscribedBack"]
        },
        // 8. Final response shape
        {
            $project: {
                _id: "$subscriber._id",
                username: "$subscriber.username",
                fullName: "$subscriber.fullName",
                avatar_url: "$subscriber.avatar.url",
                isSubscribedBack: 1,
                subscribedAt: "$createdAt"
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers,
                "subscribers fetched successfully"
            )
        );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    // 1. Validate subscriberId format
    // Prevents MongoDB CastErrors and bad requests
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, 'Invalid subscriberId');
    }

     // 2. Ensure subscriber actually exists
    // Avoids querying subscriptions for a non-existing user
    const subscriber = await User.findById(subscriberId)
    if (!subscriber) {
        throw new ApiError(404, "Subscriber not found")
    }

    // 3. Aggregation pipeline to fetch subscribed channels
    const subscribedChannels = await Subscription.aggregate([
        // ────────────────────────────────────────────────
        // STAGE 1: Match subscriptions made by this user
        // Purpose:
        // "Which channels has this user subscribed to?"
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        // ────────────────────────────────────────────────
        // STAGE 2: Lookup channel (user) details
        // Purpose:
        // Replace channel ObjectId with full user profile
        {
            $lookup : {
                from : 'users',
                localField : 'channel',
                foreignField : '_id',
                as : 'subscribedChannel',

                // Nested pipeline to fetch channel metadata
                pipeline : [
                    // ─────────────────────────────────────────
                    // SUB-STAGE 2.1: Lookup latest published video
                    // Purpose:
                    // Fetch ONLY the most recent published video
                    {
                        $lookup : {
                            from : 'videos',
                            let : { channelId: "$_id" },
                            pipeline : [
                                {
                                    // Match videos owned by channel AND published
                                    $match : {
                                        $expr : {
                                            $and : [
                                                { $eq : ['$owner' , '$$channelId'] },
                                                { $eq: ["$isPublished", true] }
                                            ]
                                        }
                                    }
                                },
                                // Sort newest first
                                {
                                    $sort: { createdAt: -1 }
                                },
                                // Limit to ONLY latest video
                                {
                                    $limit: 1 // ONLY latest video
                                },
                                // Keep only fields needed by frontend
                                {
                                    $project : {
                                        "videoFile.url" : 1,
                                        "thumbnail.url" : 1,
                                        title : 1,
                                        description : 1,
                                        duration : 1,
                                        views : 1,
                                        likesCount : 1,
                                        commentsCount : 1,
                                        createdAt: 1
                                    }
                                }
                            ],
                            as : 'latestVideo'
                        }
                    },
                    // ─────────────────────────────────────────
                    // SUB-STAGE 2.2: Convert latestVideo array → object
                    // Purpose:
                    // $lookup always returns arrays
                    // Frontend expects an object
                    {
                        $addFields: {
                            latestVideo: { $first: "$latestVideo" }
                        }
                    },
                    // ─────────────────────────────────────────
                    // SUB-STAGE 2.3: Shape channel response
                    // Purpose:
                    // Send only public-facing channel info
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            "avatar.url": 1,
                            latestVideo: 1
                        }
                    }
                ]
            }
        },
        // ────────────────────────────────────────────────
        // STAGE 3: Unwind subscribedChannel array
        // Purpose:
        // Convert:
        // subscribedChannel: [ {...} ]
        // → subscribedChannel: { ... }
        { 
            $unwind: "$subscribedChannel" 
        },
        // ────────────────────────────────────────────────
        // STAGE 4: Final response shape
        // Purpose:
        // Remove unnecessary fields and return clean payload
        {
            $project: {
                _id: 0,
                subscribedChannel: 1
            }
        }

    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "subscribed channels fetched successfully"
            )
        );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}