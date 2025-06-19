import { NextRequest, NextResponse } from "next/server";

// In a real application, you would hash passwords and store them securely
// This is just for demonstration
const VALID_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'password'
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (username === VALID_CREDENTIALS.username && 
            password === VALID_CREDENTIALS.password) {
            
            const response = NextResponse.json({ success: true });
            
            // Set secure cookie
            response.cookies.set('auth_session', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/'
            });

            return response;
        }

        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
