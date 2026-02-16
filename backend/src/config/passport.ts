import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { VerifyCallback } from 'passport-oauth2';
import dotenv from 'dotenv';
import { User } from '../models/User'; // Assuming User model path
import jwt from 'jsonwebtoken';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    scope: ['profile', 'email']
},
async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
            // Check if a user with this email already exists (e.g., registered with email/password)
            const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne({ where: { email } });
                if (user) {
                    // Link Google account to existing user
                    user.googleId = profile.id;
                    await user.save();
                }
            }
            
            if (!user) {
                // Create new user
                user = await User.create({
                    googleId: profile.id,
                    email: email,
                    name: profile.displayName,
                    // You might want to generate a random password or mark it as social login
                    // For simplicity, we'll leave password blank for social logins
                    passwordHash: '', 
                    role: 'user', // Default role
                    walletBalance: 0
                });
            }
        }

        done(null, user || undefined);

    } catch (error) {
        done(error as Error, undefined);
    }
}));

// Passport session setup (not strictly needed for JWT, but good practice for Passport)
type SerializeDone = (err: any, id?: number) => void;
type DeserializeDone = (err: any, user?: Express.User | false | null) => void;

passport.serializeUser((user: Express.User, done: SerializeDone) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: number, done: DeserializeDone) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error as Error, undefined);
    }
});

export default passport;
