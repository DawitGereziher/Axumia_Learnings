/**
 * BasePlugin — Abstract base class for all D-auth OAuth plugins.
 * Only callbackURL is required; different providers use different credential fields.
 */
class BasePlugin {
    constructor(options = {}) {
        if (!options.callbackURL) {
            throw new Error(`D-auth Plugin requires a "callbackURL" option`);
        }
        this.options = options;
    }

    /** @returns {string} Provider name slug e.g. 'google' */
    get name() { throw new Error('Plugin must implement the "name" getter'); }

    /** Register the Passport strategy */
    registerStrategy(passport) { throw new Error('Plugin must implement "registerStrategy"'); }

    /** Mount GET /provider and GET /provider/callback on the router */
    registerRoutes(router, passport, callbacks) { throw new Error('Plugin must implement "registerRoutes"'); }
}

module.exports = BasePlugin;
