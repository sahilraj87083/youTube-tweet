import { v2 as cloudinary } from 'cloudinary';

// configure cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : 'auto'
        });

        // file has been uploaded successfully
        //console.log("file is uploaded on cloudinary ", response.url);

        // Delete the temporary local file

        // WHY?
        
        // Because:

        // ✔ Multer (or your file uploader) saves the file temporarily on your server
        // ✔ After uploading to Cloudinary, you don’t need it anymore
        // ✔ Keeping local files bloats your server
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export {uploadOnCloudinary}