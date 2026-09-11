/**
 * BaseAdapter — Abstract interface every D-auth database adapter must implement.
 * Extend this class and implement all methods for your database of choice.
 */
class BaseAdapter {
    // ── Initialization ──────────────────────────────────────────────────────
    async init() { throw new Error('Adapter must implement "init"'); }

    // ── User CRUD ────────────────────────────────────────────────────────────
    async getUserByEmail(email) { throw new Error('Adapter must implement "getUserByEmail"'); }
    async getUserById(id)       { throw new Error('Adapter must implement "getUserById"'); }
    async createUser(profile)   { throw new Error('Adapter must implement "createUser"'); }
    async updateUser(id, fields){ throw new Error('Adapter must implement "updateUser"'); }

    // ── Password ─────────────────────────────────────────────────────────────
    async verifyPassword(user, password)      { throw new Error('Adapter must implement "verifyPassword"'); }
    async updatePassword(userId, newPassword) { throw new Error('Adapter must implement "updatePassword"'); }

    // ── OAuth Account Linking ────────────────────────────────────────────────
    async linkAccount(userId, provider, providerAccountId) { throw new Error('Adapter must implement "linkAccount"'); }
    async getUserByProvider(provider, providerAccountId)   { throw new Error('Adapter must implement "getUserByProvider"'); }

    // ── Refresh Tokens ───────────────────────────────────────────────────────
    async saveRefreshToken(userId, token, expiresAt) { throw new Error('Adapter must implement "saveRefreshToken"'); }
    async findRefreshToken(token)                    { throw new Error('Adapter must implement "findRefreshToken"'); }
    async deleteRefreshToken(token)                  { throw new Error('Adapter must implement "deleteRefreshToken"'); }
    async deleteAllUserRefreshTokens(userId)         { throw new Error('Adapter must implement "deleteAllUserRefreshTokens"'); }

    // ── Password Reset ───────────────────────────────────────────────────────
    async createPasswordResetToken(userId) { throw new Error('Adapter must implement "createPasswordResetToken"'); }
    async consumePasswordResetToken(token) { throw new Error('Adapter must implement "consumePasswordResetToken"'); }

    // ── Email Verification ───────────────────────────────────────────────────
    async createEmailVerification(userId)      { throw new Error('Adapter must implement "createEmailVerification"'); }
    async consumeEmailVerification(userId, code){ throw new Error('Adapter must implement "consumeEmailVerification"'); }
}

module.exports = BaseAdapter;
