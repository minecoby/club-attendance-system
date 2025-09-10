class DataCache {
    constructor() {
        this.cachePrefix = 'cache_';
        this.timestampSuffix = '_timestamp';
    }

    setCache(key, data, ttl = 1000 * 60 * 5) {
        const cacheKey = this.cachePrefix + key;
        const timestampKey = cacheKey + this.timestampSuffix;
        const timestamp = Date.now();
        
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(timestampKey, timestamp.toString());
    }

    getCache(key, ttl = 1000 * 60 * 5) {
        const cacheKey = this.cachePrefix + key;
        const timestampKey = cacheKey + this.timestampSuffix;
        
        const cachedData = localStorage.getItem(cacheKey);
        const timestamp = localStorage.getItem(timestampKey);
        
        if (!cachedData || !timestamp) {
            return null;
        }

        const now = Date.now();
        const cacheTime = parseInt(timestamp);
        
        if (now - cacheTime > ttl) {
            this.clearCache(key);
            return null;
        }

        try {
            return JSON.parse(cachedData);
        } catch (error) {
            console.error('Cache parse error:', error);
            this.clearCache(key);
            return null;
        }
    }

    clearCache(key) {
        const cacheKey = this.cachePrefix + key;
        const timestampKey = cacheKey + this.timestampSuffix;
        
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
    }

    isDataEqual(oldData, newData) {
        return JSON.stringify(oldData) === JSON.stringify(newData);
    }

    async loadDataWithCache(key, fetchFunction, setState, ttl = 1000 * 60 * 5) {
        const cachedData = this.getCache(key, ttl);
        
        if (cachedData) {
            setState(cachedData);
        }

        try {
            const freshData = await fetchFunction();
            
            if (!cachedData || !this.isDataEqual(cachedData, freshData)) {
                this.setCache(key, freshData, ttl);
                setState(freshData);
            }
        } catch (error) {
            if (!cachedData) {
                throw error;
            }
            console.error('Failed to fetch fresh data, using cache:', error);
        }
    }
}

export default new DataCache();