export const generateAttendanceToken = (code, clubCode) => {
    try {
        const data = {
            code: code,
            club: clubCode,
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(2, 15)
        };
        
        const jsonString = JSON.stringify(data);
        const base64 = btoa(unescape(encodeURIComponent(jsonString)));
        
        const obfuscated = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
            
        return obfuscated;
    } catch (error) {
        console.error('Token generation failed:', error);
        return null;
    }
};

export const decodeAttendanceToken = (token) => {
    try {
        const base64 = token
            .replace(/-/g, '+')
            .replace(/_/g, '/');
            
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const completeBase64 = base64 + padding;
        
        const jsonString = decodeURIComponent(escape(atob(completeBase64)));
        const data = JSON.parse(jsonString);
        
        return {
            code: data.code,
            club: data.club,
            isValid: true
        };
    } catch (error) {
        console.error('Token decode failed:', error);
        return {
            code: null,
            club: null,
            isValid: false,
            error: error.message
        };
    }
};

export const generateAttendanceUrl = (code, clubCode) => {
    const token = generateAttendanceToken(code, clubCode);
    if (!token) {
        return null;
    }
    
    return `https://hanssup.minecoby.com/attend/${token}`;
};