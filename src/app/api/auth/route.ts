import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const correctPassword = process.env.ADMIN_PASSWORD;

        if (password === correctPassword) {
            return NextResponse.json({ authorized: true });
        } else {
            return NextResponse.json({ authorized: false }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ authorized: false }, { status: 500 });
    }
}
