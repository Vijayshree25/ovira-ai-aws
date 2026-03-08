import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DEMO_DOCTORS } from '@/lib/constants/doctors';
import { UserProfile } from '@/types';

const dynamoClient = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

const sesClient = new SESClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function POST(request: NextRequest) {
    try {
        const { appointmentId } = await request.json();

        if (!appointmentId) {
            return NextResponse.json({ success: false, error: 'Appointment ID is required' }, { status: 400 });
        }

        const appointmentsTable = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';
        const usersTable = process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users';

        // 1. Fetch Appointment
        const appointmentRes = await docClient.send(new GetCommand({
            TableName: appointmentsTable,
            Key: { id: appointmentId }
        }));

        if (!appointmentRes.Item) {
            return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
        }

        const appointment = appointmentRes.Item;

        if (!appointment.summaryGenerated) {
            return NextResponse.json({ success: false, error: 'Summary not generated yet' }, { status: 400 });
        }

        const userId = appointment.userId;
        const doctorId = appointment.doctorId;
        const doctor = DEMO_DOCTORS.find(d => d.doctorId === doctorId);

        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Doctor details not found' }, { status: 404 });
        }

        // 2. Fetch User Profile
        const profileRes = await docClient.send(new ScanCommand({
            TableName: usersTable,
            FilterExpression: 'id = :id OR uid = :uid OR email = :email',
            ExpressionAttributeValues: {
                ':id': userId,
                ':uid': userId,
                ':email': userId,
            },
            Limit: 1,
        }));
        const profile = (profileRes.Items?.[0] || {}) as UserProfile;
        const patientName = profile.displayName || profile.email || 'Our Patient';

        // 3. Build HTML Email
        const summarySections = appointment.summaryContent.split('\n\n');
        const formattedSummary = summarySections.map((section: string) => {
            const [title, ...content] = section.split('\n');
            if (content.length === 0) return `<p style="margin-bottom: 15px; color: #4A5568;">${section}</p>`;
            return `
                <div style="margin-bottom: 25px; border-left: 4px solid #7C3AED; padding-left: 15px;">
                    <h3 style="color: #7C3AED; margin: 0 0 10px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em;">${title.replace(/^\d+\.\s*/, '')}</h3>
                    <p style="margin: 0; color: #4A5568; line-height: 1.6; font-size: 14px;">${content.join('<br>')}</p>
                </div>
            `;
        }).join('');

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F7FAFC;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <div style="background-color: #7C3AED; padding: 30px; text-align: center; color: #ffffff;">
                        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Ovira AI — Patient Pre-Appointment Health Summary</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${patientName} — ${appointment.date} at ${appointment.time}</p>
                        <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 12px;">${doctor.hospital}</p>
                    </div>

                    <!-- Info Box -->
                    <div style="background-color: #EDF2F7; padding: 20px 30px; border-bottom: 1px solid #E2E8F0;">
                        <p style="margin: 0; font-size: 12px; color: #4A5568; line-height: 1.5;">
                            <strong>Notice for Healthcare Provider:</strong><br>
                            This health summary was shared by your patient via the Ovira AI app. 
                            The patient has explicitly consented to share this information with you. 
                            All data is self-reported through the app. <strong>This is not a medical assessment.</strong>
                        </p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 30px;">
                        ${formattedSummary}
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #F8FAFC; padding: 20px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                        <p style="margin: 0; color: #A0AEC0; font-size: 11px;">
                            Generated by Ovira AI  |  <a href="https://www.ovira.ai" style="color: #7C3AED; text-decoration: none;">www.ovira.ai</a>
                        </p>
                        <p style="margin: 5px 0 0 0; color: #CBD5E0; font-size: 10px;">
                            Self-reported patient data. For reference only. Verify with patient directly.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // 4. Send via SES
        const fromEmail = process.env.SES_FROM_EMAIL || 'hello@ovira.ai';
        const toEmail = process.env.SES_DEMO_DOCTOR_EMAIL || fromEmail;

        const sendCommand = new SendEmailCommand({
            Source: fromEmail,
            Destination: {
                ToAddresses: [toEmail],
            },
            Message: {
                Subject: {
                    Data: `Pre-Appointment Health Summary — ${patientName} — ${appointment.date} ${appointment.time}`,
                },
                Body: {
                    Html: {
                        Data: emailHtml,
                    },
                    Text: {
                        Data: `Patient: ${patientName}\nDate: ${appointment.date}\nTime: ${appointment.time}\nHospital: ${doctor.hospital}\n\nSummary Content:\n${appointment.summaryContent}\n\nThis is not a medical assessment. Generated by Ovira AI.`,
                    },
                },
            },
        });

        await sesClient.send(sendCommand);

        // 5. Update Appointment
        await docClient.send(new UpdateCommand({
            TableName: appointmentsTable,
            Key: { id: appointmentId },
            UpdateExpression: 'SET summarySent = :s, summarySentAt = :t',
            ExpressionAttributeValues: {
                ':s': true,
                ':t': new Date().toISOString(),
            },
        }));

        return NextResponse.json({ success: true, message: `Sent to Dr. ${doctor.name.split(' ')[1] || doctor.name}` });
    } catch (error: any) {
        console.error('Send summary API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send summary', details: error.message }, { status: 500 });
    }
}
