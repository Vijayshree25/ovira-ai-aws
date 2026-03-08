import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, getUserSymptomLogs, getUserHealthReports, getChatHistory } from '@/lib/aws/dynamodb';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'UserId is required' }, { status: 400 });
    }

    try {
        const [profile, logs, reports] = await Promise.all([
            getUserProfile(userId),
            getUserSymptomLogs(userId, 1000),
            getUserHealthReports(userId, 100)
        ]);

        const exportData = {
            profile,
            symptomLogs: logs,
            healthReports: reports,
            exportedAt: new Date().toISOString(),
            appVersion: '1.0.0-prototype'
        };

        // For PDF, we'd normally use a library like puppeteer or a service.
        // For this hackathon, we'll return a structured JSON that could be rendered as PDF
        // or a simple placeholder message if the user expects a file download.

        return NextResponse.json({
            success: true,
            message: 'PDF Export data generated. In a production environment, this would return a binary PDF file.',
            data: exportData
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
