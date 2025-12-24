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
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}