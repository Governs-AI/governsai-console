export const getPrecheckUserIdDetails = () => {    
    const url = process.env.PRECHECK_URL || ""
    const userId = url.split('/v1/u/')[1].split('/precheck')[0]  || "demo-user-123"

    const apiKey = process.env.PRECHECK_API_KEY || "GAI_LOCAL_DEV_ABC"

    return {
        userId,
        apiKey,
    }
}
