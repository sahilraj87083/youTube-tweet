class ApiError extends Error {

    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = "" // error stack trace which basically holds the info about where the error occurred
    ){
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.data = null; // additional data related to error
        this.success = false; // to indicate the failure
        this.message = message;


        if(stack){
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor); // captures the stack trace at the point where the error is instantiated
        }
    }
}

export {ApiError}