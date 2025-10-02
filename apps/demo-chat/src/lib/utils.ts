export const getPrecheckUserIdDetails = () => {    
    // Use the seeded user ID and API key from the fresh database
    const userId = process.env.DEMO_USER_ID || "cmg83v4lf00015q6aweq8i02j"
    const apiKey = process.env.PRECHECK_API_KEY || "gov_key_73a082a0cba066729f73a8240fff5ab80ab14afb90731c131a432163851eb36e"

    return {
        userId,
        apiKey,
    }
}
