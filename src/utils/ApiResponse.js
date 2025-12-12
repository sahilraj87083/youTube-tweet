class ApiResponse {
    constructor(errorCode, message = "Request successful", data) {
        this.errorCode = errorCode;
        this.message = message;
        this.data = data;
        this.success = errorCode < 400; // to indicate the success
    }
}

export { ApiResponse }